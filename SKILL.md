---
name: ui-standard-constraint
description: 前端 UI 编写与布局的强制约束（shadcn + Tailwind）。凡是新增、修改、重构、评审 frontend/ 下的界面、组件、样式、布局、表格列表、响应式或暗色主题，都必须先加载本 skill：它固定配色、圆角、边框、阴影、留白、数据展示、移动端与前后端拆分规则，并要求交付前运行 scripts/check-ui-rules.mjs 自查。
whenToUse: 涉及 frontend/ 下 UI 代码的编写、重构、评审或截图验收；用户提到前端、界面、组件、样式、布局、暗色模式、响应式、表格、列表、shadcn 时
metadata:
  version: "1.1.1"
  owner: 前端
  applies-to: "frontend/**"
  stack: "React + Vite + Tailwind + shadcn/ui（示例按 Tailwind v3 CSS 变量写法）"
---

# 前端 UI 标准约束

**中文名：前端　英文名：ui-standard-constraint**

本 skill 是**约束**，不是建议清单。写前端代码时先按这里的规则落结构，不要先写完再回头改。

## 0. 触发与适用范围

- 适用目录：项目仓库根下的 `frontend/`（前端与后端同级，即 `<repo>/frontend` 与 `<repo>/backend`）。
- 适用动作：写/改任何 `.tsx/.jsx/.ts/.js/.vue/.css`，只要它影响界面、布局、颜色、间距、响应式或主题。
- 不适用：纯后端、构建脚本、CI 配置。
- 每次开始前端改动前，先读本文件，必要时按需读 `references/` 下对应章节，**不要**一次性把全部 references 读完刷上下文。
- 脚本默认按「React + Tailwind + shadcn」约定扫描；Vue/Svelte 或 Tailwind v4 项目同样可用，但 token 写法与部分启发式规则需按 `assets/rules.config.json` 调整。

## 1. 硬性规则速查（违反即返工）

| # | 脚本规则 | 一句话判据 |
|---|---|---|
| 1 | 人工（MCP） | 组件一律先用 shadcn；不确定有哪些组件/API/示例时**直接调 shadcn MCP 查**，禁止凭记忆手写等价组件 |
| 2 | R007（默认关） | 不写描述性文本：界面里不放解释性、推销性、说明书式长文本；信息靠标签、结构与层级表达 |
| 3 | R001 | 禁止蓝紫暗色模式：禁用 indigo/violet/purple/fuchsia 表面色；暗色底必须是中性灰 |
| 4 | R002 | 禁止 Claude 风格：米白/奶油底 + 暖橙 terracotta accent + 复古 serif 标题的组合 |
| 5 | R003 | 圆角克制：卡片/面板/容器 ≤ 8px；禁止 `rounded-2xl/3xl`；`rounded-full` 只给头像/徽标/胶囊 |
| 6 | R004 | 禁止无目的嵌套：不卡片套卡片、不边框套边框 |
| 7 | R005 | 阴影克制：默认用边框分层；卡片禁 `shadow-lg/xl/2xl` 与彩色阴影 |
| 8 | R008 | 全局响应式：先定移动端形态；`grid-cols-N` 必须带断点前缀 |
| 9 | R008 + 人工 | 移动端额外优化：触控目标 ≥ 44px、无横向溢出、宽表降级为卡片 |
| 10 | R006 | 数据列表不换行：`truncate` + `whitespace-nowrap`，禁 `whitespace-normal/break-words/flex-wrap` |
| 11 | R009 | 前后端与文件拆分：单文件 ≤ 250 行（> 400 为 error），数据访问下沉到 `api.ts`/hooks |

细则与正反例见 `references/`：

| 文件 | 内容 |
|---|---|
| `references/01-color-and-theme.md` | 配色、暗色模式、禁用色板、token 写法 |
| `references/02-layout-and-surfaces.md` | 圆角、边框、嵌套、阴影、间距与层级 |
| `references/03-responsive-and-mobile.md` | 断点策略、移动端优化、触控与溢出 |
| `references/04-data-display.md` | 表格/列表/长文本、单行显示与列宽 |
| `references/05-code-structure.md` | 目录结构、前后端拆分、组件与数据层分离 |
| `references/06-shadcn-mcp.md` | 如何用 shadcn MCP 查组件/示例/安装 |

## 2. 工作流（每次前端改动按序执行）

