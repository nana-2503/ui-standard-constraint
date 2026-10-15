# 安装说明（INSTALL）

`ui-standard-constraint` 是一个 **skill 目录**：整包复制即可用，没有构建步骤、没有 npm 依赖。

- 需要：**Node.js ≥ 18**（只有自检脚本需要；纯加载 skill 的规则文本不需要 Node）。
- 可选：`git`（`--changed` 依赖它，非 git 仓库会退化为全量扫描）。
- 不需要：`npm install`、任何第三方包、任何编译。

---

## 一、安装位置一览

| 运行时 | 用户级（该机器所有项目） | 项目级（只对该仓库生效，优先级更高） |
|---|---|---|
| DSH | `$DSH_HOME/skills/`（默认 `~/.dsh/skills/`） | `<repo>/.dsh/skills/`、`<repo>/.agents/skills/` |
| Claude Code | `~/.claude/skills/` | `<repo>/.claude/skills/` |
| 其它 agent / 无原生 skill 机制 | 任意固定目录 | `<repo>/skills/`，并在 `AGENTS.md` 里写明路径 |

目录名保持 `ui-standard-constraint`（与 `SKILL.md` 的 `name` 一致），同名时项目级覆盖用户级。

---

## 二、方式 A：用户级安装（推荐个人使用）

装一次，本机所有仓库都能用：

```bash
mkdir -p "${DSH_HOME:-$HOME/.dsh}/skills"
git clone https://github.com/nana-2503/ui-standard-constraint.git \
  "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
```

不想用 git（离线 / 内网），手动复制也行：

```bash
mkdir -p "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
cp -a /path/to/downloaded/ui-standard-constraint/. \
      "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint/"
```

必须带齐 `SKILL.md`、`references/`、`scripts/`、`assets/` 四项；`SKILL.md` 缺失等于没装。

## 三、方式 B：项目级安装（推荐团队 / 随仓库走）

只影响当前仓库，且可以提交进 git，让所有协作者和 CI 用同一份规则：

```bash
cd <repo>
mkdir -p .dsh/skills
git clone https://github.com/nana-2503/ui-standard-constraint.git \
  .dsh/skills/ui-standard-constraint

# 之后在仓库根执行
node .dsh/skills/ui-standard-constraint/scripts/check-ui-rules.mjs
```

团队约定：

- 若希望规则随仓库版本走，把 `.dsh/skills/ui-standard-constraint/` 提交进 git（约 60KB 文本，无二进制）。
- 若不想拷贝进仓库，用 submodule（见方式 E）。
- 调用一律写**仓库内相对路径**（`<skill目录>/scripts/check-ui-rules.mjs`），不要写个人机器的绝对路径。

## 四、方式 C：Claude Code / Cursor / 其它 agent

- **Claude Code**：目录结构与 DSH 相同，把整包放到 `~/.claude/skills/ui-standard-constraint/` 或 `<repo>/.claude/skills/ui-standard-constraint/` 即可。
- **Cursor / 其它只有 rules 机制的编辑器**：skill 目录放哪都行（推荐 `<repo>/skills/ui-standard-constraint/`），然后在 `.cursor/rules` 或 `AGENTS.md` 里写一行指路：

  ```markdown
  ## 前端 UI 约束
  - 任何 `frontend/` 下的界面改动，动手前先读 `skills/ui-standard-constraint/SKILL.md`，
    按其规则执行，交付前运行 `node skills/ui-standard-constraint/scripts/check-ui-rules.mjs --changed`。
  ```

- **纯手动用（不接 agent）**：把它当 lint 工具，直接跑 `scripts/check-ui-rules.mjs`，或把 `references/` 当成 code review 清单。

## 五、方式 D：Windows

PowerShell：

```powershell
# 用户级
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dsh\skills" | Out-Null
git clone https://github.com/nana-2503/ui-standard-constraint.git `
  "$env:USERPROFILE\.dsh\skills\ui-standard-constraint"

