import type { EditorView } from '@codemirror/view'
import type { EditorState as CMEditorState } from '@codemirror/state'
import type { FormInstance } from 'antd'
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
 * 内置表单组件类型映射
 * 用于 fields 驱动的自动表单渲染，无需手写 Form 结构
 */
export type FormComponentType =
  | 'input'        // Input
  | 'textarea'     // Input.TextArea
  | 'number'       // InputNumber
  | 'select'       // Select
  | 'switch'       // Switch
  | 'slider'       // Slider
  | 'rate'         // Rate
  | 'color'        // ColorPicker
  | 'date'         // DatePicker (day)
  | 'dateRange'    // DatePicker (range)

/**
 * 弹窗属性配置
 * 支持简单模式（key + defaultValue）和完整模式（带 componentType 自动渲染）
 */
export interface DialogField {
  /** 字段键名，用于 Markdown 属性填充 */
  key: string
  /** 字段显示名称（表单 label） */
  name?: string
  /** 默认值 */
  defaultValue?: string
  /**
   * 表单组件类型（可选）
   * 配置后 EditDialog 会自动渲染对应的 antd 表单组件，无需手写 Form 结构
   * 如需完全自定义，可省略此项并提供 renderDialog
   */
  componentType?: FormComponentType
  /**
   * 组件额外属性（可选）
   * 传递对应 antd 组件的 props
   */
  componentProps?: Record<string, any>
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
   * 接收当前属性值、表单实例和回调函数，由用户完全自定义弹窗内容的渲染
   *
   * 如果省略 renderDialog 并为 fields 配置了 componentType，
   * 弹窗会自动生成表单，无需手写 Form 结构。
   * 支持的 componentType：'input' | 'textarea' | 'number' | 'select' | 'switch' | 'slider' | 'rate' | 'color' | 'date' | 'dateRange'
   * 示例：
   * ```tsx
   * fields: [
   *   { key: 'type', name: '类型', componentType: 'select',
   *     componentProps: { options: [{ value: 'price', label: '价格' }, { value: 'info', label: '信息' }] } },
   *   { key: 'content', name: '内容', componentType: 'textarea',
   *     componentProps: { rows: 3 } },
   *   { key: 'enabled', name: '启用', componentType: 'switch' },
   * ],
   * ```
   *
   * @example 使用 Form.Item 自动绑定（推荐）
   * ```tsx
   * renderDialog: ({ form }) => (
   *   <Form form={form} layout="vertical">
   *     <Form.Item name="type" label="类型">
   *       <Input />
   *     </Form.Item>
   *   </Form>
   * )
   * ```
   *
   * @example 手动控制
   * ```tsx
   * renderDialog: ({ props, onChange }) => (
   *   <Input value={props.content} onChange={e => onChange('content', e.target.value)} />
   * )
   * ```
   *
   * @example 完全自定义弹窗
   * ```tsx
   * renderDialog: ({ props, onSave }) => (
   *   <MyCustomEditor value={props.content} onSave={({ content }) => onSave({ content })} />
   * )
   * ```
   */
  renderDialog?: (context: DialogRenderContext) => React.ReactNode
}

/**
 * 弹窗渲染上下文
 * 提供多种表单控制方式，用户可根据需求选择：
 * - `form` + `Form.Item`：推荐方式，自动管理状态
 * - `props` + `onChange`：手动控制，适用于自定义组件
 * - `onSave`：完全自定义弹窗，直接调用保存
 */
export interface DialogRenderContext {
  /** 当前属性值（合并默认值与当前的值） */
  props: Record<string, string>
  /** 表单实例，用于 Form.Item 自动绑定 */
  form: FormInstance
  /** 属性变更回调（手动控制方式） */
  onChange: (key: string, value: string) => void
  /** 直接保存属性（完全自定义方式，调用后弹窗不会自动关闭） */
  onSave: (props: Record<string, string>) => void
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