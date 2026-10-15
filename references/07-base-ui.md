# 07 Base UI 基础语法

对应**规则 12**，脚本规则 **R010**。

项目原语层是 `@base-ui/react`（**不是 Radix**）。Radix 的写法在这里一律不成立：轻则样式不生效，重则 prop 被透传到 DOM 并报 React 警告、组合彻底失效。以下 API 依据 `@base-ui/react` 实际类型定义（`use-render`、`merge-props`、`dialog/index.d.ts`、`internals/stateAttributesMapping.d.ts`）与项目内既有封装写法。

## 一、导入方式：走子路径

```tsx
// ✓ 按组件子路径导入，每个组件独立入口
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import * as MenuPrimitive from "@base-ui/react/menu"
import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"

// ✗ 根 barrel：会把全部组件拉进来
import { Dialog } from "@base-ui/react"
```

可用的子路径以包 `exports` 为准，常见的有：`accordion`、`alert-dialog`、`autocomplete`、`avatar`、`button`、`checkbox`、`checkbox-group`、`collapsible`、`combobox`、`context-menu`、`dialog`、`drawer`、`field`、`fieldset`、`form`、`input`、`menu`、`menubar`、`meter`、`navigation-menu`、`number-field`、`otp-field`、`popover`、`preview-card`、`progress`、`radio`、`radio-group`、`scroll-area`、`select`、`separator`、`slider`、`switch`、`tabs`、`toast`、`toggle`、`toggle-group`、`toolbar`、`tooltip`，以及 `use-render`、`merge-props`。

## 二、组合用 `render`，不是 `asChild`

Base UI 的每个部件都接受 `render`：

```tsx
// render 传元素
<DialogPrimitive.Trigger render={<Link to="/new" />}>新建</DialogPrimitive.Trigger>

// render 传函数：(props, state) => ReactElement
<MenuPrimitive.Item
  render={(props, state) => (
    <li {...props} data-current={state.selected ? "" : undefined}>
      {state.selected ? "✓" : null}
      {label}
    </li>
  )}
/>
```

- `render` 的第二参 `state` 是组件内部状态，`state` 里的字段会**自动转成 `data-*` 属性**（也可用 `stateAttributesMapping` 自定义映射）。
- **不要给 Base UI 原生部件传 `asChild`**：它没有这个 prop，会被透传到 DOM，且"替换元素"的意图不会生效——这是最容易被 Radix 习惯带进来的坑。
- 项目的 `src/components/ui/**` 里若存在 `asChild`，那是**项目自己的兼容层**（内部把 `asChild` 转成 `useRender({ render })`），只用于兼容旧代码；**新代码直接用 `render`**。

## 三、自定义组件：`useRender` + `mergeProps`

封装一个自己的组件（转发样式、ref、事件）时用 `useRender`，不要手写 `cloneElement`：

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, render, ...props }, ref) =>
    useRender({
      defaultTagName: "button",          // 默认渲染成什么标签
      render,                            // 透出，让调用方可用 render 替换元素
      ref,
      props: { ...props, className: cn(buttonVariants({ variant, size, className })), children },
    }),
)
```

合并多组 props 用 `mergeProps`，它的语义与 `Object.assign` 不同：

- `className` 按**右到左**拼接；`style` 合并，右侧覆盖左侧。
- 事件处理器**从右到左依次调用**（最右侧的先执行）；右侧可用 `event.preventBaseUIHandler()` 阻止左侧处理器执行。
- 其余字段遵循右侧覆盖左侧。

## 四、状态样式：`data-*` 属性，不是 `data-[state=…]`

Base UI 不产出 `data-state`，而是每个状态一个独立属性。可用的（均为包内真实属性名）：

| 类别 | 属性 |
|---|---|
| 开合 | `data-open`、`data-closed`、`data-popup-open` |
| 选中 | `data-checked`、`data-unchecked`、`data-pressed`、`data-highlighted` |
| 表单 | `data-valid`、`data-invalid`、`data-touched`、`data-dirty`、`data-filled`、`data-required`、`data-readonly`、`data-focused`、`data-disabled` |
| 浮层 | `data-side`、`data-align`、`data-anchor-hidden`、`data-uncentered`、`data-instant`、`data-activation-direction` |
| 过渡 | `data-starting-style`、`data-ending-style` |
| 其它 | `data-orientation` |

```tsx
// ✗ Radix 习惯，Base UI 下永远不匹配
"data-[state=open]:bg-accent"

// ✓
"data-[open]:bg-accent"
"data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
```

Tailwind v3 用 arbitrary variant `data-[open]:`；v4 有内建 `data-open:` 变体。过渡动画用 `data-starting-style` / `data-ending-style`，不要自己猜 `data-[state=closed]`。

## 五、结构：用部件的 part 组合

每个组件由若干 part 组成，直接用，不要重造。以 Dialog 为例（`dialog/index.d.ts` 实际导出）：

`Root`、`Trigger`、`Portal`、`Popup`、`Backdrop`、`Title`、`Description`、`Close`、`Viewport`。

- 浮层一律经 `Portal` 渲染；项目若统一了 portal 容器（如页面级容器 hook），**所有封装都要走它**，不要各自 `createPortal`。
- 定位/背板/弹层各司其职：`Backdrop` 是遮罩，`Popup` 是内容，别用普通 `div` 手搓。
- 受控/非受控：`open` / `defaultOpen` / `onOpenChange`，`value` / `defaultValue` / `onValueChange`，与组件签名一致。

## 六、分层：业务代码不直接碰原语

- 业务代码（`src/features/**`、页面）**只 import `src/components/ui/**` 的封装组件**，不直接 `import "@base-ui/react/…"`，这样样式、portal 容器与可访问性才统一。
- 需要新原语时，先在 `src/components/ui/` 包一层（遵循既有封装风格），再在业务里用。
- 样式定制只加 `className`，不改封装内部实现；要改先评估全站影响。

## 七、脚本会拦什么（R010）

| 触发 | 级别 | 含义 |
|---|---|---|
| `import … from "@radix-ui/…"` | error | Base UI 项目引入 Radix，两套原语并存必然错乱 |
| `<XxxPrimitive.Yyy asChild>` | error | Base UI 原生部件不支持 `asChild`，组合会静默失效 |
| 业务层直接 `import "@base-ui/react/…"` | warn | 绕过封装层 |
| `from "@base-ui/react"`（根 barrel） | warn | 应走子路径 |
| `data-[state=…]` | warn | Radix 习惯，Base UI 产出的是 `data-open` 等 |
| 业务代码里的 `asChild` | warn | 兼容层可用，但新代码应写 `render={<X />}` |

若项目本来就用 Radix，把 `assets/rules.config.json` 的 `baseUi` 设为 `false` 可关掉这一整类检查。
