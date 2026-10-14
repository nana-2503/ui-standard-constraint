# 03 响应式与移动端

对应规则 R008（全局响应式）、规则 9（移动端额外优化）。

## 一、写布局的顺序：移动优先

先写移动端（无前缀 = 最小屏），再用断点加宽：

```tsx
// ✗ 桌面写死，移动端必然溢出
<div className="grid grid-cols-4 gap-4">
<div className="w-[520px]">

// ✓ 移动单列 → 逐级加宽
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
<div className="w-full max-w-[520px]">
```

- `grid-cols-N`（N ≥ 2）**必须**带断点前缀，脚本按 R008 报 warning。
- 固定像素宽度 `w-[Npx]` / `min-w-[Npx]` 只要 N > 360 且无断点前缀，报 error。
- 断点约定：`sm 640`（大屏手机/小平板）、`md 768`（平板）、`lg 1024`（桌面）、`xl 1280`（宽屏）。不要在业务组件里另造断点。

## 二、移动端必须额外优化（不是缩水）

1. **触控目标 ≥ 44×44px**：图标按钮用 `size-9`（36px）+ 外层可点区域，或直接 `size-11`；紧凑工具栏允许 `size-8`，但间距 `gap-1` 保证不误触。
2. **无横向溢出**：`body` 不得横向滚动。宽表格放进 `overflow-x-auto` 容器；不要用 `overflow-x-hidden` 把问题藏起来。
3. **导航形态切换**：侧边栏在 `< lg` 收起为 `Sheet`/抽屉，不要硬挤成窄条；页面主操作在移动端放底部固定条（`sticky bottom-0` + `pb-[env(safe-area-inset-bottom)]`）。
4. **表格 → 卡片**：列数 > 4 或含长文本时，移动端改成 `space-y-3` 的堆叠行（每行 `键: 值` 或首行标题 + 次行元信息），而不是横向滚 5 屏。
5. **弹窗**：移动端用 `Sheet`（底部）或全屏 `Dialog`，禁止窄屏下弹小尺寸居中框。
6. **安全区与键盘**：底部操作区留 `env(safe-area-inset-*)`；输入框聚焦时不要被固定底栏遮挡。
7. **文案与数量**：移动端少显示列/字段（`hidden sm:table-cell` 只用于次要信息），关键操作不隐藏。
8. **字号**：正文 ≥ 14px（`text-sm`），不要用 `text-xs` 承载主要信息。

## 三、验收方式

- 414×896（移动）与 1440×900（桌面）各截一次，亮/暗两套，共 4 张；确认无横向滚动条、无文字截断错位、无遮挡。
- 用真实长数据（长文件路径、长域名、超长容器名）过一遍，而不是 `test` 之类的短样本。
- 表格/列表页重点看：分页控件在移动端是否换行、行内操作按钮是否被挤出屏幕。

```tsx
// ✓ 表格在移动端降级为卡片
<div className="hidden md:block overflow-x-auto">
  <Table>…</Table>
</div>
<div className="md:hidden space-y-3">
  {rows.map((r) => (
    <Card key={r.id} className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{r.name}</span>
        <Badge variant="secondary">{r.status}</Badge>
      </div>
      <div className="mt-1 text-sm text-muted-foreground truncate">{r.detail}</div>
    </Card>
  ))}
</div>
```
