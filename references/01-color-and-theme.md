# 01 配色与主题

对应规则 R001（禁蓝紫暗色）、R002（禁 Claude 风格）。

## 一、颜色只能来自 token

Tailwind 配置里的语义色（`background/card/popover/primary/secondary/muted/accent/destructive/border/input/ring/sidebar-*`）来自 `src/index.css` 的 CSS 变量。**组件里禁止出现裸色值**：

```tsx
// ✗ 禁止
<div className="bg-white dark:bg-[#0b0f19] border-[#1f2937] text-slate-200">
<div style={{ background: "#faf9f5" }}>

// ✓ 正确
<div className="bg-card text-card-foreground border">
```

新增颜色必须先加 token：

```css
:root            { --primary: 160 84% 39%; }   /* 只在这里出现色值 */
:root.dark       { --primary: 158 64% 45%; }
```

## 二、禁止蓝紫（R001）

- 类名层面禁用：`indigo-*`、`violet-*`、`purple-*`、`fuchsia-*`（任何色阶、任何前缀，`bg-/text-/border-/ring-/from-/to-/via-/shadow-`）。
- `dark:` 前缀下额外禁用 `blue-*`（浅蓝在亮色主题作弱信息色可接受，暗色下容易变成蓝紫底）。
- token 层面：暗色作用域（`:root.dark`、`.dark`、`prefers-color-scheme: dark`）里，色相落在 **220°–320°** 且饱和度 **≥ 25%** 的声明会被拦下——包括 `--primary/--accent/--ring/--sidebar-*/--background/--card`。
- 渐变：禁止 `from-indigo-500 to-purple-600` 这类蓝紫渐变，以及任何暗色下的彩色光晕渐变。

```tsx
// ✗ 典型的违规暗色方案
:root.dark { --background: 250 30% 9%; --primary: 258 90% 66%; }
<div className="dark:bg-blue-950 dark:text-violet-300 shadow-indigo-500/40">

// ✓ 中性暗色底 + 单一非蓝紫强调色
:root.dark { --background: 240 5% 8%; --card: 240 5% 10%; --border: 240 5% 18%; --primary: 160 84% 39%; }
```

### 允许的强调色池

| 用途 | 色相示例（HSL） |
|---|---|
| 品牌/主操作 | `160 84% 39%`（emerald）、`173 80% 36%`（teal）、`346 77% 50%`（rose） |
| 中性层 | `240 5% 8/10/14/18%`（zinc 中性灰，饱和度 ≤ 10%） |
| 语义 | 成功 `142 71% 45%`、警告 `32 95% 44%`、危险 `0 72% 51%` |

警告用的暖橙**只能**出现在语义状态（告警、失败提示）上，不能成为品牌主色——否则与 Claude 风格撞车（见下）。

## 三、禁止 Claude 风格（R002）

判定是**组合特征**，脚本在同一个文件里同时命中 ≥2 条即报 error：

1. **米白/奶油底**：`bg-stone-50/100`、`bg-amber-50`、`bg-orange-50`、`#faf9f5`、`#f5f4ef`、`#fffbf5`，或暗色外用暖色相（30°–70°）低饱和高亮度的 `--background/--card`。
2. **暖橙 terracotta accent**：`#d97757`、`#c96442`、`#da7756`、`text-orange-700`、`bg-orange-600` 作为主按钮/链接色；或 `--primary/--accent/--ring` 落在色相 15°–40°、饱和 45%–80%。
3. **复古 serif 标题**：`font-serif` 用在 `h1/h2/h3` 或标题容器；`font-family` 里出现 `Georgia`、`Times New Roman`、`Playfair`、`Lora`、`Merriweather`、`Tiempos`。

```tsx
// ✗ 一眼 Claude：米白底 + 暖橙按钮 + serif 大标题
<div className="bg-[#faf9f5]">
  <h1 className="font-serif text-4xl">MyApp</h1>
  <button className="bg-[#d97757] text-white">Get started</button>
</div>

// ✓ 中性底 + 语义主色 + 无衬线层级
<div className="bg-background">
  <h1 className="text-2xl font-semibold tracking-tight">MyApp</h1>
  <Button>开始使用</Button>
</div>
```

## 四、亮/暗两套都必须可读

- 任何新页面都要在 `class="dark"` 下过一遍；不要用 `dark:` 硬编码色值绕过 token。
- 文本对比度：正文 ≥ 4.5:1，次要文本 ≥ 3:1；`text-muted-foreground` 只用于辅助信息，不用于关键数值。
- 多主题（若项目支持 `data-theme="…"` 切换强调色）：只覆盖 `--primary/--ring/--accent/--secondary`，不要覆盖 `--background/--card`，否则暗色中性底会被主题污染。
