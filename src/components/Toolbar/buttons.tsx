import { EditorView } from '@codemirror/view'

/**
 * 在光标位置插入文本
 */
export function insertAtCursor(view: EditorView, before: string, after: string = '', placeholder: string = ''): void {
  const { from, to } = view.state.selection.main
  const selectedText = view.state.doc.sliceString(from, to)
  const insert = selectedText
    ? `${before}${selectedText}${after}`
    : `${before}${placeholder}${after}`
  view.dispatch({ changes: { from, to, insert } })
  if (!selectedText && placeholder) {
    view.dispatch({ selection: { anchor: from + before.length } })
  }
}

/**
 * 在当前行行首插入文本
 */
export function insertAtLineStart(view: EditorView, text: string): void {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  view.dispatch({ changes: { from: line.from, to: line.from, insert: text } })
  view.dispatch({ selection: { anchor: line.from + text.length } })
}

/**
 * 上传文件到服务器
 */
async function uploadFileToServer(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('https://remons.cn:3008/content/uploadMarkdownImg', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) return null

  const result = await response.json()

  if (result.code === 200 && result.success && result.data?.path) {
    return `https://remons.cn:3008${result.data.path}`
  }

  return null
}

/**
 * 图片上传：创建隐藏的 file input 触发选择，上传后插入 markdown 图片语法
 */
export function uploadImage(view: EditorView): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'

  input.addEventListener('change', async () => {
    if (!input.files || input.files.length === 0) return

    const file = input.files[0]
    const { from, to } = view.state.selection.main
    const selectedText = view.state.doc.sliceString(from, to) || '描述'

    const url = await uploadFileToServer(file)
    if (url) {
      const insert = `![${selectedText}](${url})`
      view.dispatch({ changes: { from, to, insert } })
    }

    input.remove()
  })

  document.body.appendChild(input)
  input.click()
}

/**
 * 用前缀和后缀包裹选中文本
 */
export function wrapSelection(view: EditorView, prefix: string, suffix: string): void {
  const { from, to, empty } = view.state.selection.main
  if (empty) return
  const selected = view.state.doc.sliceString(from, to)
  view.dispatch({ changes: { from, to, insert: `${prefix}${selected}${suffix}` } })
}

/**
 * 切换包裹：选中的文本已包含标签则移除，否则添加
 */
export function toggleWrap(
  view: EditorView,
  openTag: string,
  closeTag: string
): void {
  const { from, to, empty } = view.state.selection.main
  const doc = view.state.doc

  // 选区完整包含标签 → 移除
  if (!empty) {
    const selected = doc.sliceString(from, to)
    if (selected.startsWith(openTag) && selected.endsWith(closeTag)) {
      const inner = selected.slice(openTag.length, -closeTag.length)
      view.dispatch({ changes: { from, to, insert: inner } })
      return
    }
  }

  // 光标/选区在标签内部 → 查找当前行的标签并移除
  {
    const cursorPos = empty ? from : to
    const line = doc.lineAt(cursorPos)
    const lineText = doc.sliceString(line.from, line.to)
    const openIdx = lineText.indexOf(openTag)
    const closeIdx = lineText.lastIndexOf(closeTag)

    if (openIdx >= 0 && closeIdx > openIdx) {
      const absOpen = line.from + openIdx
      const absClose = line.from + closeIdx
      // 确认光标/选区在标签范围内
      if (cursorPos >= absOpen + openTag.length && cursorPos <= absClose) {
        const inner = doc.sliceString(absOpen + openTag.length, absClose)
        view.dispatch({
          changes: {
            from: absOpen,
            to: absClose + closeTag.length,
            insert: inner,
          },
        })
        return
      }
    }
  }

  // 默认：添加包裹
  wrapSelection(view, openTag, closeTag)
}