1. **查组件**：需要交互组件时，先用 shadcn MCP 搜索并看示例（`references/06-shadcn-mcp.md`），不要手搓。
2. **定 token**：颜色/圆角/阴影只用 `src/index.css` 里的 CSS 变量 + Tailwind 语义类（`bg-card`、`text-muted-foreground`、`border`）。要新增色，先改 token，再在组件里引用。
3. **搭结构**：先定移动端单列，再逐级加断点；容器层级能少一层就少一层。
4. **写代码**：按职责拆文件（页面 / feature 组件 / hook / `lib/api` / 类型）。
5. **自查**：`node scripts/check-ui-rules.mjs`（用法见 §3），把 error 清零。
6. **构建**：`cd frontend && npm run lint && npm run build`。若环境里设了 `NODE_ENV=production`，包管理器会忽略 devDependencies（缺 `tsc`/`eslint`），此时用 `env -u NODE_ENV npm run lint && env -u NODE_ENV npm run build`。
7. **报告**：按 `assets/acceptance-checklist.md` 逐条给出结论，并附上自查脚本输出。

## 3. 自查脚本

脚本位于本 skill 目录的 `scripts/check-ui-rules.mjs`。下面的 `$SKILL` 指该目录；若你的运行时已注入 skill 基目录，也可直接用 `scripts/check-ui-rules.mjs`。

```bash
# DSH 用户级安装；其它安装方式换成实际路径
SKILL="${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"

# 在仓库根执行：自动定位 ./frontend
node "$SKILL/scripts/check-ui-rules.mjs"

# 指定目录 / 只看改动文件 / JSON 输出 / 严格模式（warning 也算失败）
node "$SKILL/scripts/check-ui-rules.mjs" --root frontend/src
node "$SKILL/scripts/check-ui-rules.mjs" --changed
node "$SKILL/scripts/check-ui-rules.mjs" --json
node "$SKILL/scripts/check-ui-rules.mjs" --strict

# 只查某几条规则 / 查看规则表
node "$SKILL/scripts/check-ui-rules.mjs" --only R001,R003,R009
node "$SKILL/scripts/check-ui-rules.mjs" --list-rules

# 存量项目：先生成基线，之后只报新增违规
node "$SKILL/scripts/check-ui-rules.mjs" --write-baseline .ui-baseline.json
node "$SKILL/scripts/check-ui-rules.mjs" --baseline .ui-baseline.json
```

退出码：`0` 通过；`1` 存在违规（或 `--strict` 下有 warning）；`2` 参数/内部错误。
阈值可在 `assets/rules.config.json` 调整（圆角上限、禁用色相区间、文件行数上限等），不必改脚本。

### 例外与抑制（必须写理由）

- 单个元素例外：在该行或上一行加注释 `// ui-allow R003: 全屏引导卡按设计稿要求 12px`。
- 整文件例外：`// ui-allow-file R005: 该文件是 shadcn 生成产物`。
- 没有理由的抑制视为违规；不得用抑制掩盖批量问题。生成的 shadcn 原语（`src/components/ui/**`）默认不扫描，可用 `--include-ui-primitives` 纳入。

## 4. 产物与验收（交付标准）

一次前端改动**算完成**，需同时满足：

1. `check-ui-rules.mjs` 无 error；warning 逐条说明理由或修掉。
2. `npm run lint` 与 `npm run build` 通过。
3. 桌面（1440）与移动（414）两个宽度、亮色与暗色两个主题，共 4 组截图肉眼确认；如项目有 WAF/CloudPan 的截图目录约定，按 `<页面>-<宽度>.png` 命名。
4. 数据列表页在移动端不横向溢出，行内容不换行。
5. 按 `assets/acceptance-checklist.md` 输出勾选结果。

产物落点：

- 规则自查输出：`ui-check-report.txt`（可选，放仓库根或临时目录，不进 git）。
- 截图：项目既有截图目录（如 `docs/screenshots/`）。
- 新增的设计 token：只改 `frontend/src/index.css`，不要把色值散落进组件。

## 5. 边界

- 本 skill 只管前端表现层与前端代码组织；接口契约、鉴权、数据模型改动属于后端，不在本 skill 范围。
- 与本仓库 `AGENTS.md` 冲突时，以 `AGENTS.md` 为准（它管部署、发版、CI 等硬流程）。
- 已有页面不要求一次性改造达标；**新写和正在改的部分必须达标**，存量用基线机制区分。

## 6. 接入到项目规则（加固触发）

本 skill 靠 `description` 语义匹配加载，**不保证每轮必然触发**。要让它在某个仓库稳定生效，把 `assets/agents-snippet.md` 里的片段贴进该仓库的项目规则文件（`AGENTS.md` / `CLAUDE.md` / `.cursor/rules` 等），其中声明"前端改动前先加载本 skill"并要求交付前运行 `scripts/check-ui-rules.mjs --changed`。

- 片段 A：最小一行版；片段 B：推荐标准版（含基线机制与抑制规范）；片段 C：团队版（含构建与截图验收）。
- 该文件同时给出用户级（`$DSH_HOME/skills/`）与项目级（`<repo>/.dsh/skills/`、`<repo>/.agents/skills/`）两种安装位置；项目级优先级更高，适合同名覆盖。
- 复制给他人时使用相对调用（`<skill目录>/scripts/…`），不要写个人机器绝对路径。
