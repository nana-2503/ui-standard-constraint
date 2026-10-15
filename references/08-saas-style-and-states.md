# 08 现代 SaaS 风格、状态完备与 Token 纪律

对应**规则 13**（不写死颜色，脚本 R011）、**规则 14**（状态完备与可访问性，人工核对）。

## 一、风格取向：Linear / Vercel 那一类

这类界面的共同点是**用留白和字重做层级**，而不是用边框和阴影堆层级。落到具体做法：

| 维度 | 做法 |
|---|---|
| 留白 | 页面 `p-6` / `lg:p-8`，区块间距 `gap-6` / `gap-8`；宁可多留白，不要多描边 |
| 边框 | 只用一层、且**降一档对比**：`border border-border/60`（或 `zinc-200/80`、暗色 `zinc-800/80`） |
| 阴影 | 卡片无阴影或仅 `shadow-sm`；浮层 `shadow-md` 封顶（详见 R005） |
| 文字层级 | `text-zinc-900` → `text-zinc-500` 逐级弱化，靠**颜色深浅 + 字重**，不靠字号暴涨 |
| 强调色 | 只用于主操作、当前项、关键状态，**一屏一种**；其余用中性色 |
| 密度 | 表格/列表用紧凑行高 + 分隔线，不要每行一张卡 |

```tsx
// ✗ 边框+阴影+大圆角+彩色，信息层级全靠装饰
<div className="rounded-2xl border-2 border-indigo-200 bg-white p-4 shadow-lg">

// ✓ 中性底 + 一层淡边框 + 留白
<div className="rounded-lg border border-border/60 bg-card p-6">
```

### 动效克制

- 只用于**状态变化**（展开/收起、进出场、加载），不做入场动画堆叠、不做装饰性位移。
- 时长 120–200ms，缓动 `ease-out`；位移 ≤ 4px，缩放 ≤ 0.98。
- 必须尊重 `prefers-reduced-motion`：`motion-safe:` 前缀或 `@media (prefers-reduced-motion: reduce)` 关闭。
- 用 Motion（或 CSS transition）时，**不要**用动画表达状态；状态仍由 `data-*` 属性与语义类决定（见 `references/07-base-ui.md`）。

## 二、状态完备：一个可交互元素要交代清楚 9 个状态

缺状态 = 缺功能。提交前对着这张表逐个过：

| 状态 | 要求 | 参考写法 |
|---|---|---|
| default | 静息态可读、对比度达标 | 语义类 |
| hover | 有反馈但不跳版（改背景/边框，不改尺寸与位置） | `hover:bg-accent` |
| focus-visible | **键盘可见焦点**，不可只靠 hover | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| active | 按下态，弱于 hover | `active:bg-accent/80` |
| disabled | 视觉 + 语义同时禁用 | `disabled:opacity-50` + `disabled:pointer-events-none` + `disabled` 属性 |
| loading | 局部 loading，按钮内联 spinner | `aria-busy` + `disabled` + 内联 `<Loader2 className="size-4 animate-spin" />` |
| empty | 图标 + 一句话 + 主操作 | 见 `references/04-data-display.md` |
| error | 就地错误 + 可重试 | `text-destructive` + 重试按钮，不用全局 toast 承载可恢复错误 |
| selected / current | 当前项可辨认 | `bg-accent text-accent-foreground` 或 `aria-current` / `data-[selected]` |

补充硬要求：

- **不依赖 hover 传达关键信息**：移动端没有 hover。
- 图标按钮必须带 `aria-label`；装饰性图标 `aria-hidden="true"`。
- 加载超过约 300ms 才显示 spinner，避免闪烁；列表用 `Skeleton` 且形状与真实内容一致。
- 表单错误用 `aria-invalid` + `aria-describedby` 关联提示文案。
- 触控目标 ≥ 44×44px（详见 `references/03-responsive-and-mobile.md`）。

## 三、不写死颜色（R011）

颜色**只能**出现在 token 层：`src/index.css` 的 `:root` / `.dark` / `[data-theme]` / `@theme`。组件里一律用语义类。

