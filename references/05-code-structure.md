# 05 代码组织与前后端拆分

对应规则 R009（文件拆分）、规则 11。

## 一、目录约定

```
frontend/
├─ src/
│  ├─ app/                     # 路由与页面级装配（保持薄）
│  ├─ components/
│  │  ├─ ui/                   # shadcn 生成原语（不改，除主题 token 外）
│  │  └─ common/               # 跨 feature 复用组件（PageHeader/EmptyState/DataTableShell）
│  ├─ features/<feature>/      # 按业务域切分
│  │  ├─ <Feature>Page.tsx     # 页面：布局 + 组合
│  │  ├─ components/           # 该 feature 私有组件（一个文件一个组件）
│  │  ├─ hooks/                # 该 feature 的 hook
│  │  ├─ api.ts                # 该 feature 的接口调用（只在这里出现 fetch/axios）
│  │  └─ types.ts              # 该 feature 的类型
│  ├─ hooks/                   # 跨 feature hook
│  ├─ lib/
│  │  ├─ api/                  # 统一请求客户端（baseURL、鉴权、错误归一）
│  │  └─ utils.ts              # cn 等纯函数
│  └─ index.css                # 唯一的 token 落点
└─ (后端代码一律不放这里)
```

- 前端只放 `frontend/`，后端仓库同级 `backend/`；**禁止**在 `frontend/` 下出现 `.go/.py` 或 `package main`。
- 禁止 `import` 跨到 `../backend/...`；接口通过 HTTP 客户端访问。

## 二、拆分判据（脚本会查）

| 判据 | 阈值 | 级别 |
|---|---|---|
| 单文件行数 | > 250 warning，> 400 error | R009 |
| `export default` 数量 | > 1 error（`index.ts` 转发文件除外） | R009 |
| 同文件既有 JSX 又有 `fetch(`/`axios.`/`localStorage` | error（数据访问下沉到 `api.ts`/`hooks`） | R009 |
| 单组件 `useState` 数量 | > 8 warning（该拆子组件或 `useReducer`） | R009 |
| 表格/表单列定义 | 抽到同 feature 的 `columns.tsx` / `schema.ts` | 约定 |

```tsx
// ✗ 一个 500 行的 Panel：请求 + 状态 + 表格 + 弹窗 + 表单全在一个文件
export default function DatabaseManagementPanel() {
  const [rows, setRows] = useState([]);
  useEffect(() => { fetch('/api/db').then(...) }, []);
  return <div>…200 行 JSX…</div>;
}

// ✓ 拆开
// features/database/api.ts        -> listDatabases(), createDatabase()
// features/database/hooks/useDatabases.ts -> 数据与加载态
// features/database/columns.tsx   -> 列定义
// features/database/DatabaseTable.tsx -> 展示
// features/database/DatabasePage.tsx  -> 布局与组合
```

## 三、组件写法约定

- 一个文件一个主导出组件；子组件在同目录另开文件，而不是堆在文件底部（除非 < 30 行且只被本文件使用）。
- 页面组件只做「取数据 + 布局 + 组合」，复杂交互封装进子组件。
- Props 显式声明 `type XxxProps = {...}`，不滥用 `any`；`forwardRef` 只在真需要转发时用。
- 副作用收敛到 `hooks/`，组件内不直接写 `localStorage`、`document.cookie`、`window.fetch`。
- 常量与选项（下拉项、表格列、状态映射）抽到 `constants.ts`，不要散落在 JSX 里。

## 四、类型与命名

- 文件：组件 `PascalCase.tsx`，hook `useXxx.ts`，其余 `kebab-case.ts`。
- 类型放 `types.ts` 或就近 `*.types.ts`；跨 feature 复用才提到 `src/types/`。
- 禁止 `React.FC`，直接写函数组件并按需标注返回类型。

## 五、提交前

```bash
cd frontend && npm run lint && npm run build   # 若设了 NODE_ENV=production，前面加 env -u NODE_ENV
node "$SKILL/scripts/check-ui-rules.mjs" --changed
```
