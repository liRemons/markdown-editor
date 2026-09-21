# 将 Markdown 编辑器封装为 React 组件

## 概述

本文档说明如何将当前的 Markdown 编辑器项目封装为一个可复用的 React 组件库，供其他项目引入使用。

## 项目结构

```
src/
├── components/
│   ├── Editor/              # CodeMirror 编辑器组件
│   │   ├── index.tsx
│   │   ├── codemirrorExtensions.ts
│   │   └── containerWidget.ts
│   ├── Preview/             # Markdown 渲染预览组件
│   │   └── index.tsx
│   ├── Toolbar/             # 工具栏组件
│   │   ├── index.tsx
│   │   ├── buttons.tsx
│   │   ├── config.ts
│   │   ├── hooks/
│   │   │   └── useToolbar.ts
│   │   └── renderers/
│   │       ├── ToolbarItemRenderer.tsx
│   │       └── TablePicker/
│   ├── Panel/
│   │   └── SplitPanels.tsx  # 左右分栏面板
│   └── Dialog/
│       └── EditDialog.tsx   # 容器属性编辑弹窗
├── registry/
│   └── componentRegistry.ts # 组件 Schema 注册中心
├── utils/
│   ├── parseContainer.ts    # 解析容器语法
│   └── writeContainer.ts    # 写入容器语法
├── types/
│   └── index.ts             # 类型定义
└── hooks/
    └── useScrollSync.ts     # 滚动同步 Hook
```

## 封装步骤

### 1. 创建公共入口文件

在 `src/` 下创建 `index.ts`，导出所有公共 API：

```ts
// src/index.ts

// 核心组件
export { default as MarkdownEditor } from './MarkdownEditor'

// 注册容器到工具栏
export { useRegisterToolbar } from './hooks/useRegisterToolbar'

// 类型
export type {
  ComponentSchema,
  DialogField,
} from './types'
```

### 2. 创建封装组件

创建 `src/MarkdownEditor.tsx` 作为对外暴露的主组件，将 `App.tsx` 的逻辑抽离：

```tsx
import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import { useRegisterToolbar } from './hooks/useRegisterToolbar'
import type { DialogField, ComponentSchema } from './types'

export interface MarkdownEditorRef {
  getContent: () => string
}

export interface MarkdownEditorProps {
  /** 初始内容 */
  defaultValue?: string
  /** 受控内容 */
  value?: string
  /** 内容变化回调 */
  onChange?: (value: string) => void
  /** 是否显示预览面板 */
  showPreview?: boolean
  /** 是否支持全屏 */
  fullscreen?: boolean
}

export default forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor({
  defaultValue = '',
  value,
  onChange,
  showPreview = true,
  fullscreen: fullscreenProp = false,
}, ref) {
  const [content, setContent] = useState(value ?? defaultValue)
  const [editorView, setEditorView] = useState<any>(null)
  const scrollDOMRef = useRef<HTMLElement | null>(null)
  const previewElRef = useRef<HTMLDivElement | null>(null)

  // 容器编辑弹窗状态
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogTypeName, setDialogTypeName] = useState('')
  const [dialogProps, setDialogProps] = useState<Record<string, string>>({})
  const [dialogPropsRange, setDialogPropsRange] = useState<[number, number]>([0, 0])

  // 受控模式：外部 value 变化时同步
  useEffect(() => {
    if (value !== undefined) {
      setContent(value)
    }
  }, [value])

  const internalSetContent = useCallback((newContent: string) => {
    setContent(newContent)
    onChange?.(newContent)
  }, [onChange])

  // 暴露 getContent 方法
  useImperativeHandle(ref, () => ({
    getContent: () => content,
  }), [content])

  // 从注册中心自动生成工具栏按钮（仅支持 linkCard 形式的容器 schema）
  const toolbarItems = componentRegistry.getAll().map(schema => {
    const defaultProps: Record<string, string> = {}
    for (const field of schema.fields) {
      defaultProps[field.key] = field.defaultValue ?? ''
    }
    return {
      id: `container-${schema.name}`,
      label: schema.label,
      handler: (view, _state) => insertContainer(view, schema.name, defaultProps),
    }
  })

  // 滚动同步
  // ... (同上)

  // 全屏切换
  // ... (同上)

  const handleEditContainer = useCallback((view: any, typeName: string, propsLineFrom: number, propsLineTo: number, currentProps: Record<string, string>) => {
    setDialogTypeName(typeName)
    setDialogProps({ ...currentProps })
    setDialogPropsRange([propsLineFrom, propsLineTo])
    setDialogVisible(true)
  }, [])

  const handleDialogSave = useCallback((newProps: Record<string, string>) => {
    setDialogVisible(false)
    if (editorView) {
      updateContainerProps(editorView, dialogPropsRange[0], dialogPropsRange[1], newProps)
    }
  }, [editorView, dialogPropsRange])

  return (
    <div className="markdown-editor">
      <Toolbar
        editorView={editorView}
        extraItems={toolbarItems}
      />
      {showPreview /* ... (同上) */}
      <EditDialog /* ... (同上) */}
    </div>
  )
})
```

