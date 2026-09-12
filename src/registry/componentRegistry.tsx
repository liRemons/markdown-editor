import { Input, Select } from 'antd'
import type { ComponentSchema } from '../types'
import React from 'react'

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
    { key: 'title', defaultValue: '链接标题' },
    { key: 'link', defaultValue: 'https://example.com' },
    { key: 'description', defaultValue: '链接描述' },
    { key: 'theme', defaultValue: 'default' },
  ],
  renderDialog: (props, onChange): React.ReactNode => (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>标题</div>
        <Input value={props.title} onChange={e => onChange('title', e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>链接</div>
        <Input value={props.link} onChange={e => onChange('link', e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>描述</div>
        <Input.TextArea rows={3} value={props.description} onChange={e => onChange('description', e.target.value)} />
      </div>
      <div>
        <div style={{ marginBottom: 4 }}>主题</div>
        <Select
          value={props.theme}
          onChange={v => onChange('theme', v)}
          options={[
            { label: '默认', value: 'default' },
            { label: '主要', value: 'primary' },
            { label: '警告', value: 'warning' },
          ]}
        />
      </div>
    </>
  ),
})

componentRegistry.register('note', {
  name: 'note',
  label: '注释',
  fields: [
    { key: 'type', defaultValue: 'info' },
    { key: 'title', defaultValue: '注意' },
    { key: 'content', defaultValue: '备注内容' },
  ],
  renderDialog: (props, onChange): React.ReactNode => (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>类型</div>
        <Select
          value={props.type}
          onChange={v => onChange('type', v)}
          options={[
            { label: '信息', value: 'info' },
            { label: '提示', value: 'tip' },
            { label: '警告', value: 'warning' },
            { label: '危险', value: 'danger' },
          ]}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4 }}>标题</div>
        <Input value={props.title} onChange={e => onChange('title', e.target.value)} />
      </div>
      <div>
        <div style={{ marginBottom: 4 }}>内容</div>
        <Input.TextArea rows={3} value={props.content} onChange={e => onChange('content', e.target.value)} />
      </div>
    </>
  ),
})

export default componentRegistry