#!/usr/bin/env node
/**
 * ui-standard-constraint — 前端 UI 规则自查脚本（零依赖，Node >= 18）
 *
 * 用法:
 *   node check-ui-rules.mjs                       # 自动定位 ./frontend 或 --root
 *   node check-ui-rules.mjs --root frontend/src   # 指定目录/文件
 *   node check-ui-rules.mjs --changed             # 只查 git 改动文件（含未跟踪）
 *   node check-ui-rules.mjs --strict              # warning 也算失败
 *   node check-ui-rules.mjs --only R001,R003      # 只跑指定规则（并强制启用）
 *   node check-ui-rules.mjs --json                # 机器可读输出
 *   node check-ui-rules.mjs --write-baseline .ui-baseline.json
 *   node check-ui-rules.mjs --baseline .ui-baseline.json   # 只报新增违规
 *   node check-ui-rules.mjs --list-rules
 *
 * 退出码: 0 通过 / 1 有违规 / 2 参数或内部错误
 * 阈值:   assets/rules.config.json（或 --severity R003=warn）
 * 例外:   // ui-allow R003: 理由     // ui-allow-file R005: 理由
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/* 管道被提前关闭（| head、| grep -m1、less 退出）时不抛 EPIPE 堆栈 */
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (err) => {
    if (err && err.code === 'EPIPE') process.exit(0);
    throw err;
  });
}

/* ------------------------------------------------------------------ 规则表 */

const RULE_META = {
  R001: ['error', '禁止蓝紫配色 / 蓝紫暗色模式'],
  R002: ['error', '禁止 Claude 风格（米白底 + 暖橙 accent + serif 标题）'],
  R003: ['error', '圆角过大（卡片/容器 ≤ 8px，任意元素 ≤ 16px）'],
  R004: ['warn', '无目的嵌套边框 / 卡片'],
  R005: ['error', '阴影过重或彩色阴影'],
  R006: ['error', '数据列表内容换行'],
  R007: ['info', '描述性文本元素（细则待补，默认关闭）'],
  R008: ['warn', '响应式缺失 / 移动端溢出风险'],
  R009: ['error', '文件过大或职责未拆分'],
  SUP: ['warn', '抑制注释缺少理由'],
};

const DEFAULT_CONFIG = {
  hueBluePurple: [220, 320],
  minSatBluePurple: 25,
  maxCardRadiusPx: 8,
  maxAnyRadiusPx: 16,
  shadowWarnBlurPx: 8,
  maxShadowBlurPx: 16,
  creamHue: [30, 70],
  warmAccentHue: [15, 40],
  maxFileLines: 400,
  warnFileLines: 250,
  maxUseState: 8,
  tableLongTextChars: 60,
  longTextChars: 120,
  maxFixedWidthPx: 360,
  warnSingleSignal: false,
  enable: [],
  disable: ['R007'],
  severity: {},
};

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.vite',
  '.cache', 'test-results', 'playwright-report', 'release', 'vendor', '__snapshots__',
  '.idea', '.vscode', 'public',
]);
const CODE_EXT = new Set(['.tsx', '.jsx', '.ts', '.js', '.vue', '.css', '.scss', '.html']);

/* ------------------------------------------------------------------ 工具函数 */

function fatal(msg) {
  process.stderr.write(`check-ui-rules: ${msg}\n`);
  process.exit(2);
}

function loadConfig() {
  let file = {};
  try {
    const p = new URL('../assets/rules.config.json', import.meta.url);
    if (existsSync(p)) file = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    process.stderr.write(`check-ui-rules: 读取 rules.config.json 失败，使用内置默认值 (${e.message})\n`);
  }
  return {
    ...DEFAULT_CONFIG,
    ...file,
    severity: { ...DEFAULT_CONFIG.severity, ...(file.severity || {}) },
    enable: [...(file.enable || [])],
    disable: [...(file.disable || DEFAULT_CONFIG.disable)],
  };
}

function rgbToHsl(r255, g255, b255) {
  const r = r255 / 255, g = g255 / 255, b = b255 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let hue = 0, sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: Math.round(hue), s: Math.round(sat * 100), l: Math.round(l * 100) };
}

