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
 * @example 容器模式
 * ```tsx
 * const schema: ComponentSchema = {
 *   name: 'alert',
 *   label: '警告框',
 *   icon: <AlertOutlined />,
 *   fields: [{ key: 'level', defaultValue: 'info' }],
 *   renderDialog: (props, onChange) => (
 *     <Input value={props.level} onChange={e => onChange('level', e.target.value)} />
 *   ),
 * }
 * 
 * function MyPage() {
 *   useRegisterToolbar(schema)
 *   return <MarkdownEditor />
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
