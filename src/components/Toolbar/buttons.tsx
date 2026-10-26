import { EditorView } from '@codemirror/view'
import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
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

/** Markdown 列表行：缩进 + 列表标记（无序/有序）+ 空白 */
const LIST_LINE_RE = /^(\s*)([-*+]|\d+\.)([ \t]+)/
/** 列表缩进台阶：4 个空格，确保缩进后能被解析为子列表 */
const LIST_INDENT_WIDTH = 4

interface ListLineInfo {
  /** 当前缩进宽度 */
  indent: number
  /** 缩进调整后的宽度 */
  nextIndent: number
  /** 当前有序列表序号（无序列表为 null） */
  order: number | null
  /** 缩进调整后的序号 */
  nextOrder: number | null
}

/** 判断位置是否位于代码块内（代码块内不参与列表缩进逻辑） */
function isInCodeBlock(state: EditorState, pos: number): boolean {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1)
  while (node) {
    if (node.name === 'FencedCode' || node.name === 'CodeBlock') return true
    node = node.parent
  }
  return false
}

/**
 * 向上查找同缩进的前一个列表项，返回其序号
 * - 跳过更深的子列表行和空行
 * - 遇到非列表内容或更浅层列表时结束
 */
function findPrevSiblingOrder(
  state: EditorState,
  plans: Map<number, ListLineInfo>,
  lineNo: number,
  indent: number
): number | null {
  const doc = state.doc
  for (let n = lineNo - 1; n >= 1; n--) {
    const plan = plans.get(n)
    if (plan) {
      if (plan.nextIndent === indent) return plan.nextOrder
      if (plan.nextIndent < indent) return null
      continue
    }

    const text = doc.line(n).text
    if (!text.trim()) continue
    const m = text.match(LIST_LINE_RE)
    if (!m) return null
    const lineIndent = m[1].length
    if (lineIndent === indent) {
      return /^\d+\.$/.test(m[2]) ? parseInt(m[2], 10) : null
    }
    if (lineIndent < indent) return null
  }
  return null
}

/**
 * 计算列表行缩进/反缩进的变更
 * - 仅当所有选区行都是列表行时生效，否则返回 null 交给默认缩进行为
 * - 有序列表缩进后重新编号，保证新一级子列表从 1 开始
 */
function planListIndent(
  view: EditorView,
  direction: 1 | -1
): Array<{ from: number; to: number; insert: string }> | null {
  const { state } = view
  const doc = state.doc
  const plans = new Map<number, ListLineInfo>()

  for (const range of state.selection.ranges) {
    const first = doc.lineAt(range.from).number
    const last = doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) {
      if (plans.has(n)) continue
      const line = doc.line(n)
      if (isInCodeBlock(state, line.from)) return null
      const m = line.text.match(LIST_LINE_RE)
      if (!m) return null
      const indent = m[1].length
      plans.set(n, {
        indent,
        nextIndent: direction === 1 ? indent + LIST_INDENT_WIDTH : Math.max(0, indent - LIST_INDENT_WIDTH),
        order: /^\d+\.$/.test(m[2]) ? parseInt(m[2], 10) : null,
        nextOrder: null,
      })
    }
  }

  if (plans.size === 0) return null

  // 按行号升序计算缩进后的序号
  const ordered = [...plans.entries()].sort((a, b) => a[0] - b[0])
  for (const [lineNo, info] of ordered) {
    if (info.order === null) continue
    const prevOrder = findPrevSiblingOrder(state, plans, lineNo, info.nextIndent)
    info.nextOrder = prevOrder === null ? 1 : prevOrder + 1
  }

  // 每行只替换行首前缀，避免多个变更位置重叠
  return ordered.map(([lineNo, info]) => {
    const line = doc.line(lineNo)
    const m = line.text.match(LIST_LINE_RE)!
    const indentChanged = direction === 1 || info.indent > 0
    const useNextOrder =
      indentChanged && info.order !== null && info.nextOrder !== null && info.order !== info.nextOrder
    return {
      from: line.from,
      to: line.from + m[0].length,
      insert: ' '.repeat(info.nextIndent) + (useNextOrder ? `${info.nextOrder}.` : m[2]) + m[3],
    }
  })
}

/**
 * Tab：列表行缩进一级（4 空格）
 * - 普通行返回 false，继续走默认缩进
 * - 有序列表缩进后重排序号，子列表从 1 开始
 */
export function indentMarkdownList(view: EditorView): boolean {
  const changes = planListIndent(view, 1)
  if (!changes) return false
  view.dispatch({ changes, userEvent: 'input.indent' })
  return true
}

/**
 * Shift-Tab：列表行反缩进一级
 * - 普通行返回 false，继续走默认缩进
 * - 有序列表反缩进后并入上一层并重排序号
 */
export function dedentMarkdownList(view: EditorView): boolean {
  const changes = planListIndent(view, -1)
  if (!changes) return false
  view.dispatch({ changes, userEvent: 'delete.dedent' })
  return true
}

/**
 * 上传图片：失败（含网络异常）统一返回 null，不抛错
 * @param file - 要上传的文件
 * @param uploadConfig - 上传配置
 */
export async function uploadFileToServer(
  file: File,
  uploadConfig: ImageUploadConfig
): Promise<string | null> {
  try {
    // 优先使用自定义上传函数
    if (uploadConfig.onUploadImage) {
      return await uploadConfig.onUploadImage(file)
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

      const result: unknown = await response.json()

      // 如果外部提供了 URL 提取回调，使用它
      if (uploadConfig.onGetUploadUrl) {
        return uploadConfig.onGetUploadUrl(result)
      }

      // 默认行为
      const path = (result as { data?: { path?: string } })?.data?.path
      return path ?? null
    }

    return null
  } catch {
    return null
  }
}

/**
 * 判断是否配置了图片上传（类型谓词，守卫后可安全访问配置）
 */
export function isUploadConfigured(
  uploadConfig?: ImageUploadConfig
): uploadConfig is ImageUploadConfig {
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