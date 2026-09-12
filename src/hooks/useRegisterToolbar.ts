import { useEffect } from 'react'
import componentRegistry from '../registry/componentRegistry'
import type { ComponentSchema } from '../types'

/**
 * 注册自定义容器组件到工具栏。支持单个或批量注册。
 * 支持 linkCard 形式的 schema（name + fields + renderDialog）。
 * fields 定义 Markdown 属性字段，renderDialog 定义弹窗内容。
 * 
 * @example 单个注册
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