function hexToHsl(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return rgbToHsl(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/** 逐层解析阴影长度值：返回 [offsetX, offsetY, blur, spread]（先剥离颜色函数） */
function shadowLengths(layer) {
  const clean = String(layer)
    .replace(/(?:rgba?|hsla?)\([^)]*\)/g, ' ')
    .replace(/\binset\b/g, ' ');
  return clean
    .split(/[\s,]+/)
    .map((v) => parseFloat(v))
    .filter((n) => Number.isFinite(n));
}

/** 解析 `hsl(224.3 76.3% 48%)` / `224.3 76.3% 48%` 形式，其它返回 null */
function parseHsl(value) {
  const m = String(value).match(/([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/);
  if (!m) return null;
  return { h: Math.round(parseFloat(m[1])) % 360, s: Math.round(parseFloat(m[2])), l: Math.round(parseFloat(m[3])) };
}

function inBand(v, band) { return v >= band[0] && v <= band[1]; }

/** 从任意 CSS 值里找出颜色（hex / hsl 三元组），返回 [{h,s,l,raw}] */
function colorsIn(value) {
  const out = [];
  for (const m of String(value).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const hsl = hexToHsl(m[0].slice(0, 7));
    if (hsl) out.push({ ...hsl, raw: m[0] });
  }
  for (const m of String(value).matchAll(/hsl\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/g)) {
    out.push({ h: Math.round(parseFloat(m[1])) % 360, s: Math.round(parseFloat(m[2])), l: Math.round(parseFloat(m[3])), raw: m[0] });
  }
  for (const m of String(value).matchAll(/(^|[;\s,:])([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) {
    out.push({ h: Math.round(parseFloat(m[2])) % 360, s: Math.round(parseFloat(m[3])), l: Math.round(parseFloat(m[4])), raw: m[0].trim() });
  }
  for (const m of String(value).matchAll(/rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/g)) {
    const hsl = rgbToHsl(Number(m[1]), Number(m[2]), Number(m[3]));
    if (hsl) out.push({ ...hsl, raw: m[0] });
  }
  return out;
}

function radiusToPx(v) {
  const s = String(v).trim();
  const num = parseFloat(s);
  if (!isFinite(num)) return null;
  if (/rem\b/.test(s)) return num * 16;
  if (/em\b/.test(s)) return num * 16;
  if (/px\b/.test(s)) return num;
  return null;
}

const RADIUS_CLASS_PX = { sm: 4, '': 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32 };

function splitTop(str, sep) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function lineCountOf(text) { return text.split('\n').length; }

/* ------------------------------------------------------- CSS 作用域块解析 */

function extractBlocks(text) {
  const blocks = [];
  const stack = [];
  let buf = '', line = 1, bodyStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') line++;
    if (ch === '{') {
      const block = {
        prelude: buf.trim(),
        startLine: line,
        bodyStart: i + 1,
        body: '',
        ancestors: stack.map((s) => s.prelude),
      };
      stack.push(block);
      buf = '';
    } else if (ch === '}') {
      const b = stack.pop();
      if (b) blocks.push(b);
      buf = '';
    } else {
      if (stack.length) stack[stack.length - 1].body += ch;
      buf += ch;
    }
  }
  return blocks;
}

function lineFromIndex(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') n++;
  return n;
}

/* ------------------------------------------------------------------ 参数解析 */

const VALUE_FLAGS = new Set(['root', 'only', 'disable', 'enable', 'baseline', 'write-baseline', 'max-per-rule', 'severity']);

function parseArgs(argv) {
  const o = { paths: [], maxPerRule: 25, disable: [], enable: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o.paths.push(a); continue; }
    let key = a.slice(2), val = null;
    const eq = key.indexOf('=');
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    if (VALUE_FLAGS.has(key) && val === null) {
      val = argv[++i];
      if (val === undefined) fatal(`--${key} 缺少取值`);
    }
    switch (key) {
      case 'root': o.root = val; break;
      case 'only': o.only = val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean); break;
      case 'disable': o.disable.push(...val.split(',').map((s) => s.trim().toUpperCase())); break;
      case 'enable': o.enable.push(...val.split(',').map((s) => s.trim().toUpperCase())); break;
      case 'baseline': o.baseline = val; break;
      case 'write-baseline': o.writeBaseline = val; break;
      case 'max-per-rule': o.maxPerRule = Math.max(1, Number(val) || 25); break;
      case 'severity': {
        o.severity = o.severity || {};
        for (const pair of val.split(',')) {
          const [r, s] = pair.split('=').map((x) => x.trim());
          if (r && s) o.severity[r.toUpperCase()] = s.toLowerCase();
        }
        break;
      }
      case 'json': o.json = true; break;
      case 'strict': o.strict = true; break;
      case 'changed': o.changed = true; break;
      case 'quiet': o.quiet = true; break;
      case 'include-ui-primitives': o.includeUi = true; break;
      case 'include-tests': o.includeTests = true; break;
      case 'no-color': o.noColor = true; break;
      case 'list-rules': o.listRules = true; break;
      case 'help': case 'h': o.help = true; break;
      default: fatal(`未知参数 --${key}（--help 查看用法）`);
    }
  }
  return o;
}

/* ------------------------------------------------------------------ 收集文件 */

function walk(dir, out, includeUi, includeTests) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (!includeUi && e.name === 'ui' && basename(dir) === 'components') continue;
      walk(p, out, includeUi);
    } else if (e.isFile()) {
      const ext = extname(e.name);
      if (!CODE_EXT.has(ext)) continue;
      if (/\.d\.ts$/.test(e.name) || /\.min\.(js|css)$/.test(e.name)) continue;
      if (!includeTests && /\.(?:test|spec)\.[tj]sx?$/.test(e.name)) continue;
      out.push(p);
    }
  }
  return out;
}

function resolveRoots(o) {
  if (o.root) return [resolve(o.root)];
  if (o.paths.length) return o.paths.map((p) => resolve(p));
  const cwd = process.cwd();
  if (basename(cwd) === 'frontend') return [cwd];
  const f = join(cwd, 'frontend');
  if (existsSync(f)) return [f];
  return [cwd];
}

