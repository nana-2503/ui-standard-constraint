# 接入片段：把本 skill 钉进项目规则

**为什么要这一段**：agent 的 skill 目录每轮只注入 `name` + `description`，是否加载靠语义匹配。写法再强势也不能保证 100% 每轮命中。项目规则文件（`AGENTS.md` / `CLAUDE.md` / `.cursor/rules` 等）是每轮必读的，所以**在项目规则里写一行"改动前先加载本 skill"**，是唯一可靠的触发加固手段。

## 一、安装本 skill（二选一）

| 方式 | 位置 | 生效范围 |
|---|---|---|
| 用户级 | `~/.dsh/skills/ui-standard-constraint/`（或 `$DSH_HOME/skills/`） | 该机器上所有项目 |
| 项目级 | `<repo>/.dsh/skills/ui-standard-constraint/` | 仅该仓库，优先级高于用户级；也可放 `<repo>/.agents/skills/` |

整包复制目录即可（`SKILL.md` + `references/` + `scripts/` + `assets/`），无需安装依赖。确认可用：

```bash
node "<skill目录>/scripts/check-ui-rules.mjs" --list-rules   # 能列出规则即为就绪
```

## 二、片段 A：最小版（一行）

适合已经有人工 review 流程的仓库。

```markdown
## 前端 UI 约束
- 任何 `frontend/` 下的界面改动，动手前先加载 skill `ui-standard-constraint` 并按其规则执行。
```

## 三、片段 B：标准版（推荐）

```markdown
## 前端 UI 约束

- 适用：`frontend/` 下的界面、组件、样式、布局、表格列表、响应式与暗色主题改动。
- 动手前先加载 skill `ui-standard-constraint`，按其 12 条硬规则执行（配色、圆角、边框嵌套、阴影、响应式、数据列表单行、前后端与文件拆分、Base UI 基础语法）。
- 交互组件一律先用 shadcn MCP 查询与取示例，禁止手写等价组件。
- Base UI 原语组合用 `render={<X />}`（不是 Radix 的 `asChild`）；状态样式用 `data-open`/`data-checked` 等属性（不是 `data-[state=…]`）。
- 交付前必须运行本 skill 的 `scripts/check-ui-rules.mjs --changed`：error 必须清零；warning 需逐条给出保留理由。
- 存量违规用基线机制区分，不要求一次性改造：
  `--write-baseline .ui-baseline.json` 生成后，日常用 `--baseline .ui-baseline.json` 只查新增违规。
- 抑制必须写理由：`// ui-allow R003: 理由`；无理由的抑制按违规处理。
```

## 四、片段 C：团队版（含构建与验收）

在片段 B 基础上追加，`<lint>` / `<build>` 换成项目真实命令：

```markdown
- 构建校验：
  - 若环境设了 `NODE_ENV=production`，包管理器会跳过 devDependencies，需用 `env -u NODE_ENV npm run lint`、`env -u NODE_ENV npm run build`。
- 视觉验收：桌面（1440）与移动（414）× 亮色与暗色，共 4 张截图存入项目既有截图目录，并确认移动端无横向溢出、数据行不换行。
- 交付说明按本 skill 的 `assets/acceptance-checklist.md` 逐条勾选，并附自查脚本输出。
```

## 五、放置建议

- 仓库根已有 `AGENTS.md` 时，追加到其中"前端"相关小节，不要另起新文件。
- 只服务本仓库、不希望影响其它项目时，把片段放进**项目级**规则文件，并把 skill 装到 `<repo>/.dsh/skills/`（项目级优先于用户级，同名覆盖）。
- 团队多人协作时，在片段里保留脚本的相对调用方式（`<skill目录>/scripts/...`），不要写个人机器的绝对路径。