### 3. 创建 useRegisterToolbar 钩子

创建 `src/hooks/useRegisterToolbar.ts`，用于注册容器 schema：

```ts
import { useEffect } from 'react'
import componentRegistry from '../registry/componentRegistry'
import type { ComponentSchema } from '../types'

/**
 * 注册自定义容器组件到工具栏。
 * 支持 linkCard 形式的 schema（name + fields + renderDialog）。
 * fields 定义 Markdown 属性字段，renderDialog 定义弹窗内容。
 */
export function useRegisterToolbar(schema: ComponentSchema) {
  useEffect(() => {
    componentRegistry.register(schema.name, schema)
    return () => {
      componentRegistry.unregister(schema.name)
    }
  }, [schema])
}
```

### 4. 配置构建工具

修改 `tsconfig.json` 支持打包：

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "./dist/types",
    "outDir": "./dist",
    "module": "esnext",
    "target": "es2018",
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "esModuleInterop": true
  }
}
```

如果你使用 `tsup` 或 `rollup`，推荐 `tsup.config.ts`：

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  external: ['react', 'react-dom'],
})
```

### 5. 修改 package.json

```json
{
  "name": "@your-org/markdown-editor",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./style.css": "./dist/style.css"
  },
  "files": ["dist"],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

### 6. 处理样式

将所有 CSS/LESS 文件打包为单独的 `style.css`，通过 `exports` 暴露：

```json
{
  "exports": {
    "./style.css": "./dist/style.css"
  }
}
```

## 对外 API

封装后的组件仅暴露以下 API，其余工具函数、渲染组件、Hook 等不对外暴露。

### 1. 注册自定义容器（注入工具栏按钮）

通过 `useRegisterToolbar` hook 或静态方法注册容器 schema，注册后会自动在工具栏生成对应按钮（同类 linkCard 形式）。

```tsx
import { useRegisterToolbar } from '@your-org/markdown-editor'
import type { ComponentSchema } from '@your-org/markdown-editor'

const schema: ComponentSchema = {
  name: 'alert',
  label: '警告框',
  fields: [
    { key: 'level', defaultValue: 'info' },
    { key: 'message', defaultValue: '' },
  ],
  renderDialog: (props, onChange) => (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>级别</div>
        <Select value={props.level} onChange={v => onChange('level', v)} options={[
          { label: '信息', value: 'info' },
          { label: '错误', value: 'error' },
        ]} />
      </div>
      <div>
        <div style={{ marginBottom: 4 }}>内容</div>
        <Input.TextArea value={props.message} onChange={e => onChange('message', e.target.value)} />
      </div>
    </>
  ),
}

function MyPage() {
  useRegisterToolbar(schema)
  return <MarkdownEditor />
}
```

> **注意**：`fields` 定义 Markdown 容器中需要填充的属性字段。`renderDialog` 用于完全自定义弹窗内容，接收当前 props（用于回显）和 onChange 回调（用于更新值）。

### 2. 获取 Markdown 内容

通过 `ref` 调用 `getContent()` 方法获取当前编辑器内容：

```tsx
import { useRef } from 'react'
import { MarkdownEditor } from '@your-org/markdown-editor'

function MyPage() {
  const editorRef = useRef<{ getContent: () => string }>(null)

  const handleSave = () => {
    const content = editorRef.current?.getContent()
    console.log(content)
  }

  return (
    <>
      <MarkdownEditor ref={editorRef} />
      <button onClick={handleSave}>保存</button>
    </>
  )
}
```

### Props

#### MarkdownEditorProps

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | - | 受控内容 |
| `defaultValue` | `string` | `''` | 初始内容 |
| `onChange` | `(value: string) => void` | - | 内容变化回调 |
| `showPreview` | `boolean` | `true` | 是否显示预览 |
| `fullscreen` | `boolean` | `false` | 是否支持全屏 |

### ref 方法

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| `getContent()` | `string` | 获取当前 Markdown 内容 |

### useRegisterToolbar

| 参数 | 类型 | 说明 |
|------|------|------|
| `schema` | `ComponentSchema` | 容器组件 schema，注册后工具栏自动生成按钮 |

### ComponentSchema 类型

```ts
interface DialogField {
  key: string                        // 字段名，用于 Markdown 属性填充
  defaultValue?: string              // 默认值
}

