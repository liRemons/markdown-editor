# remons-markdown-editor

基于 React 的 Markdown 编辑器组件，支持工具栏编辑、实时预览、同步滚动和自定义容器等功能。

## 安装

```bash
npm install remons-markdown-editor
```

## 基本用法

入口已自动携带组件样式，无需手动导入 CSS；若使用打包器的 sideEffects 裁剪，也可显式引入 `remons-markdown-editor/style.css`。

```tsx
import { MarkdownEditor } from 'remons-markdown-editor'

export default function App() {
  return <MarkdownEditor />
}
```

## API

### MarkdownEditorProps

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| value | string | - | 受控模式下的内容（需配合 onChange 使用） |
| defaultValue | string | '' | 非受控模式下的初始内容 |
| onChange | (value: string) => void | - | 内容变更回调 |
| showPreview | boolean | true | 是否显示预览面板 |
| fullscreen | boolean | true | 是否显示全屏按钮 |
| previewOptions | PreviewOptions | - | 预览渲染配置，类型继承自 `RenderMarkdownProps` |
| languages | Record<string, any> \| null | - | 代码高亮语言包（与内置 languagesCommon 合并注册） |
| uploadConfig | ImageUploadConfig | - | 图片上传配置 |
| schemas | ComponentSchema[] | - | 局部注册的容器 schema，仅对当前实例生效，同名时覆盖全局注册 |
| onNotify | (type, content) => void | - | 提示注入点，缺省使用 antd App 上下文的 message |

> 同页面存在多个编辑器实例时，推荐用 `schemas` 局部注册代替 `useRegisterToolbar`，避免全局注册表互相覆盖。

### MarkdownEditorRef

| 方法名 | 返回类型 | 说明 |
|--------|----------|------|
| getContent | () => string | 获取当前编辑器内容 |

### PreviewOptions

预览渲染配置，类型即 `Omit<RenderMarkdownProps, 'content'>`（来自 `remons-render-markdown` v2）：

```typescript
import type { RenderMarkdownProps } from 'remons-render-markdown'

export type PreviewOptions = Omit<RenderMarkdownProps, 'content'>
```

常用字段（v2 重命名后的新名，旧名仍可用但已废弃）：

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| customRenderers | MarkdownPlugin[] | - | 自定义 markdown-it 渲染插件 |
| excludedSelectors | string[] | - | 图片预览排除名单（实例级） |
| enableMermaid | boolean | - | 是否将 mermaid 代码块渲染为图表（旧名 isSlotMermaid） |
| showCollapseButton | boolean | - | 是否显示代码折叠按钮（旧名 isShowCollapsed） |
| defaultCollapsed | boolean | - | 代码块默认是否折叠 |
| showBackTop | boolean | - | 是否显示返回顶部 |
| showToc | boolean | - | 是否显示目录（TOC） |
| incremental | boolean | - | 是否启用增量渲染（旧名 useIncremental） |
| isPrintPreview | boolean | - | 是否为打印模式 |
| toolbarDebounceMs | number | - | 工具栏/mermaid 扫描防抖延迟（旧名 mermaidDebounce） |
| cdn | Record<string, string> | - | 自定义 CDN 配置 |
| transformSource | (text: string) => string | - | 渲染前改写 mermaid 源码（旧名 chartConfig） |
| html | boolean | true | 是否渲染源码中的原生 HTML |
| validateLink | (url: string) => boolean | - | 覆盖链接校验 |

更多配置请参考 [remons-render-markdown](https://github.com/liRemons/render-markdown)。

### ImageUploadConfig

图片上传配置：

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| uploadUrl | string | - | 图片上传接口地址（需与 onUploadImage 二选一） |
| onUploadImage | (file: File) => Promise<string \| null> | - | 自定义图片上传函数（优先级高于 uploadUrl） |
| onGetUploadUrl | (result: any) => string \| null | - | 处理服务器返回结果的回调，用于自定义 URL 提取逻辑 |

## 使用示例

### 自定义预览配置

```tsx
import { MarkdownEditor } from 'remons-markdown-editor'
import type { PreviewOptions } from 'remons-markdown-editor'
import { languagesCommon } from 'remons-render-markdown'

function App() {
  const previewOptions: PreviewOptions = {
    // 自定义 markdown-it 插件，可使用 remons-markdown-plugins 按需导入
    // 参考 https://github.com/liRemons/markdown-plugin
    customRenderers: [
      (md) => md.use(yourCustomPlugin)
    ],
    // 禁用 mermaid 图表渲染
    enableMermaid: false,
    // 自定义排除选择器
    excludedSelectors: ['.my-custom-class'],
  }

  // 高亮语言包通过独立的 languages prop 传入（在 languagesCommon 基础上扩展）
  return <MarkdownEditor previewOptions={previewOptions} languages={{ ...languagesCommon }} />
}
```

### 自定义图片上传

```tsx
import { MarkdownEditor } from 'remons-markdown-editor'
import type { ImageUploadConfig } from 'remons-markdown-editor'
import 'remons-markdown-editor/style.css'

function App() {
  // 方式一：配置上传地址
  const uploadConfig: ImageUploadConfig = {
    uploadUrl: 'https://your-api.com/upload/image'
  }
  return <MarkdownEditor uploadConfig={uploadConfig} />

  // 方式二：自定义上传函数（完全接管上传逻辑）
  const customUpload: ImageUploadConfig = {
    onUploadImage: async (file) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer your-token'
        }
      })

      const result = await response.json()
      // 返回图片 URL，失败返回 null
      return result.url || null
    }
  }
  return <MarkdownEditor uploadConfig={customUpload} />

  // 方式三：自定义 URL 提取逻辑（服务器返回相对路径时）
  const uploadWithTransform: ImageUploadConfig = {
    uploadUrl: 'https://your-api.com/upload/image',
    onGetUploadUrl: (result) => {
      const path = result.data?.path
      // 如果返回的是相对路径，拼接为完整 URL
      if (path && path.startsWith('/')) {
        return `https://your-api.com${path}`
      }
      return path || null
    }
  }
  return <MarkdownEditor uploadConfig={uploadWithTransform} />
}
```

`uploadUrl` 或 `onUploadImage` 至少需要配置一个；未配置时图片上传按钮仍可点击，点击后会提示先配置图片上传功能。

- **uploadUrl**：配置后，编辑器会使用 `FormData` 格式发送 `POST` 请求，`file` 字段为图片文件。接口返回的 `data.path` 将作为图片地址。
- **onUploadImage**：自定义上传函数，完全接管上传逻辑。接收 `File` 对象，返回 `Promise<string | null>`，返回的图片 URL 会直接插入到编辑器中。
- **onGetUploadUrl**：处理服务器返回结果的回调，用于自定义 URL 提取逻辑。当服务器返回的数据格式与默认格式不一致时，可通过此回调提取和转换 URL。

### 自定义容器

支持两种注册模式：

#### 自动表单模式（推荐）

如果字段的 `componentType` 已配置，弹窗会自动生成对应表单，无需手动编写 `renderDialog`：

```tsx
import { MarkdownEditor, useRegisterToolbar } from 'remons-markdown-editor'
import { AlertOutlined } from '@ant-design/icons'
import 'remons-markdown-editor/style.css'

