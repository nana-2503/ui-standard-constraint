# 06 shadcn 组件：一律走 MCP 查

对应规则 1。**不要凭记忆手写** shadcn 组件的等价实现，也不要臆造 API。

## 一、可用工具

| 目的 | 调用 |
|---|---|
| 项目已配置的 registry | `get_project_registries`（需项目根有 `components.json`；cwd 不对时先 `cd` 到 `frontend/` 再问，或显式传 `registries:["@shadcn"]`） |
| 模糊找组件 | `search_items_in_registries`（query 如 `table`、`dialog`、`combobox`） |
| 列出全部 | `list_items_in_registries`（`types:["ui"]`，`limit`/`offset` 翻页；`@shadcn` 现有 61 个） |
| 看用法示例 | `get_item_examples_from_registries`（query 如 `table-demo`、`dialog example`） |
| 看组件源码/依赖 | `view_items_in_registries`（`["@shadcn/card"]`） |
| 拿安装命令 | `get_add_command_for_items`（`["@shadcn/table"]`） |
| 收尾自查 | `get_audit_checklist` |

## 二、标准动作序列

1. `search_items_in_registries(["@shadcn"], "需要的控件")` 确认有没有现成件。
2. `get_item_examples_from_registries` 拿示例，**照示例的 API 和结构写**，不要改造出私有变体。
3. 项目里没有的组件：`get_add_command_for_items` → 在 `frontend/` 下执行 `npx shadcn@latest add …`，随后确认 `src/components/ui/<name>.tsx` 生成、`components.json` 未被改写坏。
4. 样式定制只加 className，不改 `src/components/ui/**` 内部实现（要改先说明理由并评估全站影响）。

## 三、接入一个项目时的注意点

- 先确认项目根（或 `frontend/`）有 `components.json`；MCP 的 registry 解析依赖它，缺了就先 `npx shadcn@latest init`。
- 确认底层原语：老项目多为 radix，新项目可能是 `@base-ui/react`。两者 API 有差异，按 `view_items_in_registries` 返回的实际源码写，不要照抄网上示例。
- 确认 Tailwind 版本：v3 配置在 `tailwind.config.js` + HSL CSS 变量（本 skill 示例按此写法）；v4 用 `@theme`/`oklch`，token 写法需相应调整，且不要在同一项目混用两套语法。
- `cn()` 通常来自 `@/lib/utils`；变体用 `class-variance-authority`，保持与既有原语一致。
- 组件不存在时不要自造交互件（下拉、弹层、日期选择器），先搜 registry；确实没有再用项目所依赖的原语自己封装并放到 `components/common/`。

## 四、示例

```
search_items_in_registries({ registries:["@shadcn"], query:"data table", types:["ui"] })
get_item_examples_from_registries({ query:"table-demo", registries:["@shadcn"] })
get_add_command_for_items({ items:["@shadcn/table", "@shadcn/badge"] })
```

生成后跑一次 `check-ui-rules.mjs --changed`，新组件若带 `rounded-xl`/`shadow-lg` 需按 §例外说明（shadcn 原语默认不扫描，调用处样式要按本 skill 收敛）。
