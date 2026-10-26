import JSON5 from 'json5'
import componentRegistry from '../registry/componentRegistry'

/** 容器属性对象：值保留原始类型（string/number/boolean），写回时统一序列化 */
export type ContainerProps = Record<string, string | number | boolean>

/**
 * 解析容器属性行。
 * 优先按 JSON5 解析（兼容标准 JSON 与 { key: 'value' } 宽松写法），
 * 失败时返回空对象，保证往返编辑不丢数据。
 */
export function parseContainerProps(line: string): ContainerProps {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {}
  try {
    const parsed: unknown = JSON5.parse(trimmed)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const props: ContainerProps = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === null || value === undefined) continue
      if (typeof value === 'object') continue
      props[key] = value as string | number | boolean
    }
    return props
  } catch {
    return {}
  }
}

/**
 * 容器块位置信息（基于文档的绝对字符偏移）
 */
export interface ContainerBlock {
  /** ::: 打开行行首位置 */
  startPos: number
  /** 组件类型名称 (如 "linkCard") */
  typeName: string
  /** 属性行起始位置（0 表示无属性行） */
  propsLineFrom: number
  /** 属性行结束位置（0 表示无属性行） */
  propsLineTo: number
  /** 解析出的属性 */
  props: ContainerProps
  /** ::: 关闭行行首位置（0 表示未闭合） */
  endPos: number
  /** 类型是否已在注册中心登记（未登记的仅装饰、不可编辑） */
  registered: boolean
}

/**
 * 在编辑器文档中查找容器块。
 * 单次遍历 + 预累计行偏移，复杂度 O(行数)。
 */
export function findContainers(docText: string): ContainerBlock[] {
  const containers: ContainerBlock[] = []
  const lines = docText.split('\n')

  // 每行行首的绝对偏移，offsets[i] = 前 i 行总长 + i 个换行符
  const offsets: number[] = new Array(lines.length)
  let pos = 0
  for (let i = 0; i < lines.length; i++) {
    offsets[i] = pos
    pos += lines[i].length + 1
  }

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^:::(\w+)$/)
    if (!match) continue
    const typeName = match[1]
    // 先固定头行位置：下方闭合搜索会把 i 改为闭合行下标，不能再依赖 i
    const headerPos = offsets[i]

    // 属性行：打开行之后以 { 开头的行
    let props: ContainerProps = {}
    let propsLineFrom = 0
    let propsLineTo = 0
    const propsLine = lines[i + 1]
    if (propsLine && propsLine.trim().startsWith('{') && propsLine.trim().endsWith('}')) {
      props = parseContainerProps(propsLine)
      propsLineFrom = offsets[i + 1]
      propsLineTo = propsLineFrom + propsLine.length
    }

    // 查找闭合 :::
    let endPos = 0
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === ':::') {
        endPos = offsets[j]
        i = j
        break
      }
    }

    containers.push({
      startPos: headerPos,
      typeName,
      propsLineFrom,
      propsLineTo,
      props,
      endPos,
      registered: componentRegistry.has(typeName),
    })
  }

  return containers
}
