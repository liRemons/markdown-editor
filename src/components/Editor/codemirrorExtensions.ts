import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { Facet } from '@codemirror/state'
import { containerWidgetPlugin, containerEditCallback } from './containerWidget'
import type { OnEditContainer } from './containerWidget'
import { uploadFileToServer, isUploadConfigured, indentMarkdownList, dedentMarkdownList } from '../Toolbar/buttons'
import type { ImageUploadConfig } from '../../types'

/**
 * 图片上传配置 facet。
 * 传入 getter 而非配置本身：扩展只在 mount 时创建一次，
 * 运行期通过 getter 读取最新配置，避免闭包过期。
 */
const uploadConfigFacet = Facet.define<() => ImageUploadConfig | undefined, (() => ImageUploadConfig | undefined) | null>({
  combine: (values) => (values.length ? values[values.length - 1] : null),
})

/** 未配置上传时的提示回调 facet（同为 getter 形式） */
const messageFacet = Facet.define<() => (() => void) | undefined, (() => (() => void) | undefined) | null>({
  combine: (values) => (values.length ? values[values.length - 1] : null),
})

/** 粘贴事件处理：拦截图片并上传 */
const pasteHandler = EditorView.domEventHandlers({
  paste: (event: ClipboardEvent, view: EditorView) => {
    const files = event.clipboardData?.files
    if (!files) return false

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return false

    event.preventDefault()

    const uploadConfig = view.state.facet(uploadConfigFacet)?.()
    const showMessage = view.state.facet(messageFacet)?.()

    if (!isUploadConfigured(uploadConfig)) {
      showMessage?.()
      return true
    }

    // 首个插入替换粘贴时的选区；后续插入基于"最新文档末尾"追加，
    // 避免异步上传完成后使用过期位置导致插入错乱
    const config = uploadConfig
    let isFirst = true

    for (const file of imageFiles) {
      uploadFileToServer(file, config).then((url) => {
        if (!url) return
        const name = file.name.replace(/\.[^.]+$/, '')
        const insert = `![${name}](${url})`
        const { state } = view
        if (isFirst) {
          isFirst = false
          const { from, to } = state.selection.main
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + insert.length },
          })
        } else {
          const end = state.doc.length
          view.dispatch({
            changes: { from: end, insert: `\n${insert}` },
            selection: { anchor: end + insert.length + 1 },
          })
        }
      })
    }

    return true
  },
})

interface GetCodeMirrorExtensionsOptions {
  /** 编辑容器属性的回调函数 */
  onEditContainer?: OnEditContainer
  /** 获取最新图片上传配置（运行期求值） */
  getUploadConfig?: () => ImageUploadConfig | undefined
  /** 获取最新"未配置上传"提示回调（运行期求值） */
  getOnMessageNoUploadConfig?: () => (() => void) | undefined
}

export const getCodeMirrorExtensions = (opts?: GetCodeMirrorExtensionsOptions) => {
  const extensions = [
    markdown(),
    oneDark,
    // Tab/Shift-Tab 优先接管列表行：缩进 4 空格并重排子列表序号
    keymap.of([
      { key: 'Tab', run: indentMarkdownList },
      { key: 'Shift-Tab', run: dedentMarkdownList },
      ...defaultKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
    pasteHandler,
    EditorView.baseTheme({
      '.cm-scroller': {
        height: '100%',
        overflow: 'auto',
      },
      // 容器头行 Widget 样式
      '.container-widget-header': {
        display: 'inline',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      },
      '.container-widget-text': {
        fontWeight: 'bold',
        color: '#79c0ff',
      },
      // 容器属性行 Widget 样式
      '.container-widget-props': {
        display: 'inline',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        color: '#a5d6ff',
      },
      // 容器编辑按钮样式
      '.container-edit-btn': {
        display: 'inline-block',
        padding: '0 4px',
        fontSize: '12px',
        color: '#58a6ff',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '4px',
        verticalAlign: 'middle',
      },
      '.container-edit-btn:hover': {
        background: 'rgba(88, 166, 255, 0.16)',
      },
    }),
  ]

  // 添加容器 widget 插件
  extensions.push(containerWidgetPlugin)

  // 注册各类回调/配置 facet（getter 形式，运行期读取最新值）
  if (opts?.onEditContainer) {
    extensions.push(containerEditCallback.of(opts.onEditContainer))
  }
  if (opts?.getUploadConfig) {
    extensions.push(uploadConfigFacet.of(opts.getUploadConfig))
  }
  if (opts?.getOnMessageNoUploadConfig) {
    extensions.push(messageFacet.of(opts.getOnMessageNoUploadConfig))
  }

  return extensions
}

export default getCodeMirrorExtensions
