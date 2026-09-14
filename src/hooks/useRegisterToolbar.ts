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
 * @example 批量注册
 * ```tsx
 * function MyPage() {
 *   useRegisterToolbar([schema1, schema2, schema3])
 *   return <MarkdownEditor />
 * }
 * ```
 */
export function useRegisterToolbar(schemas: ComponentSchema | ComponentSchema[]) {
  const schemaList: ComponentSchema[] = Array.isArray(schemas) ? schemas : [schemas]

  useEffect(() => {
    schemaList.forEach(schema => {
      componentRegistry.register(schema.name, schema)
    })
    return () => {
      schemaList.forEach(schema => {
        componentRegistry.unregister(schema.name)
      })
    }
  }, [schemaList])
}
