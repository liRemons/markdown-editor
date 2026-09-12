# remons-markdown-editor

基于 React 的 Markdown 编辑器组件，支持工具栏编辑、实时预览、同步滚动和自定义容器等功能。

## 安装

```bash
npm install remons-markdown-editor
```

## 基本用法

```tsx
import { MarkdownEditor } from 'remons-markdown-editor'
import 'remons-markdown-editor/style.css'

export default function App() {
  return <MarkdownEditor />
}
```

## API

### MarkdownEditorProps

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| value | string | - | 受控模式下的内容 |
| defaultValue | string | '' | 非受控模式下的初始内容 |
| onChange | (value: string) => void | - | 内容变更回调 |
| showPreview | boolean | true | 是否显示预览面板 |
| fullscreen | boolean | false | 是否显示全屏按钮 |

### MarkdownEditorRef

| 方法名 | 返回类型 | 说明 |
|--------|----------|------|
| getContent | () => string | 获取当前编辑器内容 |

## 自定义容器

通过 `useRegisterToolbar` hook 注册自定义容器组件，支持单个或批量注册：

```tsx
import { MarkdownEditor, useRegisterToolbar } from 'remons-markdown-editor'
import 'remons-markdown-editor/style.css'

const schema = {
  name: 'alert',
  label: '警告框',
  icon: <AlertOutlined />,
  fields: [{ key: 'level', defaultValue: 'info' }],
  renderDialog: (props, onChange) => (
    <div>
      <input
        value={props.level}
        onChange={e => onChange('level', e.target.value)}
      />
    </div>
  ),
}

export default function App() {
  // 单个注册
  useRegisterToolbar(schema)
  return <MarkdownEditor />
}
```

### 批量注册

```tsx
export default function App() {
  useRegisterToolbar([schema1, schema2, schema3])
  return <MarkdownEditor />
}
```

### ComponentSchema

| 属性名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 容器名称，对应 :::name 语法 |
| label | string | 是 | 工具栏按钮显示的标签 |
| icon | ReactNode | 否 | 工具栏按钮显示的图标，默认使用 ReadOutlined |
| fields | DialogField[] | 是 | 弹窗属性字段配置 |
| renderDialog | Function | 是 | 弹窗内容渲染函数，接收当前属性值和变更回调 |

## 依赖

此包需要 React 18 或 19 作为 peer dependency。
