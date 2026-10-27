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
  /** 容器行首的引用前缀（如 "> "）；嵌套在引用中的容器写回时需保留 */
  quotePrefix?: string
  /** 属性行自身的引用前缀（懒延续时可为空）；替换属性行时按它原样保留 */
  propsQuotePrefix?: string
}

/**
 * 解析行首的引用（blockquote）嵌套前缀。
 * markdown-it 解析引用内部内容时会剥掉一层 "> "，因此 "> :::badge" 在渲染侧
 * 等同于 ":::badge"；编辑器侧需同样识别，否则嵌套引用的容器匹配不到标签。
 * 返回 [前缀文本（含 "> " 及尾随空格）, 去掉前缀后的内容]，无前缀时返回 ['', 原文本]。
 */
function splitQuotePrefix(line: string): [string, string] {
  const m = line.match(/^((?:>\s*)+)(\S.*)$/)
  if (!m) return ['', line]
  return [m[1], m[2]]
}

/** 引用嵌套深度（"> > x" 为 2，无前缀为 0） */
function quoteDepth(prefix: string): number {
  return (prefix.match(/>/g) ?? []).length
}

/** 待闭合容器：打开块 + 其引用前缀深度（闭合行需同深度才能配对） */
interface OpenContainer {
  block: ContainerBlock
  depth: number
}

/**
 * 在编辑器文档中查找容器块。
 * 单次遍历 + 预累计行偏移，复杂度 O(行数)。
 * 支持整体嵌套在引用中的容器：头行、属性行、闭合行需具有相同的 "> " 前缀深度，
 * 避免跨引用层级错误配对。闭合 ::: 改为按栈配对，嵌套容器不会被内层闭合误截断。
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

  // 待闭合容器栈：闭合行与最近一个未闭合、同深度的容器配对，
  // 嵌套容器不会被内层闭合错误截断
  const stack: OpenContainer[] = []

  for (let i = 0; i < lines.length; i++) {
    const [prefix, body] = splitQuotePrefix(lines[i])
    const depth = quoteDepth(prefix)

    // 闭合 :::：与栈顶同深度的容器配对
    if (/^:::$/.test(body)) {
      let top = stack.length - 1
      while (top >= 0 && stack[top].depth !== depth) top--
      if (top >= 0) {
        stack[top].block.endPos = offsets[i]
        stack.length = top
      }
      continue
    }

    const match = body.match(/^:::(\w+)$/)
    if (!match) continue
    const typeName = match[1]
    const headerPos = offsets[i]

    // 属性行：打开行之后以 { 开头的行；同深度引用前缀，
    // 或无/更浅前缀的懒延续行（markdown-it 允许引用段落中不带 "> " 的行延续）
    let props: ContainerProps = {}
    let propsLineFrom = 0
    let propsLineTo = 0
    let propsQuotePrefix = ''
    const nextLine = lines[i + 1]
    if (nextLine) {
      const [nextPrefix, nextBody] = splitQuotePrefix(nextLine)
      if (
        (quoteDepth(nextPrefix) === depth || nextPrefix === '') &&
        nextBody.trimStart().startsWith('{') &&
        nextBody.trimEnd().endsWith('}')
      ) {
        props = parseContainerProps(nextBody)
        propsLineFrom = offsets[i + 1]
        propsLineTo = propsLineFrom + nextLine.length
        propsQuotePrefix = nextPrefix
        // 属性行已消费，外层循环跳过它
        i += 1
      }
    }

    const block: ContainerBlock = {
      startPos: headerPos,
      typeName,
      propsLineFrom,
      propsLineTo,
      props,
      endPos: 0,
      registered: componentRegistry.has(typeName),
      quotePrefix: prefix,
      propsQuotePrefix,
    }
    containers.push(block)
    stack.push({ block, depth })
  }

  return containers
}