interface ComponentSchema {
  name: string                       // 容器名称，对应 :::name 语法
  label: string                      // 工具栏按钮显示的标签
  fields: DialogField[]              // 属性字段配置，用于定义 Markdown 内容中需要填充的字段
  /**
   * 弹窗内容渲染函数（必填）
   * 接收当前属性值和回调函数，由用户完全自定义弹窗内容的渲染
   */
  renderDialog: (props: Record<string, string>, onChange: (key: string, value: string) => void) => React.ReactNode
}

#### 自定义弹窗示例

`fields` 仅用于定义 Markdown 属性字段，`renderDialog` 由用户完全控制弹窗内容的呈现方式：

```ts
import { Input, Select, Upload, Radio } from 'antd'

const schema: ComponentSchema = {
  name: 'mediaCard',
  label: '媒体卡片',
  fields: [
    { key: 'title', defaultValue: '' },
    { key: 'cover', defaultValue: '' },
    { key: 'layout', defaultValue: 'horizontal' },
  ],
  renderDialog: (props, onChange): React.ReactNode => (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>标题</div>
        <Input value={props.title} onChange={e => onChange('title', e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>封面图</div>
        <Upload value={props.cover} onChange={v => onChange('cover', v)} />
      </div>
      <div>
        <div style={{ marginBottom: 4 }}>布局</div>
        <Radio.Group value={props.layout} onChange={e => onChange('layout', e.target.value)}>
          <Radio value="horizontal">水平</Radio>
          <Radio value="vertical">垂直</Radio>
        </Radio.Group>
      </div>
    </>
  ),
}
```

## 使用方式

### 基础用法

```tsx
import { MarkdownEditor } from '@your-org/markdown-editor'
import '@your-org/markdown-editor/style.css'

function MyPage() {
  return (
    <MarkdownEditor
      defaultValue="# Hello World"
      onChange={(value) => console.log(value)}
    />
  )
}
```

### 获取内容

```tsx
import { useRef } from 'react'
import { MarkdownEditor } from '@your-org/markdown-editor'

function MyPage() {
  const editorRef = useRef<{ getContent: () => string }>(null)

  return (
    <>
      <MarkdownEditor ref={editorRef} />
      <button onClick={() => console.log(editorRef.current?.getContent())}>
        获取内容
      </button>
    </>
  )
}
```

### 隐藏预览面板

```tsx
<MarkdownEditor showPreview={false} />
```

### 启用全屏

```tsx
<MarkdownEditor fullscreen={true} />
```

### 注册自定义容器

```tsx
import { useRegisterToolbar, MarkdownEditor } from '@your-org/markdown-editor'
import type { ComponentSchema } from '@your-org/markdown-editor'
import { Input, Select } from 'antd'

const alertSchema: ComponentSchema = {
  name: 'alert',
  label: '警告框',
  fields: [
    { key: 'level', defaultValue: 'info' },
    { key: 'message', defaultValue: '' },
  ],
  renderDialog: (props, onChange) => (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>级别</div>
        <Select value={props.level} onChange={v => onChange('level', v)} options={[
          { label: '信息', value: 'info' },
          { label: '警告', value: 'warning' },
          { label: '错误', value: 'error' },
        ]} />
      </div>
      <div>
        <div style={{ marginBottom: 4 }}>内容</div>
        <Input.TextArea value={props.message} onChange={e => onChange('message', e.target.value)} />
      </div>
    </>
  ),
}

function MyPage() {
  useRegisterToolbar(alertSchema)
  return <MarkdownEditor />
}
```

## 依赖说明

| 依赖 | 版本 | 说明 |
|------|------|------|
| `react` | ^18 / ^19 | peerDependency |
| `codemirror` | ^6 | 代码编辑器内核 |
| `antd` | ^6 | UI 组件 |
| `remons-markdown-plugins` | ^1.0 | Markdown 插件 |
| `remons-render-markdown` | ^2.0 | Markdown 渲染 |