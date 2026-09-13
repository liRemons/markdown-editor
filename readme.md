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
| previewOptions | PreviewOptions | - | 预览渲染配置，类型继承自 `RenderMarkdownProps` |

### MarkdownEditorRef

| 方法名 | 返回类型 | 说明 |
|--------|----------|------|
| getContent | () => string | 获取当前编辑器内容 |

### PreviewOptions

预览渲染配置，类型继承自 `RenderMarkdownProps`（来自 `remons-render-markdown`），并扩展了 `languages` 字段：

```typescript
import type { RenderMarkdownProps } from 'remons-render-markdown'

export type PreviewOptions = Omit<RenderMarkdownProps, 'content'> & {
  languages?: Record<string, any> | null | undefined
}
```

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| languages | Record<string, any> | - | 自定义代码高亮语言配置 |
| customRenderers | MarkdownPlugin[] | - | 自定义 markdown-it 渲染插件 |
| excludedSelectors | string[] | - | 图片预览排除名单 |
| isSlotMermaid | boolean | - | 是否使用 slot 方式渲染 mermaid |
| isShowCollapsed | boolean | - | 是否显示代码折叠 |
| defaultCollapsed | boolean | - | 默认识否折叠代码 |
| showBackTop | boolean | - | 是否显示返回顶部 |
| isPrintPreview | boolean | - | 是否为打印模式 |
| mermaidDebounce | number | - | Mermaid 渲染防抖延迟（ms） |
| cdn | Record<string, string> | - | 自定义 CDN 配置 |
| chartConfig | (text: string) => string | - | 渲染前文本修改函数 |

更多配置请参考 [remons-render-markdown](https://github.com/liRemons/render-markdown)。

## 使用示例

### 自定义预览配置

```tsx
import { MarkdownEditor } from 'remons-markdown-editor'
import type { PreviewOptions } from 'remons-markdown-editor'
import { languagesCommon } from 'remons-render-markdown'
import 'remons-markdown-editor/style.css'

function App() {
  const previewOptions: PreviewOptions = {
    // 自定义高亮语言（在 languagesCommon 基础上扩展）
    languages: {
      ...languagesCommon,
      // 添加自定义语言配置
    },
    // 自定义 markdown-it 插件，可使用 remons-markdown-plugins 按需导入
    // 参考 https://github.com/liRemons/markdown-plugin
    customRenderers: [
      (md) => md.use(yourCustomPlugin)
    ],
    // 禁用 mermaid slot 渲染
    isSlotMermaid: false,
    // 自定义排除选择器
    excludedSelectors: ['.my-custom-class'],
  }

  return <MarkdownEditor previewOptions={previewOptions} />
}
```

### 自定义容器

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