# 校验
node "$env:USERPROFILE\.dsh\skills\ui-standard-constraint\scripts\check-ui-rules.mjs" --list-rules
```

脚本本身无平台依赖；WSL 下按 Linux 的方式装即可。

## 六、方式 E：git submodule（版本固定）

```bash
cd <repo>
git submodule add https://github.com/nana-2503/ui-standard-constraint.git .dsh/skills/ui-standard-constraint
git commit -m "chore: add ui-standard-constraint skill"
```

协作者拉取后需 `git submodule update --init --recursive`。升级用 `git submodule update --remote .dsh/skills/ui-standard-constraint`。

---

## 七、校验安装

```bash
SKILL="${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
node "$SKILL/scripts/check-ui-rules.mjs" --list-rules   # 能列出 R001…R011 即为就绪
```

期望输出：

```
R001  error 禁止蓝紫配色 / 蓝紫暗色模式
R002  error 禁止 Claude 风格（米白底 + 暖橙 accent + serif 标题）
...
R009  error 文件过大或职责未拆分
R010  warn  Base UI 基础语法（render / data-* / 子路径导入 / 不混 Radix）
R011  error 硬编码颜色字面量（颜色只能来自 token）
SUP   warn  抑制注释缺少理由
```

若报 `路径不存在` / `未知参数`，说明 `assets/rules.config.json` 或脚本没复制全，重新整包复制。

## 八、接入项目规则（强烈建议，否则触发不稳）

skill 目录每轮只注入 `name` + `description`，**是否加载靠语义匹配**。把 `assets/agents-snippet.md` 里的片段贴进仓库的项目规则文件（`AGENTS.md` / `CLAUDE.md` / `.cursor/rules`），才谈得上「稳定生效」。推荐用其中的**片段 B（标准版）**，它包含：动手前加载、shadcn MCP 优先、交付前跑 `--changed`、基线机制、抑制必须写理由。

## 九、存量项目首次接入：基线

老项目一开始必然一堆历史违规。**不要**为了首跑清零而大改存量代码，先生成基线：

```bash
cd <repo>
node <skill目录>/scripts/check-ui-rules.mjs --write-baseline .ui-baseline.json
git add .ui-baseline.json && git commit -m "chore: ui rules baseline"

# 之后日常只报新增违规
node <skill目录>/scripts/check-ui-rules.mjs --baseline .ui-baseline.json --changed
```

基线按「规则号 + 文件 + 命中代码片段」的哈希记录，存量不动即不会报警；一旦改动引入了**新的**违规就会报出来。

## 十、日常用法速查

| 场景 | 命令 |
|---|---|
| 全量自查 | `node <skill>/scripts/check-ui-rules.mjs` |
| 只看本次改动 | `node <skill>/scripts/check-ui-rules.mjs --changed` |
| 指定目录/文件 | `node <skill>/scripts/check-ui-rules.mjs --root frontend/src` |
| 只跑某几条规则 | `node <skill>/scripts/check-ui-rules.mjs --only R001,R003` |
| 严格模式（warning 也失败） | `node <skill>/scripts/check-ui-rules.mjs --strict` |
| CI 用 JSON 输出 | `node <skill>/scripts/check-ui-rules.mjs --json --baseline .ui-baseline.json` |
| 查看规则表 | `node <skill>/scripts/check-ui-rules.mjs --list-rules` |

退出码：`0` 通过；`1` 有违规（或 `--strict` 下有 warning）；`2` 参数或内部错误。

## 十一、例外与阈值

**单行例外**（必须写理由，无理由的抑制按违规处理）：

```tsx
// ui-allow R003: 全屏引导卡按设计稿要求 12px
<div className="rounded-xl">
```

**整文件例外**：

```ts
// ui-allow-file R005: 该文件是 shadcn 生成产物
```

**调松紧**：改 `<skill目录>/assets/rules.config.json`（圆角上限、禁用色相区间、文件行数上限、单规则是否启用等），不要改脚本。临时改级别也可以命令行覆盖：`--severity R003=warn`、`--disable R004`、`--enable R007`。

**项目级覆盖（推荐）**：设计系统与全局标准不同时，不要改 skill 自带的配置，也不要堆抑制注释，而是在项目里放一份覆盖文件：

```bash
cd <repo>
mkdir -p .dsh
cp <skill目录>/assets/project-overrides.example.json .dsh/ui-rules.config.json
# 按需编辑：hueBluePurple / maxCardRadiusPx / severity / baseUi / colorLiterals …
node <skill目录>/scripts/check-ui-rules.mjs      # 自动读取 .dsh/ui-rules.config.json
node <skill目录>/scripts/check-ui-rules.mjs --config ./ui-rules.json   # 或显式指定
```

分层规则：`内置默认 → skill 的 assets/rules.config.json → <cwd>/.dsh/ui-rules.config.json（自动发现） → --config <path>`，`enable`/`disable` 取并集、`severity` 合并、`$` 开头的键视为注释。覆盖前确认三条风格底线仍成立：暗色底是中性灰、圆角全站一致、阴影克制。

## 十二、CI 集成

```yaml
# .github/workflows/ui-rules.yml
name: ui-rules
on: [pull_request]
jobs:
  ui-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      # 方式 B（项目级安装，随仓库提交）时的调用：
      - run: node .dsh/skills/ui-standard-constraint/scripts/check-ui-rules.mjs --baseline .ui-baseline.json
      # 若用 submodule 安装，先加：git submodule update --init --recursive
```

注意 `--changed` 的语义：它比对的是**工作区相对 HEAD 的改动 + 未跟踪文件**，所以适合本地提交前自查；CI 里 checkout 后工作区与 HEAD 一致，`--changed` 会扫不到东西。CI 请用**全量 + `--baseline`**，或直接传具体路径。

## 十三、升级与卸载

```bash
# 升级（git 安装）
git -C "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint" pull --ff-only

