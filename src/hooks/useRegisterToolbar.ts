import { useEffect } from 'react'
import componentRegistry from '../registry/componentRegistry'
import type { ComponentSchema } from '../types'

/**
 * 注册自定义容器组件到工具栏。支持单个或批量注册。
 * 支持两种模式：
 * 
 * 1. 容器模式（linkCard）：name + fields + renderDialog
 *    插入 :::name 格式的容器，支持弹窗编辑属性
 * 
 * 2. 标签包裹模式：name + wrapTags
 *    插入简单的标签包裹文本，如 <plugin-container>...</plugin-container>
 * 
 * @example 容器模式 - 使用 fields 自动生成表单（最简）
 * ```tsx
 * const schema: ComponentSchema = {
 *   name: 'alert',
 *   label: '警告框',
 *   icon: <AlertOutlined />,
 *   fields: [
 *     { key: 'type', name: '类型', componentType: 'select',
 *       componentProps: { options: [{ value: 'price', label: '价格' }, { value: 'info', label: '信息' }] } },
 *     { key: 'content', name: '内容', componentType: 'textarea',
 *       componentProps: { rows: 3 } },
 *     { key: 'enabled', name: '启用', componentType: 'switch' },
 *   ],
 * }
 * // 支持的 componentType: 'input' | 'textarea' | 'number' | 'select' | 'switch' | 'slider' | 'rate' | 'color' | 'date' | 'dateRange'
 * ```
 * 
 * @example 容器模式 - 使用 Form.Item 自动绑定（推荐）
 * ```tsx
 * const schema: ComponentSchema = {
 *   name: 'alert',
 *   label: '警告框',
 *   icon: <AlertOutlined />,
 *   fields: [{ key: 'level', defaultValue: 'info' }],
 *   renderDialog: ({ form }) => (
 *     <Form form={form} layout="vertical">
 *       <Form.Item name="level" label="级别">
 *         <Input />
 *       </Form.Item>
 *     </Form>
 *   ),
 * }
 * 
 * function MyPage() {
 *   useRegisterToolbar(schema)
 *   return <MarkdownEditor />
 * }
 * ```
 * 
 * @example 容器模式 - 手动控制
 * ```tsx
 * const schema: ComponentSchema = {
 *   name: 'alert',
 *   label: '警告框',
 *   icon: <AlertOutlined />,
 *   fields: [{ key: 'level', defaultValue: 'info' }],
 *   renderDialog: ({ props, onChange }) => (
 *     <Input value={props.level} onChange={e => onChange('level', e.target.value)} />
 *   ),
 * }
 * ```
 * 
 * @example 容器模式 - 完全自定义弹窗
 * ```tsx
 * const schema: ComponentSchema = {
 *   name: 'alert',
 *   label: '警告框',
 *   icon: <AlertOutlined />,
 *   fields: [{ key: 'level', defaultValue: 'info' }],
 *   renderDialog: ({ props, onSave }) => (
 *     <MyCustomEditor
 *       value={props.level}
 *       onSave={({ level }) => onSave({ level })}
 *     />
 *   ),
 * }
 * ```
 * 
 * @example 标签包裹模式
 * ```tsx
 * function MyPage() {
 *   useRegisterToolbar({
 *     name: 'plugin-container',
 *     label: '自定义容器',
 *     icon: <AlertOutlined />,
 *     wrapTags: ['<plugin-container>', '</plugin-container>'],
 *   })
 *   return <MarkdownEditor />
 * }
 * ```
 *
 * @example 标签包裹 + 属性编辑模式（开标签携带 HTML 属性，点击弹窗回显编辑）
 * ```tsx
 * function MyPage() {
 *   useRegisterToolbar({
 *     name: 'centerContainer',
 *     label: '居中容器',
 *     icon: <AlignCenterOutlined />,
 *     // 基名取自开标签，属性形如 key="value" 直出 HTML
 *     wrapTags: ['<poetry-container>', '</poetry-container>'],
 *     fields: [
 *       { key: 'style', name: '样式', defaultValue: 'display:block;text-align:center;' },
 *     ],
 *     renderDialog: ({ form }) => (
 *       // 自定义样式编辑器，把每行一条 key: value 的文本同步回 name="style" 字段
 *       <StyleLinesEditor form={form} />
 *     ),
 *   })
 *   return <MarkdownEditor />
 * }
 * ```
 * 
 * @example 批量注册
 * ```tsx
 * function MyPage() {
 *   // 注意：schema 需声明为稳定引用（组件外常量或 useMemo），
 *   // 否则每次渲染都会重新注册；多实例互不干扰的场景请改用
 *   // <MarkdownEditor schemas={[...]} /> 局部注册
 *   useRegisterToolbar([schema1, schema2, schema3])
 *   return <MarkdownEditor />
 * }
 * ```
 */
export function useRegisterToolbar(schemas: ComponentSchema | ComponentSchema[]) {
  useEffect(() => {
    const schemaList: ComponentSchema[] = Array.isArray(schemas) ? schemas : [schemas]
    schemaList.forEach(schema => {
      componentRegistry.register(schema.name, schema)
    })
    return () => {
      schemaList.forEach(schema => {
        componentRegistry.unregister(schema.name)
      })
    }
  }, [schemas])
}
