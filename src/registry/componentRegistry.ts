import type { ComponentSchema } from '../types'

/**
 * 组件注册中心，用于管理自定义组件的 schema。
 * 每个容器组件（如 :::linkCard）在此注册其可编辑字段。
 */
class ComponentRegistry {
  private schemas = new Map<string, ComponentSchema>()

  /**
   * 注册组件 schema
   */
  register(name: string, schema: ComponentSchema): void {
    this.schemas.set(name, schema)
  }

  /**
   * 根据组件名获取已注册的 schema
   */
  get(name: string): ComponentSchema | undefined {
    return this.schemas.get(name)
  }

  /**
   * 检查组件类型是否已注册
   */
  has(name: string): boolean {
    return this.schemas.has(name)
  }

  /**
   * 获取所有已注册的组件名
   */
  getAllNames(): string[] {
    return Array.from(this.schemas.keys())
  }

  /**
   * 获取所有已注册的 schema
   */
  getAll(): ComponentSchema[] {
    return Array.from(this.schemas.values())
  }

  /**
   * 移除组件注册
   */
  unregister(name: string): void {
    this.schemas.delete(name)
  }
}

// 单例实例
const componentRegistry = new ComponentRegistry()

// 注册默认组件
componentRegistry.register('linkCard', {
  name: 'linkCard',
  label: '链接卡片',
  fields: [
    { key: 'title', label: '标题', type: 'text', defaultValue: '链接标题' },
    { key: 'link', label: '链接', type: 'text', defaultValue: 'https://example.com' },
    { key: 'description', label: '描述', type: 'textarea', defaultValue: '链接描述' },
    {
      key: 'theme',
      label: '主题',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: '默认', value: 'default' },
        { label: '主要', value: 'primary' },
        { label: '警告', value: 'warning' },
      ],
    },
  ],
})

componentRegistry.register('note', {
  name: 'note',
  label: '注释',
  fields: [
    { key: 'type', label: '类型', type: 'select', defaultValue: 'info', options: [
      { label: '信息', value: 'info' },
      { label: '提示', value: 'tip' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
    ]},
    { key: 'title', label: '标题', type: 'text', defaultValue: '注意' },
    { key: 'content', label: '内容', type: 'textarea', defaultValue: '备注内容' },
  ],
})

export default componentRegistry