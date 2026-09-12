import type { EditorView } from '@codemirror/view'
import type { EditorState as CMEditorState } from '@codemirror/state'
import type React from 'react'

// Types for the markdown editor
export interface EditorState {
  content: string
  history: string[]
  historyIndex: number
}

// 工具栏按钮配置接口 — 单一递归类型，支持嵌套 children
export interface ToolbarButtonConfig {
  id: string
  icon?: React.ComponentType
  label?: string
  // 支持嵌套子项（如 dropdown 菜单）
  children?: ToolbarButtonConfig[]
  // 操作处理函数
  handler?: (view: EditorView, state: CMEditorState) => void
  // 分隔符标记
  separatorBefore?: boolean
  // 自定义渲染（如表格选择器等复杂交互）
  customRender?: () => React.ReactNode
}

// 导出别名，供工具栏注册中心使用
export type ToolbarButton = ToolbarButtonConfig

export interface ComponentField {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'color'
  defaultValue?: string
  options?: { label: string; value: string }[]
}

export interface ComponentSchema {
  name: string
  label: string
  fields: ComponentField[]
}