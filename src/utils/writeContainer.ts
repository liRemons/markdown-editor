import type { EditorView } from '@codemirror/view'
import JSON5 from 'json5'
import type { ContainerProps } from './parseContainer'

/**
 * 从属性对象生成属性行。
 * 使用 JSON5 序列化：单引号风格与旧格式兼容，特殊字符会被正确转义，
 * 配合 parseContainerProps 保证读写往返无损。
 */
export function writeContainerProps(props: ContainerProps): string {
  return JSON5.stringify(props) ?? '{}'
}

/**
 * 更新编辑器文档中的容器属性。
 * 已有属性行则整行替换；没有属性行则在容器头行后插入一行。
 * @param headerPos 容器头行（:::type）任意位置，用于无属性行时定位插入点
 */
export function updateContainerProps(
  view: EditorView,
  headerPos: number,
  propsLineFrom: number,
  propsLineTo: number,
  newProps: ContainerProps
): void {
  const newPropsLine = writeContainerProps(newProps)
  if (propsLineTo > propsLineFrom) {
    view.dispatch({
      changes: { from: propsLineFrom, to: propsLineTo, insert: newPropsLine },
    })
  } else {
    const headerLine = view.state.doc.lineAt(headerPos)
    view.dispatch({
      changes: { from: headerLine.to, insert: `\n${newPropsLine}` },
    })
  }
}

/**
 * 在当前光标位置插入新容器。
 * 创建 :::type 打开行 + 属性行 + ::: 关闭行的结构。
 */
export function insertContainer(
  view: EditorView,
  typeName: string,
  defaultProps: ContainerProps
): void {
  const { from } = view.state.selection.main
  const propsLine = writeContainerProps(defaultProps)
  const container = `\n:::${typeName}\n${propsLine}\n:::\n`
  view.dispatch({ changes: { from, insert: container } })
  // 光标停在容器正文起始处
  view.dispatch({ selection: { anchor: from + `\n:::${typeName}\n${propsLine}\n`.length } })
}