const schema = {
  name: 'alert',
  label: '警告框',
  icon: <AlertOutlined />,
  fields: [
    { key: 'type', name: '类型', componentType: 'select', defaultValue: 'info',
      componentProps: { options: [
        { label: '信息', value: 'info' },
        { label: '成功', value: 'success' },
        { label: '警告', value: 'warning' },
        { label: '错误', value: 'error' },
      ]} },
    { key: 'content', name: '内容', componentType: 'textarea', defaultValue: '',
      componentProps: { rows: 3 } },
    { key: 'enabled', name: '启用', componentType: 'switch', defaultValue: true },
  ],
}

export default function App() {
  useRegisterToolbar(schema)
  return <MarkdownEditor />
}
```

支持的 componentType：
- `input` - 文本输入框
- `textarea` - 多行文本框
- `number` - 数字输入框
- `select` - 下拉选择（需配置 `componentProps.options`）
- `switch` - 开关
- `slider` - 滑块
- `rate` - 评分
- `color` - 颜色选择器
- `date` - 日期选择
- `dateRange` - 日期范围选择

#### 容器模式（自定义渲染）

插入 `:::name` 格式的容器，支持弹窗编辑属性。需要手动编写 `renderDialog` 自定义渲染弹窗内容：

```tsx
import { MarkdownEditor, useRegisterToolbar } from 'remons-markdown-editor'
import 'remons-markdown-editor/style.css'

const schema = {
  name: 'alert',
  label: '警告框',
  icon: <AlertOutlined />,
  fields: [{ key: 'level', defaultValue: 'info' }],
  renderDialog: ({ props, onChange }) => (
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

#### 标签包裹模式

插入简单的标签包裹文本，如 `<plugin-container>...</plugin-container>`，适合不需要弹窗编辑的场景：

```tsx
import { MarkdownEditor, useRegisterToolbar } from 'remons-markdown-editor'
import 'remons-markdown-editor/style.css'

export default function App() {
  useRegisterToolbar({
    name: 'plugin-container',
    label: '自定义容器',
    icon: <AlertOutlined />,
    wrapTags: ['<plugin-container>', '</plugin-container>'],
  })
  return <MarkdownEditor />
}
```

点击对应按钮会自动切换（添加/移除）标签包裹。

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
| name | string | 是 | 容器/组件名称 |
| label | string | 是 | 工具栏按钮显示的标签 |
| icon | ReactNode | 否 | 工具栏按钮显示的图标 |
| fields | DialogField[] | 容器模式可选（自动表单模式需要 componentType） | 弹窗属性字段配置 |
| renderDialog | Function | 容器模式可选（自动表单模式不需要） | 弹窗内容渲染函数 |
| wrapTags | [string, string] | 标签模式必填 | 开闭标签对，如 `['<tag>', '</tag>']` |

注：`wrapTags` 模式下不需要 `fields` 和 `renderDialog`。两种模式只需配置一种。

如果 `fields` 中的字段配置了 `componentType`，则会自动生成表单，无需 `renderDialog`。

### DialogField

弹窗属性字段配置：

| 属性名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| key | string | 是 | 字段唯一标识 |
| name | string | 否 | 字段标签（默认使用 key） |
| componentType | string | 否 | 组件类型，支持：`input`、`textarea`、`number`、`select`、`switch`、`slider`、`rate`、`color`、`date`、`dateRange` |
| componentProps | object | 否 | 传递给组件的属性 |
| defaultValue | any | 否 | 字段默认值 |

当 `fields` 中的字段配置了 `componentType` 时，弹窗会自动生成对应表单，无需手动编写 `renderDialog`。

## 依赖

此包需要 React 18 作为 peer dependency。
