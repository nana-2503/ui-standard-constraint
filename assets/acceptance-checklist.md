# 前端改动验收清单（ui-standard-constraint）

每次前端改动交付前逐条勾选，并在回复里给出结论（不要只写「已完成」）。

## A. 自动检查（必须全绿）

- [ ] `node "$SKILL/scripts/check-ui-rules.mjs" --changed` 无 **error**；warning 逐条给出保留理由（`$SKILL` = 本 skill 目录）
- [ ] `cd frontend && env -u NODE_ENV npm run lint` 通过
- [ ] `cd frontend && env -u NODE_ENV npm run build` 通过
- [ ] 未新增无理由的 `ui-allow` 抑制注释

## B. 规则覆盖（22 条；括号内为脚本规则号）

- [ ] **1 shadcn 优先**（人工 + MCP）：新交互组件来自 shadcn MCP 查询结果，未手搓等价件；`components/ui/**` 未被业务代码改写
- [ ] **2 无描述性文本**（R007，默认关闭需 `--enable R007`）：没有解释性/宣传性段落；说明信息用标签、状态、层级表达
- [ ] **3 无蓝紫**（R001）：无 indigo/violet/purple/fuchsia 表面色；暗色底为中性灰；`dark:` 下无蓝色主题底
- [ ] **4 非 Claude 风格**（R002）：无米白/奶油底 + 暖橙主色 + serif 标题的组合
- [ ] **5 圆角**（R003）：卡片/容器 ≤ 8px，无 `rounded-2xl/3xl`；`rounded-full` 仅头像/徽标/胶囊
- [ ] **6 无嵌套表面**（R004）：没有卡片套卡片、边框套边框；分组用间距或 `Separator`
- [ ] **7 阴影克制**（R005）：卡片无阴影（或仅 `shadow-sm`）；无彩色/大模糊阴影
- [ ] **8 全局响应式**（R008）：每个布局都定义了移动端形态；`grid-cols-N` 带断点前缀
- [ ] **9 移动端优化**（R008 + 人工）：触控目标 ≥ 44px；无横向溢出；宽表降级为卡片或可横滚容器；底部操作留安全区
- [ ] **10 数据列表不换行**（R006）：表格/列表单元格 `truncate` + `whitespace-nowrap`，超长内容有 `title`/Tooltip
- [ ] **11 拆分**（R009）：单文件 ≤ 250 行（> 400 为 error）；数据访问在 `api.ts`/hooks；前端目录内无后端代码
- [ ] **12 Base UI 基础语法**（R010）：组合用 `render={<X />}` 而非 `asChild`；状态样式用 `data-open`/`data-checked` 等而非 `data-[state=…]`；从 `@base-ui/react/<组件>` 子路径导入；业务层不直接引原语、不引 Radix
- [ ] **13 不写死颜色**（R011）：无 `bg-[#…]`/`text-[rgb(…)]`/内联样式色值；色值只在 token 层（`:root`/`.dark`/`[data-theme]`/`@theme`）；豁免文件（`theme.ts`/`palette.css` 等）之外的例外都有 `ui-allow` 理由
- [ ] **14 状态完备 + 可访问性**（人工）：hover / focus-visible / active / disabled / loading / empty / error / selected 逐一交代；键盘可达、图标按钮有 `aria-label`、错误用 `aria-invalid`+`aria-describedby`；动效 120–200ms 且尊重 `prefers-reduced-motion`
- [ ] **15 安全边界**（R012，error）：`dangerouslySetInnerHTML` 已净化；`target="_blank"` 带 `rel="noopener noreferrer"`
- [ ] **16 首屏体积**（R014）：重依赖（monaco/tiptap/echarts/xterm…）经 `lazy()` 加载，且有 `Suspense` + `ErrorBoundary`
- [ ] **17 渲染正确性**（R013/R018）：列表 key 用稳定 id；数据获取交代 loading / error / empty
- [ ] **18 收口**（R015/R021）：`localStorage` 走统一模块；日期数字格式化集中到 `lib/format`
- [ ] **19 样式边界**（R016）：无 `!important`；未新增全局样式文件；`@layer components` 未增长；内联 `style` 仅动态值
- [ ] **20 层叠与动效**（R017/R020）：无 `z-[数字]`；无 `transition-all`；未动画 width/height/top/left
- [ ] **21 大数据量**（R019，info）：表格/列表 > 200 行已分页或虚拟滚动（info 仅提示，不阻塞交付）
- [ ] **22 测试门槛**（R022）：表格筛选排序、表单提交校验、主题切换、危险操作确认至少各 1 个测试

## C. 视觉核对（截图）

- [ ] 1440 宽 + 414 宽 × 亮色 + 暗色，共 4 张截图核对
- [ ] 移动端无横向滚动条；表格/列表行内容为单行
- [ ] 暗色下正文与次要文本对比度达标
- [ ] 用真实长数据（长路径/长域名/长容器名）验证截断与布局

## D. 产物落点

- [ ] 新色值只落在 `frontend/src/index.css` 的 token 中
- [ ] 自查输出（可选）保存为 `ui-check-report.txt`，未提交进 git
- [ ] 截图放入项目既有截图目录（如 `docs/screenshots/`）

## 交付说明模板

```text
改动：<页面/组件>
规则：R3/R5/R7/R10 已按 skill 执行
自查：check-ui-rules.mjs --changed → 0 error / N warning（理由：…）
构建：lint ✅ build ✅
截图：<路径 4 张>
残留：<未处理的存量问题或例外，无则写「无」>
```
