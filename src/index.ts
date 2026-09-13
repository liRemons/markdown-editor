// 核心组件
export { default as MarkdownEditor } from './MarkdownEditor'
export type { MarkdownEditorProps, MarkdownEditorRef } from './MarkdownEditor'

// 注册容器到工具栏
export { useRegisterToolbar } from './hooks/useRegisterToolbar'

// 类型
export type {
  ComponentSchema,
  DialogField,
  ToolbarButtonConfig,
} from './types'
export type { PreviewOptions } from './components/Preview'
