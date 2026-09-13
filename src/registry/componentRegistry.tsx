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

export default componentRegistry