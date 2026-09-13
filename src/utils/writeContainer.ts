import type { EditorView } from '@codemirror/view'

/**
 * 从属性对象生成 JSON 属性行。
 * 格式: { key: 'value', key2: 'value2' }
 */
export function writeContainerProps(props: Record<string, string>): string {
  const entries = Object.entries(props)
    .map(([k, v]) => `${k}: '${v}'`)
    .join(', ')
  return entries ? `{ ${entries} }` : '{}'
}

/**
 * 更新编辑器文档中的容器属性。
 * 替换 JSON 属性行（::: 打开行之后的一行）为新属性。
 */
export function updateContainerProps(
  view: EditorView,
  propsLineFrom: number,
  propsLineTo: number,
  newProps: Record<string, string>
): void {
  const newPropsLine = writeContainerProps(newProps)
  view.dispatch({
    changes: {
      from: propsLineFrom,
      to: propsLineTo,
      insert: newPropsLine,
    },
  })
}

/**
 * 在当前光标位置插入新容器。
 * 创建 :::type 打开行 + JSON 属性 + ::: 关闭行的结构。
 */
export function insertContainer(
  view: EditorView,
  typeName: string,
  defaultProps: Record<string, string>
): void {
  const { from } = view.state.selection.main
  const propsLine = writeContainerProps(defaultProps)
  const container = `:::${typeName}\n${propsLine}\n:::\n`
  view.dispatch({ changes: { from, insert: container } })
}