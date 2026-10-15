# ui-standard-constraint

**前端 UI 标准约束** —— 给 AI 编程 agent 用的前端 UI 强制规范（shadcn/ui + Tailwind CSS + Base UI），由「Markdown 规则 + 零依赖检查脚本」两层组成。

![version](https://img.shields.io/badge/version-1.4.0-blue)
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

- **强约束，不是清单**：22 条硬规则 + 22 项验收，违反即返工；先按规则落结构，不要写完再回头改。
- **可机器校验**：R001–R022 均有脚本实现（R019 为 info），退出码 `0/1/2` 可直接接入 CI 或 git hook。
- **颜色纪律 + 状态完备**：色值只允许出现在 token 层（R011 拦 `bg-[#…]`、内联色值与 CSS 写死颜色）；hover / focus-visible / loading / empty / error 等 9 个状态逐一交代。
- **工程硬化**：XSS 边界、重依赖懒加载、列表 key 与三态、存储/格式化收口、样式边界、层叠与动效、大数据量、测试门槛（R012–R022）；除 XSS 外默认 `warn`/`info`，先观察再收紧。
- **项目级覆盖**：设计系统另有一套取值时，用 `.dsh/ui-rules.config.json` 分层覆盖，不动全局标准、也不靠堆 `ui-allow`。
- **覆盖 Base UI 基础语法**：组合用 `render`（不是 `asChild`）、状态样式用 `data-open`/`data-checked`（不是 `data-[state=…]`）、子路径导入、业务层不直引原语；误用 Radix 写法会被 R010 拦下。
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
| 12 | R010 | **使用 Base UI 基础语法**：组合用 `render`（不是 `asChild`）；状态样式用 `data-open`/`data-checked` 等（不是 `data-[state=…]`）；子路径导入；业务层不直引原语、不引 Radix |
| 13 | R011 | **不写死颜色**：禁 `bg-[#…]`/`text-[rgb(…)]` 与内联样式色值；色值只出现在 token 层（`:root`/`.dark`/`[data-theme]`/`@theme`） |
| 14 | 人工 | **状态完备 + 可访问性**：hover / focus-visible / active / disabled / loading / empty / error / selected 逐一交代；键盘可达、图标有 `aria-label`、触控 ≥ 44px；动效克制并尊重 `prefers-reduced-motion` |
| 15 | R012（error） | **安全边界**：`dangerouslySetInnerHTML` 必须配净化；`target="_blank"` 必须带 `rel="noopener noreferrer"` |
| 16 | R014 | **首屏体积**：monaco/tiptap/echarts/xterm 等重依赖禁止静态 import，走 `lazy()` + `Suspense` + `ErrorBoundary` |
| 17 | R013 + R018 | **渲染正确性**：列表 key 不用索引；数据获取必须交代 loading / error / empty 三态 |
| 18 | R015 + R021 | **收口**：`localStorage` 走统一模块（类型化 key、版本、异常兜底）；日期数字格式化集中到 `lib/format` |
| 19 | R016 | **样式边界**：禁 `!important`；全局样式只有 token 文件；`@layer components` 只减不增；内联 `style` 只给动态值 |
| 20 | R017 + R020 | **层叠与动效**：禁 `z-[数字]`（用 z-20/30/50 档位）；禁 `transition-all` 与 width/height/top/left 动画，只动 transform/opacity |
| 21 | R019（info） | **大数据量**：表格/列表 > 200 行必须分页或虚拟滚动（静态无法判断行数，默认仅提示） |
| 22 | R022 | **测试门槛**：表格筛选排序、表单提交校验、主题切换、危险操作确认至少各 1 个测试 |

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
R010  warn  Base UI 基础语法（render / data-* / 子路径导入 / 不混 Radix）
R011  error 硬编码颜色字面量（颜色只能来自 token）
R012  error XSS 边界：dangerouslySetInnerHTML 需净化 / target=_blank 需 rel
R013  warn  列表 key 使用索引
R014  warn  重依赖未懒加载 / 路由缺少 Suspense 与 ErrorBoundary
R015  warn  直接访问 localStorage / sessionStorage
R016  warn  样式外溢：!important / 额外全局 CSS / 静态内联样式
R017  warn  任意 z-index（z-[数字]）
R018  warn  数据获取缺少 loading / error / empty 处理
R019  info  长列表/表格未分页或虚拟化（静态无法判断行数，默认仅提示）
R020  warn  动效：transition-all 或动画布局属性
R021  warn  日期/数字格式化散落（应集中到 lib/format）
R022  warn  前端无测试文件
SUP   warn  抑制注释缺少理由
```

### Base UI 语法要点（规则 12 / R010）

项目原语层若是 `@base-ui/react`（**不是 Radix**），下列 Radix 习惯一律不成立：

| 场景 | ✗ Radix 写法 | ✓ Base UI 写法 |
|---|---|---|
| 组合 / 替换元素 | `asChild` | `render={<Link to="/new" />}`，或函数形式 `render={(props, state) => …}` |
| 状态样式 | `data-[state=open]:bg-accent` | `data-[open]:bg-accent`（还有 `data-checked`、`data-invalid`、`data-starting-style` …） |
| 导入 | `from "@base-ui/react"`（根 barrel） | 子路径 `from "@base-ui/react/dialog"` |
| 自定义封装 | 手写 `cloneElement` | `useRender` + `mergeProps`（事件从右到左执行） |
| 业务层 | 直接 import 原语 | 只 import `src/components/ui/**` 的封装组件 |

R010 会拦下：引入 `@radix-ui/*`（error）、给 Base UI 原生部件写 `asChild`（error）、根 barrel 导入 / `data-[state=…]` / 业务层直引原语（warn）。项目本来就用 Radix 时，把 `assets/rules.config.json` 里的 `baseUi` 设为 `false` 即可关掉这一整类检查。语法细则与正反例见 `references/07-base-ui.md`。

### 颜色只来自 token（规则 13 / R011）

`bg-[#ffffff]`、`text-[rgb(24,24,27)]`、`border-[hsl(240,5%,90%)]`、`style={{ backgroundColor: "#f4f4f5" }}`，以及 CSS 里 `.card { background: #fff }`，都会被 R011 报出（error）。合法写法是语义类（`bg-background`/`text-muted-foreground`/`border`）或 `var(--token)` 引用（`bg-[hsl(var(--primary))]` 不算写死）。

- **token 源文件自动豁免**：`theme.ts`、`colors.ts`、`palette.css`、`chart.ts`、`brand.css` 这类色值定义处（仅 `.ts/.js/.css/.scss`，同名 `.tsx` 组件不豁免）。
- **图表 / 终端色板**：抽到 `chart.ts` 即豁免；真正的内联样式才报。
- 确有需要保留的固定色（品牌 logo、第三方嵌入）：`// ui-allow R011: 理由` 逐处标注，不允许用来「顺手写个 hex」。

### 状态完备与可访问性（规则 14 / 人工）

一个可交互元素要交代 9 个状态：**default、hover、focus-visible、active、disabled、loading、empty、error、selected**。补充硬要求：关键信息不靠 hover 传达（移动端没有 hover）；图标按钮必须 `aria-label`、装饰图标 `aria-hidden="true"`；表单错误用 `aria-invalid` + `aria-describedby`；加载超约 300ms 才显示 spinner；触控目标 ≥ 44×44px；动效 120–200ms 且尊重 `prefers-reduced-motion`。细则与写法见 `references/08-saas-style-and-states.md`。

### 工程硬化（规则 15–22 / R012–R022）

表现层规则之外，v1.4.0 增加了 8 条工程规则；除 XSS 为 error 外，其余默认 `warn`/`info`：

| 规则 | 脚本 | 要求 |
|---|---|---|
| 安全边界 | R012（error） | `dangerouslySetInnerHTML` 同文件必须先经 `DOMPurify.sanitize()` 或项目 sanitize 模块；`target="_blank"` 必须带 `rel="noopener noreferrer"`（向后多看 2 行，跨行写法不误报） |
| 首屏体积 | R014 | `monaco-editor`/`@tiptap/*`/`echarts`/`recharts`/`xterm`/`three`/`pdfjs-dist`/`mermaid`/`@codemirror/*` 等不得静态 import；用 `lazy()` 且能追溯到 `Suspense` + `ErrorBoundary` |
| 渲染正确性 | R013、R018 | 列表 key 用稳定业务 id（静态常量列表可抑制）；数据获取必须交代 loading / error / empty |
| 收口 | R015、R021 | `localStorage`/`sessionStorage` 走统一模块（类型化 key、版本、异常兜底）；`toLocaleString`/`new Intl.*` 集中到 `lib/format.ts` |
| 样式边界 | R016 | 禁 `!important`；全局样式只允许 token 文件；`@layer components` 只减不增；内联 `style` 只给动态计算值 |
| 层叠与动效 | R017、R020 | 禁 `z-[999]`（用 z-20/30/50 档位）；禁 `transition-all` 与 width/height/top/left 动画，只动 `transform`/`opacity` |
| 大数据量 | R019（info） | 表格/列表 > 200 行必须分页或虚拟滚动（`@tanstack/react-virtual`、`react-window`）；info 不参与 `--strict` 失败判定 |
| 测试门槛 | R022 | 全仓无 `*.test.*`/`*.spec.*` 时提示一次；最低要求是关键路径各 1 个测试（表格筛选排序、表单校验、主题切换、危险操作确认） |

**上线纪律**：这 11 条脚本规则（R012–R022）误报率天然高于表现层规则——先 `--write-baseline` 固化存量、以 warn/info 上线，观察 1–2 周后把确有误报的**单独**降级或 `--disable`，不要因为个别误报整体关掉；一条规则只要 10% 是假错，剩下 90% 的真错也没人看（精度比覆盖面重要）。细则见 `references/09-hardening.md`。

### 项目级覆盖（设计系统与全局标准不同时）

配置分层：`内置默认 → skill 自带 assets/rules.config.json → <cwd>/.dsh/ui-rules.config.json（自动发现） → --config <path>`；`enable`/`disable` 取并集，`severity` 合并，`$` 开头的键当注释忽略。

```bash
mkdir -p .dsh && cp "$SKILL/assets/project-overrides.example.json" .dsh/ui-rules.config.json
node "$SKILL/scripts/check-ui-rules.mjs"                      # 自动读取项目覆盖
node "$SKILL/scripts/check-ui-rules.mjs" --config ./ui-rules.json
```

例如设计系统确实用 indigo 主色 + 12px 卡片圆角时，用覆盖放开这两项（而不是放宽所有项目的标准，也不是堆一堆 `ui-allow`）。覆盖前确认三条风格底线仍成立：暗色底是中性灰、圆角全站一致、阴影克制。

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
│   ├── 06-shadcn-mcp.md            # 如何用 shadcn MCP 查组件/示例/安装
│   ├── 07-base-ui.md               # Base UI 基础语法：render 组合、useRender/mergeProps、data-* 状态属性、分层
│   ├── 08-saas-style-and-states.md # 现代 SaaS 风格取向、9 个交互状态、不写死颜色（R011）、Tailwind v4、项目级覆盖
│   └── 09-hardening.md             # 工程硬化：XSS 边界、重依赖懒加载、key 与三态、收口、样式边界、层叠动效、大数据量、测试门槛
├── scripts/
│   └── check-ui-rules.mjs          # 自查脚本（R001–R022，零依赖，Node ≥ 18）
└── assets/
    ├── tokens.css                  # 允许的 token 基线（Tailwind v3 + HSL 变量）
    ├── rules.config.json           # 全局阈值：圆角上限、禁用色相区间、文件行数上限…
    ├── project-overrides.example.json  # 项目级覆盖示例（复制成 .dsh/ui-rules.config.json 即自动生效）
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
node "$SCRIPT" --config ./ui-rules.json        # 显式指定项目级配置（见「项目级覆盖」）
node "$SCRIPT" --list-rules                    # 查看规则表
node "$SCRIPT" --help                          # 查看全部参数
```

退出码：`0` 通过；`1` 存在违规（或 `--strict` 下有 warning）；`2` 参数/内部错误。

默认跳过 `node_modules`、`dist`、`build`、`public` 等目录，跳过 `components/ui/**`（shadcn 生成原语，可用 `--include-ui-primitives` 纳入）与 `*.test.*` / `*.spec.*`（可用 `--include-tests` 纳入）。`R022` 是仓库级检查（单独统计是否存在测试文件，与上面的跳过无关）；`R019` 为 info，不参与 `--strict` 失败判定。

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