function gitChanged(cwd) {
  try {
    const root = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const tracked = execFileSync('git', ['-C', root, 'diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
    const untracked = execFileSync('git', ['-C', root, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
    const set = new Set(
      [...tracked.split('\n'), ...untracked.split('\n')]
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => resolve(root, p)),
    );
    return { root, set };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ 主检查器 */

function createChecker(cfg, o) {
  const findings = [];
  const suppressed = [];

  const enabled = (rule) => {
    if (o.only && !o.only.includes(rule)) return false;
    if (cfg.disable.includes(rule)) return false;
    if (rule === 'R007' && !cfg.enable.includes('R007') && !(o.only || []).includes('R007')) return false;
    return true;
  };
  const sevOf = (rule) => (cfg.severity[rule] || RULE_META[rule]?.[0] || 'warn').toLowerCase();

  function analyze(abs) {
    let text;
    try { text = readFileSync(abs, 'utf8'); } catch { return; }
    const rel = (() => {
      const r = relative(process.cwd(), abs);
      return r.startsWith('..') ? abs : r;
    })();
    const lines = text.split('\n');
    const ext = extname(abs);
    const isCss = ext === '.css' || ext === '.scss';
    const isJsx = ext === '.tsx' || ext === '.jsx' || ext === '.vue' || ext === '.js' || ext === '.ts';

    /* 抑制注释 */
    const fileRules = new Set();
    const lineRules = new Map();
    lines.forEach((line, idx) => {
      const mFile = line.match(/ui-allow-file\b([^\n]*)/);
      if (mFile) {
        const ids = mFile[1].match(/R\d{3}/g) || ['ALL'];
        ids.forEach((id) => fileRules.add(id));
        checkReason(mFile[1], idx + 1);
      }
      const m = line.match(/ui-allow(?!-file)\b([^\n]*)/);
      if (m) {
        const ids = m[1].match(/R\d{3}/g) || ['ALL'];
        checkReason(m[1], idx + 1);
        for (const target of [idx + 1, idx + 2]) {
          if (!lineRules.has(target)) lineRules.set(target, new Set());
          ids.forEach((id) => lineRules.get(target).add(id));
        }
      }
    });

    function checkReason(tail, line) {
      const hasReason = /[:：]\s*\S|--\s*\S/.test(tail.replace(/R\d{3}/g, ''));
      if (!hasReason && enabled('SUP')) {
        findings.push({ rule: 'SUP', severity: sevOf('SUP'), file: rel, line, message: '抑制注释缺少理由，需写成 `ui-allow R00X: 理由`', snippet: lines[line - 1]?.trim().slice(0, 120) || '' });
      }
    }

    const allowed = (rule, line) => {
      if (fileRules.has('ALL') || fileRules.has(rule)) return true;
      const s = lineRules.get(line);
      return !!s && (s.has('ALL') || s.has(rule));
    };

    function report(rule, line, message, snippet, forceSev) {
      if (!enabled(rule)) return;
      if (allowed(rule, line)) { suppressed.push({ rule, file: rel, line }); return; }
      findings.push({
        rule,
        severity: forceSev || sevOf(rule),
        file: rel,
        line,
        message,
        snippet: String(snippet || lines[line - 1] || '').trim().slice(0, 120),
      });
    }

    if (isCss) checkCss({ text, lines, rel, report });
    if (isJsx || ext === '.html') checkJsx({ text, lines, rel, report, isJsx });
    checkFileLevel({ text, lines, rel, ext, isCss, report });
  }

  /* ---------------------------------------------------------- CSS 检查 */

  function checkCss({ text, lines, rel, report }) {
    const blocks = extractBlocks(text);
    let creamHit = null, warmHit = null;

    for (const block of blocks) {
      const scopes = [block.prelude, ...block.ancestors];
      const isDark = scopes.some((s) => /(^|[^-\w])dark\b|prefers-color-scheme\s*:\s*dark/i.test(s));
      const isTheme = scopes.some((s) => /data-theme\s*=/i.test(s));
      const isContainer = /\.(card|panel|modal|dialog|sheet|surface|popover|container|block|well|tile)\b/i.test(block.prelude);

      /* 声明级检查 */
      for (const dm of block.body.matchAll(/([\w-]+)\s*:\s*([^;{}]+)(;|$)/g)) {
        const prop = dm[1].toLowerCase();
        const value = dm[2].trim();
        const line = lineFromIndex(text, block.bodyStart + dm.index);

        /* R001 蓝紫 */
        if ((isDark || isTheme) && /^--(background|card|popover|primary|accent|secondary|ring|border|sidebar-)/.test(prop)) {
          for (const c of colorsIn(value)) {
            if (inBand(c.h, cfg.hueBluePurple) && c.s >= cfg.minSatBluePurple && (c.l <= 55 || c.s >= 45)) {
              report('R001', line, `${isDark ? '暗色' : '主题'} token \`${prop}: ${value}\` 落在蓝紫色相带（h=${c.h}, s=${c.s}%），暗色底/强调色改用中性灰 + emerald/teal/rose`, `  ${prop}: ${value};`);
            }
          }
        }

        /* R002 Claude 风格 token */
        if (!isDark && !isTheme) {
          if (/^--(background|card|popover)$/.test(prop)) {
            for (const c of colorsIn(value)) {
              if (inBand(c.h, cfg.creamHue) && c.s >= 8 && c.s <= 45 && c.l >= 92) { creamHit = { line, prop, value, c }; }
            }
          }
          if (/^--(primary|accent|ring)$/.test(prop)) {
            for (const c of colorsIn(value)) {
              if (inBand(c.h, cfg.warmAccentHue) && c.s >= 45 && c.s <= 80 && c.l >= 40 && c.l <= 70) { warmHit = { line, prop, value, c }; }
            }
          }
        }

        /* R003 圆角 */
        if (/^--.*radius.*$/.test(prop) || prop === 'border-radius') {
          const isCardish = /radius.*(card|panel|surface|block|dialog|sheet)|^--radius$/.test(prop) || isContainer;
          const limit = isCardish ? cfg.maxCardRadiusPx : cfg.maxAnyRadiusPx;
          for (const part of splitTop(value, ' ')) {
            const px = radiusToPx(part);
            if (px === null || px <= limit) continue;
            if (/999|9999|50%/.test(part)) continue;
            report('R003', line, `${prop}: ${value} → ${Math.round(px)}px 超过${isCardish ? '卡片' : '元素'}上限 ${limit}px`, `  ${prop}: ${value};`);
          }
        }

        /* R005 阴影 */
        if (/^(box-shadow|-webkit-box-shadow)$/.test(prop)) {
          if (/^\s*none\b|var\(--(shadow|ring)/.test(value)) continue;
          let maxBlur = 0, colored = null;
          for (const layer of splitTop(value, ',')) {
            const nums = shadowLengths(layer);
            const blur = nums.length >= 3 ? nums[2] : 0;
            if (blur > maxBlur) maxBlur = blur;
            for (const c of colorsIn(layer)) if (c.s >= 25) colored = c;
          }
          if (maxBlur >= cfg.maxShadowBlurPx) report('R005', line, `box-shadow 模糊 ${Math.round(maxBlur)}px ≥ ${cfg.maxShadowBlurPx}px，卡片默认不用阴影，浮层用一档小阴影`, `  box-shadow: ${value};`);
          else if (colored) report('R005', line, `彩色 box-shadow（h=${colored.h}, s=${colored.s}%），改用中性色或边框分层`, `  box-shadow: ${value};`);
          else if (maxBlur >= cfg.shadowWarnBlurPx) report('R005', line, `box-shadow 模糊 ${Math.round(maxBlur)}px 偏重，确认只用于浮层`, `  box-shadow: ${value};`);
        }
      }
    }

    if (creamHit && warmHit) {
      report('R002', warmHit.line, `同时命中「米白/奶油底」与「暖橙 accent」→ Claude 风格配色组合`, `  ${warmHit.prop}: ${warmHit.value};`);
    }
  }

  /* ---------------------------------------------------- JS/JSX 行级检查 */

  const BLUE_PURPLE_SURFACE = /(?<![\w-])(?:bg|border|ring|from|to|via|fill|stroke|divide|outline|decoration|shadow|accent|caret|placeholder|selection)-(?:indigo|violet|purple|fuchsia)(?:-\d{2,3})?(?:\/\d+)?/g;
  const BLUE_PURPLE_TEXT = /(?<![\w-])text-(?:indigo|violet|purple|fuchsia)(?:-\d{2,3})?(?:\/\d+)?/g;
  const DARK_BLUE = /\bdark:(?:[\w[\]#/.:%-]*[\s"'`])?(?:bg|text|border|ring|from|to|via)-(?:blue|sky|cyan)-\d{2,3}\b/;
  const CREAM_CLASS = /(?<![\w-])(?:bg|from|to|via)-(?:stone-(?:50|100)|amber-(?:50|100)|orange-(?:50|100))\b/;
  const CREAM_HEX = /#(?:faf9f5|f5f4ef|fffbf5|f7f5f0|fdfcf8|faf8f5)\b/i;
  const WARM_ACCENT_CLASS = /(?<![\w-])(?:bg|text|border|ring|from|to)-(?:orange|amber)-(?:500|600|700)\b/;
  const WARM_ACCENT_HEX = /#(?:d97757|c96442|da7756|e07a5f|cc785c|d9776b)\b/i;
  const SERIF = /font-serif\b|font-family\s*:\s*[^;"'}]*\b(?:georgia|times new roman|playfair|lora|merriweather|tiemos|tiempos|garamond)\b/i;
  const WRAP_UTIL = /(?<![\w-])(?:whitespace-normal|whitespace-pre-wrap|break-words|break-all|line-clamp-\d+|flex-wrap)(?![\w-])/;
  const SHADOW_HEAVY = /(?<![\w-])shadow-(?:lg|xl|2xl)(?![\w-])/;
  const SHADOW_ARB = /(?<![\w-])shadow-\[([^\]]+)\]/g;
  const SHADOW_COLORED = /(?<![\w-])shadow-(?!sm(?![\w-])|md(?![\w-])|lg(?![\w-])|xl(?![\w-])|2xl(?![\w-])|inner(?![\w-])|none(?![\w-])|\[)([a-z]+)-(\d{2,3})(?:\/\d+)?/g;
  const DROP_SHADOW_HEAVY = /(?<![\w-])drop-shadow-(?:lg|xl|2xl)(?![\w-])/;
  const SHADOW_MD = /(?<![\w-])shadow-md(?![\w-])/;

  function checkJsx({ text, lines, rel, report, isJsx }) {
    /* 表格区域 */
    const inTable = new Array(lines.length + 2).fill(false);
    {
      const openRe = /<(\/?)Table\b/g;
      let depth = 0, start = 0, m;
      while ((m = openRe.exec(text))) {
        const line = lineFromIndex(text, m.index);
        if (m[1] !== '/') { if (depth === 0) start = line; depth++; }
        else { depth = Math.max(0, depth - 1); if (depth === 0) for (let l = start; l <= line; l++) inTable[l] = true; }
      }
      lines.forEach((l, i) => {
        if (/<(?:TableCell|TableHead|TableRow|TableFooter|TableCaption|td|th|tr)\b/.test(l)) inTable[i + 1] = true;
      });
    }

    /* R002：Claude 风格是组合特征，按文件级判定 */
    const R002_NAMES = { cream: '米白/奶油底', warm: '暖橙 accent', serif: 'serif 标题' };
    const r002 = { cream: [], warm: [], serif: [] };
    lines.forEach((l, i) => {
      if (CREAM_CLASS.test(l) || CREAM_HEX.test(l)) r002.cream.push(i + 1);
      if (WARM_ACCENT_CLASS.test(l) || WARM_ACCENT_HEX.test(l)) r002.warm.push(i + 1);
      if (SERIF.test(l)) r002.serif.push(i + 1);
    });
    const r002Hits = Object.entries(r002).filter(([, v]) => v.length > 0);
    const r002Combo = r002Hits.length >= 2;
    if (r002Combo) {
      const first = Math.min(...r002Hits.map(([, v]) => v[0]));
      report('R002', first, `命中 Claude 风格组合：${r002Hits.map(([k]) => R002_NAMES[k]).join(' + ')}`, lines[first - 1]);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ln = i + 1;

      /* R001 —— 蓝紫表面是硬禁；文字/图标配色与暗色蓝底给 warning 复核 */
      for (const m of line.matchAll(BLUE_PURPLE_SURFACE)) {
        report('R001', ln, `蓝紫配色 \`${m[0]}\` 被禁用；改用中性灰 + emerald/teal/rose`, line);
      }
      for (const m of line.matchAll(BLUE_PURPLE_TEXT)) {
        report('R001', ln, `蓝紫文字/图标色 \`${m[0]}\`；确认是必要的分类色，主题与品牌色不得用蓝紫`, line, 'warn');
      }
      const dm = line.match(DARK_BLUE);
      if (dm) {
        report('R001', ln, `暗色下的蓝色底/字 \`${dm[0]}\`；状态色可保留，主题底不得用蓝`, line, 'warn');
      }

      /* R002 —— 单信号（组合已在文件级报出；单信号默认不报，避免 amber 语义色刷屏） */
      if (!r002Combo && cfg.warnSingleSignal) {
        const sig = [];
        if (CREAM_CLASS.test(line) || CREAM_HEX.test(line)) sig.push('米白/奶油底');
        if (WARM_ACCENT_CLASS.test(line) || WARM_ACCENT_HEX.test(line)) sig.push('暖橙 accent');
        if (SERIF.test(line)) sig.push('serif 标题');
        if (sig.length === 1) {
          report('R002', ln, `疑似 Claude 风格元素（${sig[0]}），确认不是「米白底 + 暖橙 + serif」组合的一半`, line, 'warn');
        }
      }

      /* R003 圆角 */
      for (const m of line.matchAll(/(?<![\w-])rounded(?:-(sm|md|lg|xl|2xl|3xl|4xl|none|full))?(?:-\[([^\]]+)\])?(?![\w-])/g)) {
        const token = m[0];
        if (/rounded-(?:none|full)\b/.test(token)) continue;
        const named = m[1];
        let px = null;
        if (m[2] !== undefined) px = radiusToPx(m[2]);
        else if (named && named in RADIUS_CLASS_PX) px = RADIUS_CLASS_PX[named];
        if (px === null) continue;
        const containerish = /Card|Panel|DialogContent|SheetContent|PopoverContent|surface|card|panel|dialog|modal|sheet|container|Section/.test(line);
        if (containerish && px > cfg.maxCardRadiusPx) {
          report('R003', ln, `容器/卡片用了 \`${token}\`（约 ${px}px），卡片圆角上限 ${cfg.maxCardRadiusPx}px（rounded-md/lg）`, line);
        } else if (px >= 16) {
          report('R003', ln, `\`${token}\`（约 ${px}px）圆角过大，非容器元素也不应超过 ${cfg.maxAnyRadiusPx}px`, line);
        } else if (px >= 12) {
          report('R003', ln, `\`${token}\`（约 ${px}px）偏大，除非是胶囊/头像，否则用 rounded-md/lg`, line, 'warn');
        }
      }

      /* R005 阴影 */
      if (SHADOW_HEAVY.test(line)) report('R005', ln, `重阴影 \`${line.match(SHADOW_HEAVY)[0]}\`，卡片用边框分层，最多 shadow-sm`, line);
      if (DROP_SHADOW_HEAVY.test(line)) report('R005', ln, `重投影 \`${line.match(DROP_SHADOW_HEAVY)[0]}\`，改用 border`, line);
      for (const m of line.matchAll(SHADOW_ARB)) {
        const nums = [...m[1].matchAll(/(-?[\d.]+)px/g)].map((x) => parseFloat(x[1]));
        const blur = nums.length >= 3 ? nums[2] : (nums[1] || 0);
        if (blur >= cfg.maxShadowBlurPx) report('R005', ln, `自定义阴影模糊 ${blur}px ≥ ${cfg.maxShadowBlurPx}px`, line);
      }
      for (const m of line.matchAll(SHADOW_COLORED)) {
        report('R005', ln, `彩色阴影 \`${m[0]}\`，改用中性阴影或边框`, line);
      }
      if (SHADOW_MD.test(line)) report('R005', ln, `\`shadow-md\` 偏重，card 默认无阴影，仅浮层可用 shadow-sm`, line);

      /* R006 数据列表换行 */
      if (inTable[ln] && WRAP_UTIL.test(line)) {
        report('R006', ln, `表格/列表行内出现 \`${line.match(WRAP_UTIL)[0]}\`，数据行必须单行（truncate + whitespace-nowrap）`, line);
      }
      if (inTable[ln]) {
        const pm = line.match(/<p[^>]*>\s*([^<]{20,})/);
        if (pm && pm[1].trim().length >= cfg.tableLongTextChars) {
          report('R006', ln, `单元格内 ${pm[1].trim().length} 字长文本会撑高行高，改用 truncate + title`, line);
        }
      }

      /* R007 描述性文本（默认关闭，细则待补） */
      if (enabled('R007')) {
        const pm = line.match(/<(?:p|span|div)[^>]*className="[^"]*text-muted-foreground[^"]*"[^>]*>\s*([^<{]{40,})/);
        if (pm && pm[1].trim().length >= cfg.longTextChars) {
          report('R007', ln, `疑似描述性长文本（${pm[1].trim().length} 字），界面用标签/状态表达而非说明文字`, line);
        }
      }

      /* R008 响应式 */
      {
        const grids = [...line.matchAll(/(?:(sm|md|lg|xl|2xl):)?grid-cols-(\d+)/g)];
        const hasPrefixed = grids.some((g) => g[1]);
        for (const g of grids) {
          if (g[1]) continue;
          if (Number(g[2]) >= 3 && !hasPrefixed) {
            report('R008', ln, `\`grid-cols-${g[2]}\` 无断点前缀，移动端会挤成 ${g[2]} 列；先写 grid-cols-1 再加 sm:/lg:`, line);
          }
        }
        for (const g of line.matchAll(/(?:(sm|md|lg|xl|2xl):)?(min-)?w-\[(\d+)px\]/g)) {
          const px = Number(g[3]);
          if (g[1] || px <= cfg.maxFixedWidthPx) continue;
          if (/overflow-x-auto|<Table\b|min-w-\[720px\]/.test(line)) continue;
          report('R008', ln, `固定宽度 \`${g[0]}\`（${px}px）超 ${cfg.maxFixedWidthPx}px 且无断点前缀，移动端会横向溢出；改 w-full max-w-[${px}px]`, line);
        }
      }
    }

    /* R004 嵌套表面（JSX 深度扫描） */
    if (isJsx) checkNestedSurfaces({ text, rel, report });

    /* R009 数据访问与视图混写 */
    const pathExempt = /\/(?:lib|api|services|hooks|store|stores)\//.test(rel);
    const isHtml = /\.html$/.test(rel);
    const hasJsx = /<\/[A-Za-z]|<>/.test(text);
    const hasData = /(?<![\w.])(?:fetch|axios\.\w+|localStorage\.|sessionStorage\.)/.test(text);
    if (!pathExempt && !isHtml && hasJsx && hasData) {
      const m = text.match(/(?<![\w.])(?:fetch|axios\.\w+|localStorage\.|sessionStorage\.)/);
      report('R009', lineFromIndex(text, m.index), '组件内直接做数据访问（fetch/axios/storage），应下沉到同 feature 的 `api.ts` 或 `hooks/`', m[0]);
    }

    /* R009 useState 过多 */
    const useStateCount = (text.match(/\buseState\s*[(<]/g) || []).length;
    if (useStateCount > cfg.maxUseState) {
      report('R009', 1, `单文件 ${useStateCount} 个 useState（> ${cfg.maxUseState}），拆子组件或用 useReducer`, `useState x${useStateCount}`, 'warn');
    }
  }

  const SUSPECT_INNER = /^(?:div|section|article|aside|main|header|footer|form|Card|CardContent|CardHeader|Panel|Surface|Box|Well|Tile)$/;
  const EXEMPT_TAGS = new Set([
    'Dialog', 'AlertDialog', 'DialogContent', 'DialogHeader', 'DialogFooter', 'Sheet', 'SheetContent',
    'Drawer', 'DrawerContent', 'Popover', 'PopoverContent', 'DropdownMenu', 'DropdownMenuContent',
    'DropdownMenuSubContent', 'Select', 'SelectContent', 'ContextMenu', 'ContextMenuContent', 'Command',
    'CommandDialog', 'Table', 'Tooltip', 'TooltipContent', 'HoverCard', 'HoverCardContent', 'Input',
    'Textarea', 'Switch', 'Checkbox', 'RadioGroup', 'Slider', 'Progress', 'TabsList', 'TabsTrigger',
    'ScrollArea', 'Separator', 'Alert', 'Badge', 'Button', 'Toggle', 'Sonner', 'Toaster', 'Sidebar',
    'SidebarContent', 'SidebarInset', 'AspectRatio', 'Avatar', 'Calendar', 'Accordion', 'AccordionItem',
    'Collapsible', 'CollapsibleContent', 'Menubar', 'MenubarContent', 'NavigationMenu',
    'NavigationMenuContent', 'ResizablePanel', 'TableContainer', 'Kbd', 'Pre', 'Code',
  ]);

  function fullBorder(attrs) {
    return /(?:^|[\s"'`])border(?:[\s"'`]|$)/.test(attrs) && !/border-(?:0|transparent)\b/.test(attrs);
  }
  function hasSurfaceBg(attrs) {
    return /(?:^|[\s"'`])bg-(?:card|background|popover|muted|accent|secondary|white|black)(?:[\s"'`/]|$)|bg-\[/.test(attrs);
  }

  function checkNestedSurfaces({ text, rel, report }) {
    const TAG_RE = /<(\/?)([A-Za-z][\w.]*)((?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}|[^<>{}])*)(\/?)>/g;
    const stack = [];
    let depth = 0, hits = 0, m;
    while ((m = TAG_RE.exec(text))) {
      const closing = m[1] === '/';
      const tag = m[2];
      const attrs = m[3] || '';
      const selfClosing = m[4] === '/' || /\/\s*$/.test(attrs);
      const line = lineFromIndex(text, m.index);
      if (closing) { depth = Math.max(0, depth - 1); stack.pop(); continue; }
      const isSurface = /^(?:Card|Panel|Surface)$/.test(tag) || (fullBorder(attrs) && hasSurfaceBg(attrs));
      if (isSurface) {
        const parent = stack[stack.length - 1];
        if (parent && parent.isSurface && SUSPECT_INNER.test(tag) && !EXEMPT_TAGS.has(tag) && hits < 3) {
          hits++;
          report('R004', line, `嵌套表面：<${tag}> 作为带边框容器出现在 <${parent.tag}>（第 ${parent.line} 行）内部；改用间距或 Separator 分组`, text.split('\n')[line - 1]);
        }
      }
      if (!selfClosing) { stack.push({ tag, depth, isSurface, line }); depth++; }
    }
  }

  /* ------------------------------------------------- 文件级结构检查 R009 */

  function checkFileLevel({ text, lines, rel, ext, isCss, report }) {
    if (isCss) return;
    if (ext !== '.html') {
      const n = lineCountOf(text);
      if (n > cfg.maxFileLines) {
        report('R009', 1, `文件 ${n} 行 > ${cfg.maxFileLines} 行，按页面/组件/hook/api/类型拆分（见 references/05-code-structure.md）`, `${rel} (${n} lines)`);
      } else if (n > cfg.warnFileLines && /\.(tsx|jsx|vue)$/.test(ext)) {
        report('R009', 1, `文件 ${n} 行 > ${cfg.warnFileLines} 行，考虑拆分子组件`, `${rel} (${n} lines)`, 'warn');
      }
      const defaults = (text.match(/export\s+default\b/g) || []).length;
      if (defaults > 1) report('R009', 1, `一个文件有 ${defaults} 个 export default，应一个文件一个主导出`, `${rel}`);
    }
    if (/package\s+main\b|func\s+main\s*\(/.test(text)) {
      report('R009', 1, '前端目录内出现 Go 入口代码，前后端必须分仓/分目录编写', rel);
    }
    const beImport = text.match(/from\s+['"][^'"]*(?:\/|^)backend\/[^'"]*['"]/);
    if (beImport) report('R009', 1, `前端 import 了后端路径 ${beImport[0]}，接口须走 HTTP 客户端`, beImport[0]);
  }

  return { findings, suppressed, analyze };
}

/* ------------------------------------------------------------------ 输出 */

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    process.stdout.write(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
    return;
  }
  const cfg = loadConfig();
  if (o.disable.length) cfg.disable = [...new Set([...cfg.disable, ...o.disable])];
  if (o.enable.length) cfg.enable = [...new Set([...cfg.enable, ...o.enable])];
  if (o.only) cfg.enable = [...new Set([...cfg.enable, ...o.only])];
  cfg.disable = cfg.disable.filter((r) => !cfg.enable.includes(r));
  if (o.severity) Object.assign(cfg.severity, o.severity);

  if (o.listRules) {
    for (const [id, [sev, title]] of Object.entries(RULE_META)) {
      const state = cfg.disable.includes(id) ? '（默认关闭）' : '';
      process.stdout.write(`${id}  ${sev.padEnd(5)} ${title}${state}\n`);
    }
    return;
  }

  const useColor = !o.noColor && !o.json && !process.env.NO_COLOR && process.stdout.isTTY;
  const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
  const SEV_PAINT = { error: (s) => paint('31;1', s), warn: (s) => paint('33;1', s), info: (s) => paint('36', s) };

  const roots = resolveRoots(o);
  let changed = null;
  if (o.changed) {
    changed = gitChanged(process.cwd());
    if (!changed) process.stderr.write('check-ui-rules: 非 git 仓库或 git 不可用，--changed 退化为全量扫描\n');
  }

  let files = [];
  for (const r of roots) {
    if (!existsSync(r)) fatal(`路径不存在: ${r}`);
    const st = statSync(r);
    if (st.isFile()) files.push(r);
    else walk(r, files, o.includeUi, o.includeTests);
  }
  if (changed) {
    files = files.filter((f) => changed.set.has(f) || f.endsWith('.css') || f.endsWith('.scss'));
  }
  files = [...new Set(files)].sort();

  const checker = createChecker(cfg, o);
  for (const f of files) {
    try { checker.analyze(f); } catch (e) {
      process.stderr.write(`check-ui-rules: 解析失败 ${f}: ${e.message}\n`);
    }
  }

  /* 按规则限流，避免存量项目刷屏 */
  const perRule = new Map();
  const kept = [];
  let truncated = 0;
  for (const f of checker.findings) {
    const n = (perRule.get(f.rule) || 0) + 1;
    perRule.set(f.rule, n);
    if (n > o.maxPerRule) { truncated++; continue; }
    kept.push(f);
  }

  /* 基线过滤 */
  let baselineSuppressed = 0;
  const hashOf = (f) => createHash('sha1').update(`${f.rule}|${f.file}|${f.snippet.replace(/\s+/g, ' ')}`).digest('hex');
  if (o.baseline && existsSync(o.baseline)) {
    const base = new Set(JSON.parse(readFileSync(o.baseline, 'utf8')).findings || []);
    const filtered = [];
    for (const f of kept) { if (base.has(hashOf(f))) baselineSuppressed++; else filtered.push(f); }
    kept.length = 0;
    kept.push(...filtered);
  }
  if (o.writeBaseline) {
    const all = checker.findings.map(hashOf);
    writeFileSync(o.writeBaseline, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), findings: [...new Set(all)] }, null, 2));
    process.stderr.write(`check-ui-rules: 基线已写入 ${o.writeBaseline}（${all.length} 条）\n`);
  }

  const counts = { error: 0, warn: 0, info: 0 };
  for (const f of kept) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const ok = counts.error === 0 && (!o.strict || counts.warn === 0);

  if (o.json) {
    process.stdout.write(JSON.stringify({
      ok, filesScanned: files.length, counts, truncated,
      suppressedByComment: checker.suppressed.length, suppressedByBaseline: baselineSuppressed,
      findings: kept,
    }, null, 2) + '\n');
  } else {
    const byFile = new Map();
    for (const f of kept) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    for (const [file, list] of byFile) {
      process.stdout.write(`\n${paint('1', file)}\n`);
      for (const f of list.sort((a, b) => a.line - b.line)) {
        const tag = SEV_PAINT[f.severity] ? SEV_PAINT[f.severity](f.severity.toUpperCase().padEnd(5)) : f.severity;
        process.stdout.write(`  ${String(f.line).padStart(4)}  ${tag} ${f.rule}  ${f.message}\n`);
        if (f.snippet && !o.quiet) process.stdout.write(`        ${paint('90', f.snippet)}\n`);
      }
    }
    process.stdout.write('\n' + paint('1', '── ui-standard-constraint ──') + '\n');
    process.stdout.write(`扫描文件 ${files.length} 个 | error ${counts.error} | warning ${counts.warn} | info ${counts.info || 0}`);
    if (truncated) process.stdout.write(` | 每规则截断 ${truncated} 条（--max-per-rule 调整）`);
    if (checker.suppressed.length) process.stdout.write(` | 注释抑制 ${checker.suppressed.length} 条`);
    if (baselineSuppressed) process.stdout.write(` | 基线忽略 ${baselineSuppressed} 条`);
    process.stdout.write('\n');
    process.stdout.write(ok
      ? paint('32;1', '✅ 通过\n')
      : paint('31;1', `❌ 未通过：${counts.error} 个 error${o.strict && counts.warn ? ` + ${counts.warn} 个 warning（--strict）` : ''}\n`));
  }

  process.exit(ok ? 0 : 1);
}

main();
