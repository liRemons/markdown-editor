// 核心组件
export { default as MarkdownEditor } from './MarkdownEditor'
export type { MarkdownEditorProps, MarkdownEditorRef } from './MarkdownEditor'

// 注册容器到工具栏
export { useRegisterToolbar } from './hooks/useRegisterToolbar'

// iconfont 配置（quote/inlinecode 等内置图标依赖）
export { setIconfontScriptUrl, getIconfontScriptUrl } from './components/Icon/config'

// 类型
export type {
  ComponentSchema,
  DialogField,
  ToolbarButtonConfig,
  ImageUploadConfig,
  NotifyFn,
} from './types'
export type { PreviewOptions } from './components/Preview'
export type { ContainerProps, ContainerBlock } from './utils/parseContainer'

// 全局样式（主题变量 + 组件样式，随入口自动携带）
import './styles/index.less';