# 卸载
rm -rf "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
```

项目级安装同理，删除目录后记得清掉 `AGENTS.md` 里的接入片段。升级后重新跑一次 `--list-rules` 与仓库自查，确认阈值行为没有意外变化。

### 版本变化提示

- **v1.3.0**：新增规则 13 / R011「不写死颜色」（`bg-[#…]`、`text-[rgb(…)]`、内联样式色值、CSS 里硬编码颜色；`var(--token)` 引用与 token 源文件自动豁免）与规则 14「状态完备 + 可访问性」（人工核对）；新增 `references/08-saas-style-and-states.md` 与 `assets/project-overrides.example.json`；脚本支持**项目级配置分层**（自动读 `<cwd>/.dsh/ui-rules.config.json`，或 `--config <path>`），配置新增 `"colorLiterals": true`。**升级注意**：老项目会新报一批 R011（默认 error，会阻塞退出码），先用 `--write-baseline` 固化存量，或按需在项目覆盖里把 R011 调成 `warn`。
- **v1.2.0**：新增规则 12 / R010「Base UI 基础语法」（`render` 组合、`data-*` 状态属性、子路径导入、业务层不直引原语、不混 Radix），新增 `references/07-base-ui.md`；配置新增 `"baseUi": true`，Radix 项目改成 `false` 可关闭该类检查。老项目升级后可能新报一批 R010（默认 warn，不阻塞退出码），需要时用基线隔离。
- **v1.1.x**：11 条规则（R001–R009）+ 基线机制 + 基础自查脚本。


---

## 十四、常见问题

**Q：脚本会不会误报？**
会。规则是基于文本/启发式的（比如按色相判断蓝紫、按 class 名判断圆角）。处理顺序：先判断是否真违规 → 确属误报就用 `// ui-allow <规则号>: 理由` 单点抑制 → 若是团队约定不同（例如卡片允许 12px），改 `assets/rules.config.json` 的阈值。**不要**为了绿灯批量加抑制。

**Q：`npm run lint` / `build` 报找不到 `tsc` / `eslint`？**
环境里设了 `NODE_ENV=production`，包管理器会跳过 devDependencies。用：

```bash
env -u NODE_ENV npm run lint && env -u NODE_ENV npm run build
```

**Q：Vue / Svelte / Tailwind v4 能用吗？**
能。脚本按 `.tsx/.jsx/.ts/.js/.vue/.css/.scss/.html` 扫描，与框架无关；Vue 的模板 class 同样会被检查。Tailwind v4 的 token 写法和部分启发式规则需要在 `assets/rules.config.json` 与 `assets/tokens.css` 上按项目现状调整。

**Q：必须放在 `<repo>/frontend` 吗？**
不必须。脚本默认先找 `./frontend`，找不到就扫当前目录；也可以用 `--root` 指定任意路径。

**Q：为什么 `components/ui/**` 和测试文件不报？**
shadcn 生成的原语默认豁免（`--include-ui-primitives` 可纳入），`*.test.*` / `*.spec.*` 默认跳过（`--include-tests` 可纳入）。业务代码不要改写 `components/ui/**`，主题只改 `src/index.css` 的 token。

**Q：存量项目一定要一次改到全绿吗？**
不用。skill 明确写了「已有页面不要求一次性改造达标，新写和正在改的部分必须达标」，用基线机制区分。

**Q：R010（Base UI）报了一堆怎么办？项目原本用 Radix。**
R010 只在项目原语层是 `@base-ui/react` 时才适用。若项目本来就用 Radix，把 `assets/rules.config.json` 的 `"baseUi"` 改成 `false`，整类检查关闭（其余规则不受影响）。若是混用/迁移中项目，先看 `references/07-base-ui.md` 的对照表：`asChild` → `render={<X />}`、`data-[state=open]:` → `data-[open]:`、根 barrel → 子路径导入。存量违规同样可以用基线机制隔离。

**Q：`asChild` 在 `src/components/ui/**` 里为什么没报？**
封装层（`components/ui/**`、`lib/`、`hooks/`、`store/**`）允许保留 `asChild` 兼容层（内部转成 `useRender`），R010 只在业务层提示改用 `render`。原语层里给 Base UI 原生部件直接写 `asChild` 仍是 error。

**Q：R011 报了一堆硬编码颜色怎么办？**
先分清四类：① `var(--token)` 引用（`bg-[hsl(var(--primary))]`）本来就不报；② token 源文件（`theme.ts`、`colors.ts`、`palette.css`、`chart.ts`、`brand.css` 等，仅 `.ts/.js/.css/.scss`）自动豁免——图表/终端色板抽到 `chart.ts` 即可；③ 真正的组件内色值，改成语义类（`bg-background`/`text-muted-foreground`/`border`）；④ 品牌 logo、第三方嵌入等确实要固定的色，用 `// ui-allow R011: 理由` 逐处标注。存量用基线隔离，不建议整类关掉（需要时在项目覆盖里设 `"colorLiterals": false` 或 `"severity": { "R011": "warn" }`）。

**Q：规则和仓库已有的 `AGENTS.md` 冲突怎么办？**
以 `AGENTS.md` 为准（它管部署、发版、CI 等硬流程）；把 UI 规则作为补充条款并入相应小节。
