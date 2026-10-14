# 04 数据展示（表格 / 列表 / 长文本）

对应规则 R006（数据列表禁止换行）、规则 2（禁止描述性文本）。

## 一、数据列表必须单行显示（R006）

表格单元格、列表行**不得换行**，用截断 + 悬浮提示承载超长内容：

```tsx
// ✗ 换行 / 撑高行
<TableCell className="whitespace-normal break-words">{path}</TableCell>
<div className="flex flex-wrap items-center gap-2">{items}</div>

// ✓ 单行截断 + title 提示
<TableCell className="max-w-[320px] truncate" title={path}>{path}</TableCell>
<TableHead className="whitespace-nowrap">名称</TableHead>
```

- 脚本在表格区域（`<Table>`…`</Table>`、`TableCell/TableHead/td/th`、`TableRow`）内拦截：`whitespace-normal`、`whitespace-pre-wrap`、`break-words`、`break-all`、`line-clamp-*`、`flex-wrap`，以及单元格内 ≥ 60 字符的 `<p>` 长文本。
- 列宽策略：给关键列 `max-w-[Npx]` 或 `w-[N%]`，配合 `truncate`；容器 `overflow-x-auto`，表格 `min-w-[720px]` 只在桌面区出现。
- 多值字段（标签、IP 列表）在单元格内：只显示前 1–2 个 + `+N`，不要折成两行。
- 操作列固定在行尾（`text-right`），按钮 `size-8` + `gap-1`，不要因按钮而换行。

## 二、长文本处理优先级

1. 表格/列表/键值行 → `truncate` + `title`（或 `Tooltip`）。
2. 详情抽屉/弹窗 → 允许多行，但用 `break-all` 只针对路径/URL（无空格串），普通文本用 `break-words` 仅在详情页内。
3. 代码/路径/域名 → `font-mono text-xs break-all`（仅详情视图）。

## 三、禁止描述性文本（R007，细则待补）

界面元素只表达「是什么 / 什么状态 / 能做什么」，不写解释性段落、宣传语、使用说明。

```tsx
// ✗ 描述性文本
<Card>
  <CardHeader>
    <CardTitle>数据库</CardTitle>
    <CardDescription>
      在这里你可以管理所有数据库实例，支持 MySQL、PostgreSQL 与 Redis，请谨慎操作……
    </CardDescription>
  </CardHeader>
</Card>

// ✓ 结构化信息取代说明文字
<Card>
  <CardHeader className="flex-row items-center justify-between">
    <CardTitle className="text-base">数据库</CardTitle>
    <Badge variant="secondary">3 个实例</Badge>
  </CardHeader>
</Card>
```

允许的非描述性短文本：字段标签、单位、状态词（运行中/已停止）、空状态引导（≤ 1 句 + 1 个操作按钮）、错误提示（可操作、指明原因）、危险确认文案（必须保留）。

`R007` 目前默认关闭（`assets/rules.config.json` 里 `disable`），属**预留规则**：后续补细则时，实现 `checkDescriptiveText()` 并把 `R007` 从 `disable` 移除即可，脚本已留好扩展点。

## 四、空态 / 加载 / 错误

- 空态：图标 + 一句话 + 主操作按钮，居中，不写教程式段落。
- 加载：表格用 `Skeleton` 行（行高等同真实行），不要整页 spinner。
- 错误：`Alert` 或 `text-destructive` 单行 + 重试按钮。
- 状态一律用 `Badge`（`variant` 区分），不要用彩色文字堆叠。
