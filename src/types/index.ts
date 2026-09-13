import type { EditorView } from '@codemirror/view'
import type { EditorState as CMEditorState } from '@codemirror/state'
import type React from 'react'

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
  // 标签包裹配置：设置为 [openTag, closeTag] 时，点击按钮会切换选中文本的标签包裹（替代 handler）
  wrapTags?: [string, string]
  // 是否禁用该按钮
  disabled?: boolean
}

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
 * 也支持简单的标签包裹模式（通过 wrapTags）
 */
export interface ComponentSchema {
  /** 容器名称，对应 :::name 语法 */
  name: string
  /** 工具栏按钮显示的标签 */
  label: string
  /** 工具栏按钮显示的图标 */
  icon?: React.ReactNode
  /**
   * 标签包裹配置：设置为 [openTag, closeTag] 时，使用标签包裹模式（而非 :::name 容器）
   * 配置后无需提供 fields 和 renderDialog
   */
  wrapTags?: [string, string]
  /** 弹窗属性配置 — 用于定义 Markdown 内容中需要填充的字段（wrapTags 模式下可选） */
  fields?: DialogField[]
  /**
   * 弹窗内容渲染函数（wrapTags 模式下可选）
   * 接收当前属性值和回调函数，由用户完全自定义弹窗内容的渲染
   * @param props 当前属性值，用于回显
   * @param onChange 属性变更回调，用于更新表单值
   * @returns 弹窗内容的 ReactNode
   */
  renderDialog?: (props: Record<string, string>, onChange: (key: string, value: string) => void) => React.ReactNode
}

/**
 * 图片上传配置
 */
export interface ImageUploadConfig {
  /**
   * 图片上传接口地址
   * 需与 onUploadImage 二选一（优先级低于 onUploadImage）
   */
  uploadUrl?: string
  /**
   * 自定义上传函数（优先级高于 uploadUrl）
   * 传入此函数时，将完全接管上传逻辑
   * @param file 要上传的图片文件
   * @returns Promise<string> - 返回图片 URL，失败返回 null
   */
  onUploadImage?: (file: File) => Promise<string | null>
  /**
   * 处理服务器返回结果的回调，允许转换 URL
   * 当使用 uploadUrl 方式上传时，可以使用此回调来自定义处理响应数据
   * @param result 服务器返回的原始响应数据
   * @returns 图片 URL，如果返回 null 则上传失败
   */
  onGetUploadUrl?: (result: any) => string | null
}