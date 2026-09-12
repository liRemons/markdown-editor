/**
 * 解析容器属性 JSON 字符串。
 * 支持标准 JSON 和宽松格式: { key: 'value', key2: 'value2' }
 */
export function parseContainerProps(jsonStr: string): Record<string, string> {
  try {
    const props: Record<string, string> = {}
    const trimmed = jsonStr.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return props
      // 匹配 key: 'value' 或 key: "value" 格式
      const matches = inner.matchAll(/(?:["']?)(\w+)(?:["']?)\s*:\s*(?:"([^"]*)"|'([^']*)'|(\d+))/g)
      for (const m of matches) {
        props[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
      }
    }
    return props
  } catch {
    return {}
  }
}

/**
 * 在编辑器文档中查找容器块。
 * 返回包含类型、属性和行位置的容器位置数组。
 */
export interface ContainerBlock {
  startPos: number      // ::: 打开行位置
  typeName: string      // 组件类型名称 (如 "linkCard")
  propsLineFrom: number // JSON 属性行起始位置
  propsLineTo: number   // JSON 属性行结束位置
  props: Record<string, string>
  endPos: number        // ::: 关闭行位置
}

export function findContainers(
  docText: string
): ContainerBlock[] {
  const containers: ContainerBlock[] = []
  const lines = docText.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(/^:::(\w+)$/)
    if (match) {
      const typeName = match[1]
      // 计算字符位置
      let charPos = 0
      for (let l = 0; l < i; l++) {
        charPos += lines[l].length + 1 // +1 for newline
      }

      // 查找下一行的 JSON 属性
      let props: Record<string, string> = {}
      let propsLineFrom = 0
      let propsLineTo = 0
      let propsLineIndex = i + 1

      if (propsLineIndex < lines.length) {
        const propsLine = lines[propsLineIndex].trim()
        const propsMatch = propsLine.match(/^\{[\s\S]*\}$/)
        if (propsMatch) {
          props = parseContainerProps(propsLine)
          propsLineFrom = charPos + line.length + 1
          propsLineTo = propsLineFrom + lines[propsLineIndex].length
        }
      }

      // 查找闭合 :::
      let endPos = 0
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === ':::') {
          let endCharPos = 0
          for (let l = 0; l < j; l++) {
            endCharPos += lines[l].length + 1
          }
          endPos = endCharPos
          i = j + 1
          break
        }
      }

      containers.push({
        startPos: charPos,
        typeName,
        propsLineFrom,
        propsLineTo,
        props,
        endPos,
      })
    }
    i++
  }

  return containers
}