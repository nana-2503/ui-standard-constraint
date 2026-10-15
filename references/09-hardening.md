# 09 工程硬化：安全、体积、正确性、边界

对应**规则 15–22**，脚本规则 **R012–R022**。除 R012（XSS）为 error 外，其余**默认 warn/info 上线**——这些规则的误报率天然高于表现层规则，先观察再收紧。

## 规则 15 · 安全边界（R012，error）

- **`dangerouslySetInnerHTML` 必须配净化**：同一文件内必须先经 `DOMPurify.sanitize()` 或项目 sanitize 模块，不允许把后端/用户内容直接注入。若内容确实由下游模块保证安全，用 `// ui-allow R012: 理由` 标注来源。
- **`target="_blank"` 必须带 `rel="noopener noreferrer"`**：否则新页面可通过 `window.opener` 反向控制当前页（反向标签劫持）。脚本会向后多看 2 行，跨行写法不会被误报。

```tsx
// ✗
<div dangerouslySetInnerHTML={{ __html: article.content }} />
<a href={url} target="_blank">原文</a>

// ✓
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
<a href={url} target="_blank" rel="noopener noreferrer">原文</a>
```

## 规则 16 · 首屏体积与懒加载（R014，warn）

重型依赖（`monaco-editor`、`@tiptap/*`、`echarts`、`recharts`、`xterm`、`three`、`pdfjs-dist`、`mermaid`、`@codemirror/*` 等）**不得静态 import 进主包**：

```tsx
// ✗ 编辑器/图表进主 chunk，首屏白给几百 KB
import Editor from "@monaco-editor/react";

// ✓ 路由级或组件级懒加载 + 兜底
const Editor = lazy(() => import("@monaco-editor/react"));

<Suspense fallback={<EditorSkeleton />}>
  <ErrorBoundary fallback={<EditorFailed />}>
    <Editor />
  </ErrorBoundary>
</Suspense>
```

- 用到 `lazy()` 的文件必须能追溯到 `Suspense` 与 `ErrorBoundary`：chunk 加载失败（版本发布、网络抖动）否则直接白屏。
- 判断口径："这个依赖的 gzip 体积 > 50KB 吗？只在某个页面用吗？"两个都是"是"，就必须懒加载。

## 规则 17 · 列表与渲染正确性（R013 + R018，warn）

**不要用索引当 key**：

```tsx
// ✗ 排序/筛选/删除后，输入框内容会串到别的行
{rows.map((row, index) => <Row key={index} />)}

// ✓ 用业务 id
{rows.map((row) => <Row key={row.id} />)}
```

静态常量数组（不会重排）可 `// ui-allow R013: 静态常量列表`。

**数据获取必须交代三态**：loading、error、empty 缺一不可，团队里最常缺的是 empty。

```tsx
if (isLoading) return <TableSkeleton rows={5} />;
if (error) return <ErrorState message={error.message} onRetry={refetch} />;
if (!rows.length) return <EmptyState title="还没有数据" action={<Button>新建</Button>} />;
```

## 规则 18 · 存储与格式化收口（R015 + R021，warn）

- `localStorage` / `sessionStorage` 直接访问要收口到统一模块（类型化 key、版本号、`try/catch` 兜底、必要时跨标签同步）。原因：隐私模式下会抛异常、配额会满、key 会写乱。
- 日期/数字格式化（`toLocaleString` / `toLocaleDateString` / `new Intl.*`）集中到 `lib/format.ts`，统一 locale、时区与精度；散落各处早晚出现"同一个时间两种显示"。

## 规则 19 · 样式边界（R016，warn）

- 禁 `!important`：出现即说明选择器在打架，应该调层叠顺序而不是加权重。
- 全局样式文件只允许 token 文件（`index.css` / `globals.css` / `theme-*.css`）；组件级样式用 `.module.css`。
- `@layer components` 中的自定义类**只减不增**：新样式用 Tailwind 工具类 + token。
- 内联 `style` 只留给**动态计算值**（宽度百分比、动画进度、拖拽坐标）：

```tsx
// ✗ 静态值写内联
<div style={{ paddingTop: 8, contentVisibility: "visible" }} />

// ✓ 静态值用 class，动态值才内联
<div className="pt-2 [content-visibility:visible]" />
<div style={{ width: `${progress}%` }} />
```

## 规则 20 · 层叠与动效纪律（R017 + R020，warn）

- 禁 `z-[999]` 这类任意层级，用语义档位：下拉/浮层 `z-20`、sticky 头 `z-30`、抽屉/模态 `z-50`（Base UI/shadcn 默认），需要更高时用统一的 token 档位表。
- 禁 `transition-all`（会动画所有属性，包括引起重排的）；只列需要的属性：`transition-colors`、`transition-transform`、`transition-opacity`。
- 禁动画 `width/height/top/left/margin/padding`，改用 `transform` / `opacity`（可配 `will-change-transform`）。
- 时长 120–200ms、`ease-out`；同屏同时动画元素 ≤ 3；必须尊重 `prefers-reduced-motion`。

## 规则 21 · 大数据量渲染（R019，info）

表格/列表一次性 `map` 全量数据、且看不到分页或虚拟化线索时给**提示级**输出——因为静态无法判断真实行数。

- 判断标准：**超过 200 行**必须分页或虚拟滚动（`@tanstack/react-virtual`、`react-window`）；或服务端分页（`page/pageSize/total`）。
- 这条不参与 `--strict` 失败判定；上线后按实际情况决定是否升级为 warn。

## 规则 22 · 测试门槛（R022，warn）

前端全仓没有任何 `*.test.* / *.spec.*` 时提示一次。要求的最低门槛是**关键路径各 1 个测试**：

- 表格筛选/排序/分页的行为；
- 表单提交与校验失败；
- 主题（亮/暗）切换后关键样式；
- 危险操作的二次确认。

有测试基建才谈覆盖率，没有测试时先补关键路径。

## 上线纪律

这 11 条规则的误报率天然高于表现层规则，因此：

1. 新规则先以 `warn` / `info` 上线，跑一次 `--write-baseline` 固化存量；
2. 观察 1–2 周，把确有误报的单独降级或 `--disable`，不要因为个别误报就整体关掉；
3. 团队形成肌肉记忆后再挑稳定规则升 `error`（例如 R012 已经是 error）。
4. 一条规则只要 10% 是假错，剩下 90% 的真错也没人看——**精度比覆盖面重要**。