```tsx
// ✗ 硬编码色值
<div className="bg-[#ffffff] text-[rgb(24,24,27)] border-[hsl(240,5%,90%)]">
<div style={{ backgroundColor: "#f4f4f5" }}>

// ✓ 语义类
<div className="bg-background text-foreground border">
<div className="bg-muted">
```

```css
/* ✗ 组件样式里写死颜色 */
.card { background: #ffffff; color: rgb(24 24 27); }

/* ✓ 只在 token 层出现色值 */
:root { --card: 0 0% 100%; --card-foreground: 240 6% 10%; }
.card { background: hsl(var(--card)); color: hsl(var(--card-foreground)); }
```

例外与精度（脚本已按此实现，避免误伤）：

- `var(--token)` 引用**不算**写死：`bg-[hsl(var(--primary))]`、`border-[var(--frame)]` 合法。
- **token 源文件自动豁免**：`theme.ts`、`theme-presets.ts`、`colors.ts`、`palette.css`、`chart.ts`、`brand.css` 这类文件本来就是色值的定义处（仅豁免 `.ts/.js/.css/.scss`，同名组件 `.tsx` 不豁免）。
- **图表 / 终端色板**：`series={[{ key: "cpu", color: "#2563eb" }]}` 这类数据集里的颜色属于调色板，抽到 `chart.ts` 后即被豁免；`style={{ color: "#…" }}` 这种真正的内联样式才报。
- 确实需要保留的固定色（品牌 logo、第三方嵌入）：`// ui-allow R011: 理由` 逐处标注。

**不允许**用例外绕过"顺手写个 hex"。

## 四、间距与栅格

- 一律 **4/8 的倍数**：Tailwind 刻度优先 `1/2/3/4/6/8/12`（= 4/8/12/16/24/48px）。
- 禁止 `p-[13px]`、`gap-[7px]` 之类任意值；确需特殊值先说明理由。
- 页面级 padding 移动优先递进：`p-4 sm:p-6 lg:p-8`。
- 同一屏内同类间距保持一致（卡片内要么统一 `p-4`，要么统一 `p-6`）。

## 五、Tailwind v4 的 token 写法

v4 不再用 `tailwind.config.js` 的 `theme.extend`，改在 CSS 里声明；**class 名与 v3 相同**，本 skill 的规则（按 class 名判定）继续适用。

```css
@import "tailwindcss";

/* 暗色以 class 驱动 */
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.21 0.006 285.9);
  --card: oklch(1 0 0);
  --border: oklch(0.92 0.004 286.3);
  --radius: 0.5rem;
}
.dark {
  --background: oklch(0.14 0.004 285.8);
  --foreground: oklch(0.97 0.001 286.4);
  --card: oklch(0.18 0.004 285.8);
  --border: oklch(0.27 0.006 286.0);
}

/* 把 CSS 变量映射成 Tailwind 工具类 */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-border: var(--border);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
}
```

要点：v4 用 `oklch()` 表达颜色，本 skill 的色相规则同样按 oklch 的 hue 判定；不要在同一项目里混用 v3 的 `hsl(var(--x))` 与 v4 的 `@theme` 两套写法。

## 六、项目级覆盖：设计系统与全局标准冲突时

本 skill 的默认标准面向"中性、克制、通用"的界面。若某个项目的设计系统**明确要求**不同取值（例如品牌色用 indigo、卡片圆角 12px），用**项目内**的 `rules.config.json` 覆盖，不要改 skill 全局，也不要用一堆 `ui-allow` 逐个压制：

```json
{
  "hueBluePurple": [235, 320],
  "maxCardRadiusPx": 12,
  "severity": { "R003": "warn" }
}
```

示例见 `assets/project-overrides.example.json`。覆盖前确认三件事：暗色底仍是中性灰（不是蓝紫底）、圆角仍**全站一致**、阴影仍克制。这三条是风格底线，与具体色相/像素无关，任何项目都不建议突破。
