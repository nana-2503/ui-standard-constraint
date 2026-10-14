# 02 布局与表面（圆角 / 边框 / 嵌套 / 阴影 / 间距）

对应规则 R003（圆角）、R004（嵌套表面）、R005（阴影）。

## 一、圆角尺度（R003）

| 元素 | 允许 | 禁止 |
|---|---|---|
| 卡片 / 面板 / 对话框 / 抽屉 / 容器 | `rounded-md`(6px)、`rounded-lg`(8px) | `rounded-xl`(12px) 及以上、`rounded-[16px+]` |
| 输入框 / 按钮 / 下拉项 | `rounded-md`、`rounded-lg` | `rounded-2xl`+ |
| 头像 / 徽标 / 胶囊按钮 / 开关 | `rounded-full` | — |
| 表格容器 / 分区 | `rounded-md` | 大圆角描边面板 |

```tsx
// ✗ 大角度卡片
<Card className="rounded-3xl border shadow-xl">

// ✓ 克制圆角，靠边框分区
<Card className="rounded-lg border shadow-none">
```

- 不要用 CSS 直写大圆角：`.panel { border-radius: 18px }` 与 `--ac-radius-card: 18px` 都会被拦（阈值见 `assets/rules.config.json`，默认卡片 ≤ 8px、任意元素 ≤ 16px）。
- 圆角要**全站一致**：同一层级只能用一档，不要一处 6px 一处 12px。

## 二、禁止无目的嵌套（R004）

判定：外层是「有边框 + 有背景」的容器时，内层**再**出现一个有边框的容器（且不是交互层），即报 warning。

```tsx
// ✗ 卡片套卡片、边框套边框
<Card className="border bg-card">
  <div className="rounded-lg border bg-card p-4">
    <div className="rounded-md border p-3">…</div>
  </div>
</Card>

// ✓ 用一层分区 + 间距/分隔线，而不是层层描边
<Card className="border bg-card">
  <CardHeader className="pb-3">…</CardHeader>
  <Separator />
  <CardContent className="pt-4 space-y-4">…</CardContent>
</Card>
```

- 内层分组优先用 `bg-muted/50` 或 `Separator`，而不是再加边框。
- 以下**不算**违规嵌套（合法层次）：`Dialog/Sheet/Popover/DropdownMenu/Select/Command/Tooltip` 等浮层内容、`Table`、`Input/Textarea/Switch/Checkbox` 等表单控件、`Alert`、`Badge`、`Button`。
- 卡片内需要分区时问自己：去掉边框还能不能看懂？能，就不要边框。

## 三、阴影克制（R005）

- 默认：**无阴影**，用 `border` 与背景色差表达层级。
- 允许：`shadow-sm`（浮层、下拉、tooltip、popover、sticky 头部）。
- 禁止：`shadow-lg/xl/2xl`、彩色阴影（`shadow-indigo-500/40`）、`drop-shadow-lg+`、大模糊自定义阴影（blur ≥ 16px 或多层叠加）。
- `shadow-md` 会报 warning，只用于真正悬浮于内容之上的元素。

```tsx
// ✗ 卡片堆阴影
<div className="rounded-2xl shadow-2xl">…</div>

// ✓
<Card className="border shadow-sm">…</Card>
```

## 四、间距与对齐

- 八点栅格：`gap/p/m` 只用 2/3/4/6/8/12 这类步进，禁止 `p-[13px]` 之类的魔法值。
- 页面容器：`p-4 sm:p-6`；卡片内：`p-4`（紧凑）/ `p-6`（常规），同一屏内不要混三档。
- 表单行间距统一 `space-y-4`；`Label` 与控件 `space-y-2`。
- 数字、ID、路径等定宽内容用 `tabular-nums`；工具栏按钮组用 `gap-1` + `size-8`/`size-9`。

## 五、层级（z-index）

只用语义层级，禁止 `z-[9999]`：下拉/悬浮卡 `z-20`，sticky 头 `z-30`，抽屉/弹层 `z-50`（shadcn 默认），toast 用 Sonner 默认值。
