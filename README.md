# ui-standard-constraint

**前端 UI 标准约束** —— 给 AI 编程 agent 用的前端 UI 强制规范（shadcn/ui + Tailwind CSS），由「Markdown 规则 + 零依赖检查脚本」两层组成。

![version](https://img.shields.io/badge/version-1.1.1-blue)
![node](https://img.shields.io/badge/node-%3E%3D18-green)
![deps](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 一、它解决什么问题

AI 写前端很快，但审美和工程习惯不稳定，典型症状每次都要人肉 review，而且标准说不清：

- 默认爱用蓝紫暗色渐变，暗色底一股「模板味」；
- 卡片 `rounded-2xl` + `shadow-xl`，卡片套卡片、边框套边框；
- 米白/奶油底 + 暖橙 accent + 复古 serif 标题的「Claude 风」；
- 表格里长路径换行，行被撑成两行高，桌面端一眼看去全是错行；
- 桌面端写死 `grid-cols-4`、`w-[520px]`，手机上横向溢出；
- 一个页面组件写到 800 行，fetch 直接写在 JSX 里。

本仓库把这些固化成两层东西：

| 层 | 内容 | 作用 |
|---|---|---|
| **约束层** | `SKILL.md` + `references/` | agent 加载后**必须照做**的规则，不是建议清单 |
| **执行层** | `scripts/check-ui-rules.mjs` | 零依赖 Node 脚本，把规则变成可跑、可接 CI 的检查 |

## 二、核心特点

- **强约束，不是清单**：9 条硬规则 + 11 项验收，违反即返工；先按规则落结构，不要写完再回头改。
- **可机器校验**：R001–R009 均有脚本实现，退出码 `0/1/2` 可直接接入 CI 或 git hook。
- **零依赖单文件**：只用 Node 内置模块（Node ≥ 18），不需要 `npm install`，不污染项目依赖。
- **按需加载**：`SKILL.md` 只给速查表，细则按需读 `references/`，不一次性刷满上下文。
- **存量项目友好**：基线机制（`--write-baseline` / `--baseline`）只报**新增**违规，不要求一次性改造达标。
- **例外必须写理由**：`// ui-allow R003: 理由`；没有理由的抑制本身按违规处理。
- **阈值外置**：松紧在 `assets/rules.config.json` 调，不用改脚本。
- **不绑定框架**：默认按 React + Tailwind + shadcn 的写法扫描，Vue / Svelte / Tailwind v4 同样可用（调整配置里的 token 约定即可）。

## 三、规则清单

### 硬性规则速查（违反即返工）

| # | 脚本规则 | 一句话判据 |
|---|---|---|
| 1 | 人工（shadcn MCP） | 组件一律先用 shadcn；不确定有哪些组件/API/示例时直接查 shadcn MCP，禁止凭记忆手写等价组件 |
| 2 | R007（默认关） | 不写描述性文本：界面里不放解释性、推销性、说明书式长文本，信息靠标签、结构与层级表达 |
| 3 | R001 | 禁止蓝紫暗色模式：禁用 indigo/violet/purple/fuchsia 表面色；暗色底必须是中性灰 |
| 4 | R002 | 禁止 Claude 风格：米白/奶油底 + 暖橙 terracotta accent + 复古 serif 标题的组合 |
| 5 | R003 | 圆角克制：卡片/面板/容器 ≤ 8px；禁止 `rounded-2xl/3xl`；`rounded-full` 只给头像/徽标/胶囊 |
| 6 | R004 | 禁止无目的嵌套：不卡片套卡片、不边框套边框 |
| 7 | R005 | 阴影克制：默认用边框分层；卡片禁 `shadow-lg/xl/2xl` 与彩色阴影 |
| 8 | R008 | 全局响应式：先定移动端形态；`grid-cols-N` 必须带断点前缀 |
| 9 | R008 + 人工 | 移动端额外优化：触控目标 ≥ 44px、无横向溢出、宽表降级为卡片 |
| 10 | R006 | 数据列表不换行：`truncate` + `whitespace-nowrap`，禁 `whitespace-normal/break-words/flex-wrap` |
| 11 | R009 | 前后端与文件拆分：单文件 ≤ 250 行（> 400 为 error），数据访问下沉到 `api.ts` / hooks |

### 脚本规则与默认级别

```
R001  error 禁止蓝紫配色 / 蓝紫暗色模式
R002  error 禁止 Claude 风格（米白底 + 暖橙 accent + serif 标题）
R003  error 圆角过大（卡片/容器 ≤ 8px，任意元素 ≤ 16px）
R004  warn  无目的嵌套边框 / 卡片
R005  error 阴影过重或彩色阴影
R006  error 数据列表内容换行
R007  info  描述性文本元素（细则待补，默认关闭）
R008  warn  响应式缺失 / 移动端溢出风险
R009  error 文件过大或职责未拆分
SUP   warn  抑制注释缺少理由
```

## 四、目录结构

```
ui-standard-constraint/
├── SKILL.md                        # 主约束文件：速查表 + 工作流 + 交付标准
├── references/                     # 细则与正反例（按需读，不要一次读完）
│   ├── 01-color-and-theme.md       # 配色、暗色模式、禁用色板、token 写法
│   ├── 02-layout-and-surfaces.md   # 圆角、边框、嵌套、阴影、间距与层级
│   ├── 03-responsive-and-mobile.md # 断点策略、移动端优化、触控与溢出
│   ├── 04-data-display.md          # 表格/列表/长文本、单行显示与列宽
│   ├── 05-code-structure.md        # 目录结构、前后端拆分、组件与数据层分离
│   └── 06-shadcn-mcp.md            # 如何用 shadcn MCP 查组件/示例/安装
├── scripts/
│   └── check-ui-rules.mjs          # 自查脚本（零依赖，Node ≥ 18）
└── assets/
    ├── tokens.css                  # 允许的 token 基线（Tailwind v3 + HSL 变量）
    ├── rules.config.json           # 阈值配置：圆角上限、禁用色相区间、文件行数上限…
    ├── acceptance-checklist.md     # 交付验收清单（逐条勾选）
    └── agents-snippet.md           # 贴进 AGENTS.md / CLAUDE.md 的触发加固片段
```

## 五、快速开始

装到用户级 skill 目录（DSH 默认 `~/.dsh/skills/`）：

```bash
mkdir -p "${DSH_HOME:-$HOME/.dsh}/skills"
git clone https://github.com/nana-2503/ui-standard-constraint.git \
  "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"

# 确认就绪：能列出规则即安装成功
node "${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint/scripts/check-ui-rules.mjs" --list-rules
```

在项目仓库根跑自查：

```bash
SKILL="${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
node "$SKILL/scripts/check-ui-rules.mjs"          # 自动定位 ./frontend
node "$SKILL/scripts/check-ui-rules.mjs" --changed # 只看本次改动
```

> 完整安装方式（项目级安装、Claude Code / Cursor、Windows、git submodule、CI 集成、存量项目基线、升级与卸载）见 **[INSTALL.md](INSTALL.md)**。

## 六、检查脚本用法

```bash
SKILL="${DSH_HOME:-$HOME/.dsh}/skills/ui-standard-constraint"
SCRIPT="$SKILL/scripts/check-ui-rules.mjs"

node "$SCRIPT"                                # 自动定位 ./frontend 或当前目录
node "$SCRIPT" --root frontend/src            # 指定目录或单个文件
node "$SCRIPT" --changed                       # 只查 git 改动文件（含未跟踪；.css/.scss 始终检查）
node "$SCRIPT" --strict                        # warning 也算失败
node "$SCRIPT" --only R001,R003,R009           # 只跑指定规则（并强制启用）
node "$SCRIPT" --json                          # 机器可读输出，便于接 CI
node "$SCRIPT" --write-baseline .ui-baseline.json   # 存量项目：生成基线
node "$SCRIPT" --baseline .ui-baseline.json    # 之后只报新增违规
node "$SCRIPT" --list-rules                    # 查看规则表
node "$SCRIPT" --help                          # 查看全部参数
```

退出码：`0` 通过；`1` 存在违规（或 `--strict` 下有 warning）；`2` 参数/内部错误。

默认跳过 `node_modules`、`dist`、`build`、`public` 等目录，跳过 `components/ui/**`（shadcn 生成原语，可用 `--include-ui-primitives` 纳入）与 `*.test.*` / `*.spec.*`（可用 `--include-tests` 纳入）。

## 七、交付标准

一次前端改动**算完成**，需同时满足：

1. `check-ui-rules.mjs` 无 error；warning 逐条说明理由或修掉；
2. `npm run lint` 与 `npm run build` 通过（环境有 `NODE_ENV=production` 时用 `env -u NODE_ENV npm run …`）；
3. 桌面（1440）与移动（414）× 亮色与暗色，共 4 组截图肉眼确认；
4. 数据列表页在移动端不横向溢出、行内容不换行；
5. 按 `assets/acceptance-checklist.md` 逐条勾选并附脚本输出。

## 八、触发加固（重要）

agent 的 skill 目录每轮只注入 `name` + `description`，是否加载**靠语义匹配，不保证每轮命中**。可靠做法是把 `assets/agents-snippet.md` 里的片段贴进仓库的项目规则文件（`AGENTS.md` / `CLAUDE.md` / `.cursor/rules`），明写「前端改动前先加载本 skill，交付前跑 `check-ui-rules.mjs --changed`」。

## 九、边界

- 只管前端表现层与前端代码组织；接口契约、鉴权、数据模型属于后端，不在范围内。
- 与仓库自己的 `AGENTS.md` 冲突时，以 `AGENTS.md` 为准（它管部署、发版、CI 等硬流程）。
- 存量代码不要求一次性达标，用基线机制区分新旧问题。

## 十、许可

[MIT](LICENSE)
