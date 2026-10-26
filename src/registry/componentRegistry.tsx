import type { ComponentSchema } from '../types'

/**
 * 组件注册中心，用于管理自定义组件的 schema。
 * 每个容器组件（如 :::linkCard）在此注册其可编辑字段。
 * 内置版本计数 + 订阅：注册/移除后通知监听方（如编辑器工具栏）刷新。
 */
type Listener = (version: number) => void

class ComponentRegistry {
  private schemas = new Map<string, ComponentSchema>()
  private listeners = new Set<Listener>()
  private version = 0

  /**
   * 注册组件 schema
   */
  register(name: string, schema: ComponentSchema): void {
    this.schemas.set(name, schema)
    this.emit()
  }

  /**
   * 移除组件注册
   */
  unregister(name: string): void {
    if (this.schemas.delete(name)) {
      this.emit()
    }
  }

  /**
   * 当前版本号，任意注册变更都会自增
   */
  getVersion(): number {
    return this.version
  }

  /**
   * 订阅注册变更，返回退订函数
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    this.version += 1
    this.listeners.forEach((listener) => listener(this.version))
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
}

// 单例实例
const componentRegistry = new ComponentRegistry()

export default componentRegistry