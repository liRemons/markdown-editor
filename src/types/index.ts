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
  id?: string
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

/**
 * 弹窗属性配置
 * 用于定义 Markdown 容器中需要填充的属性字段
 */
export interface DialogField {
  /** 字段键名，用于 Markdown 属性填充 */
  key: string
  /** 默认值 */
  defaultValue?: string
}

/**
 * 组件 Schema
 * 每个容器组件（如 :::linkCard）定义可编辑字段和弹窗渲染逻辑
 */
export interface ComponentSchema {
  /** 容器名称，对应 :::name 语法 */
  name: string
  /** 工具栏按钮显示的标签 */
  label: string
  /** 工具栏按钮显示的图标 */
  icon?: React.ReactNode
  /** 弹窗属性配置 — 用于定义 Markdown 内容中需要填充的字段 */
  fields: DialogField[]
  /**
   * 弹窗内容渲染函数（必填）
   * 接收当前属性值和回调函数，由用户完全自定义弹窗内容的渲染
   * @param props 当前属性值，用于回显
   * @param onChange 属性变更回调，用于更新表单值
   * @returns 弹窗内容的 ReactNode
   */
  renderDialog: (props: Record<string, string>, onChange: (key: string, value: string) => void) => React.ReactNode
}