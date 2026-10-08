import { EditorView } from '@codemirror/view'
import type { ImageUploadConfig } from '../../types'

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
 * 切换标题：
 * - 当前行已是目标级别标题 → 移除行首 # 前缀（变回普通文本）
 * - 当前行是其他级别标题 → 替换为目标级别
 * - 当前行是普通文本 → 插入目标级别前缀
 * @param view - CodeMirror 编辑器实例
 * @param level - 标题级别（1-6）
 */
export function toggleHeading(view: EditorView, level: number): void {
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  const m = line.text.match(/^(\s*)(#{1,6})(\s+|\s*$)/)
  const indent = m ? m[1] : ''
  const text = '#'.repeat(level) + ' '
  if (m && m[2].length === level) {
    // 已是目标级别：移除 # 前缀，保留行首缩进
    view.dispatch({ changes: { from: line.from, to: line.from + m[0].length, insert: indent } })
  } else {
    view.dispatch({ changes: { from: line.from, to: m ? line.from + m[0].length : line.from, insert: indent + text } })
    view.dispatch({ selection: { anchor: line.from + indent.length + text.length } })
  }
}

/**
 * 切换任务列表（checkbox 待办）
 * - 支持多行：对选区内每一行应用 `- [ ] `
 * - 普通列表项（如 `- 内容`）直接转换为 `- [ ] 内容`
 * - 切换：若所有目标行都已是任务项，则移除行首前缀
 */
export function toggleTaskList(view: EditorView): void {
  const doc = view.state.doc
  const { from, to } = view.state.selection.main
  const first = doc.lineAt(from)
  const last = doc.lineAt(to)

  const lines: Array<ReturnType<typeof doc.line>> = []
  for (let n = first.number; n <= last.number; n++) {
    lines.push(doc.line(n))
  }

  const taskRe = /^(\s*)([-*+])\s\[( |x)\]\s?/
  const allTask = lines.every((line) => taskRe.test(line.text))

  const changes: Array<{ from: number; to: number; insert: string }> = []
  for (const line of lines) {
    const taskMatch = line.text.match(taskRe)
    if (taskMatch) {
      changes.push({
        from: line.from,
        to: line.from + taskMatch[0].length,
        insert: allTask ? '' : `${taskMatch[1]}${taskMatch[2]} [ ] `,
      })
    } else {
      const bulletMatch = line.text.match(/^(\s*)([-*+])\s/)
      if (bulletMatch) {
        // 普通列表项：把 bullet 后第一个空格替换为 " [ ] "
        const idx = line.from + bulletMatch[1].length + bulletMatch[2].length
        changes.push({ from: idx, to: idx + 1, insert: ' [ ] ' })
      } else {
        changes.push({ from: line.from, to: line.from, insert: '- [ ] ' })
      }
    }
  }
  view.dispatch({ changes })
}

/**
 * 切换行首前缀（支持多行选区）
 * - 已是对应前缀的行 → 移除前缀（变回普通文本）
 * - 未加前缀的行 → 在行首插入前缀
 * @param view - CodeMirror 编辑器实例
 * @param pattern - 匹配行首前缀的正则
 * @param insertText - 未匹配时插入的前缀文本
 */
export function toggleLinePrefix(view: EditorView, pattern: RegExp, insertText: string): void {
  const doc = view.state.doc
  const { from, to } = view.state.selection.main
  const first = doc.lineAt(from)
  const last = doc.lineAt(Math.max(to, from))

  const changes: Array<{ from: number; to: number; insert: string }> = []
  for (let n = first.number; n <= last.number; n++) {
    const line = doc.line(n)
    const m = line.text.match(pattern)
    if (m) {
      // 已有前缀：移除
      changes.push({ from: line.from, to: line.from + m[0].length, insert: '' })
    } else {
      // 无前缀：行首插入
      changes.push({ from: line.from, to: line.from, insert: insertText })
    }
  }
  view.dispatch({ changes })
}

/**
 * 上传图片
 * @param file - 要上传的文件
 * @param uploadConfig - 上传配置
 */
export async function uploadFileToServer(
  file: File,
  uploadConfig: ImageUploadConfig
): Promise<string | null> {
  // 优先使用自定义上传函数
  if (uploadConfig.onUploadImage) {
    return uploadConfig.onUploadImage(file)
  }

  // 使用 uploadUrl 上传
  if (uploadConfig.uploadUrl) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(uploadConfig.uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) return null

    const result = await response.json()
    
    // 如果外部提供了 URL 提取回调，使用它
    if (uploadConfig.onGetUploadUrl) {
      return uploadConfig.onGetUploadUrl(result)
    }
    
    // 默认行为
    return result.data?.path || null
  }

  return null
}

/**
 * 判断是否配置了图片上传
 */
export function isUploadConfigured(
  uploadConfig?: ImageUploadConfig
): boolean {
  return !!(uploadConfig?.uploadUrl || uploadConfig?.onUploadImage)
}

/**
 * 图片上传：创建隐藏的 file input 触发选择，上传后插入 markdown 图片语法
 * @param view - CodeMirror 编辑器实例
 * @param uploadConfig - 上传配置（包含 uploadUrl 或 onUploadImage）
 */
export function uploadImage(
  view: EditorView,
  uploadConfig: ImageUploadConfig
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'

  input.addEventListener('change', async () => {
    if (!input.files || input.files.length === 0) return

    const file = input.files[0]
    const { from, to } = view.state.selection.main
    const selectedText = view.state.doc.sliceString(from, to) || '描述'

    const url = await uploadFileToServer(file, uploadConfig)
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