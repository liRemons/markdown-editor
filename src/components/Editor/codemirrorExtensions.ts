import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { Facet } from '@codemirror/state'
import { containerWidgetPlugin, containerEditCallback } from './containerWidget'
import type { OnEditContainer } from './containerWidget'
import { uploadFileToServer, isUploadConfigured } from '../Toolbar/buttons'
import type { ImageUploadConfig } from '../../types'

/** 图片上传配置 facet */
const uploadConfigFacet = Facet.define<ImageUploadConfig | undefined, ImageUploadConfig | undefined>({
  combine: (values) => values[values.length - 1],
})

/** 未配置上传时的提示回调 facet */
const messageFacet = Facet.define<(() => void) | undefined, (() => void) | undefined>({
  combine: (values) => values[values.length - 1],
})

/** 粘贴事件处理：拦截图片并上传 */
const pasteHandler = EditorView.domEventHandlers({
  paste: (event: ClipboardEvent, view: EditorView) => {
    const files = event.clipboardData?.files
    if (!files) return false

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return false

    event.preventDefault()

    const uploadConfig = view.state.facet(uploadConfigFacet)
    const showMessage = view.state.facet(messageFacet)

    if (!isUploadConfigured(uploadConfig)) {
      showMessage?.()
      return true
    }

    // 上传所有粘贴的图片
    const { from, to } = view.state.selection.main
    let offset = 0

    for (const file of imageFiles) {
      uploadFileToServer(file, uploadConfig!).then((url) => {
        if (url) {
          const name = file.name.replace(/\.[^.]+$/, '')
          const insert = `![${name}](${url})`
          view.dispatch({ changes: { from: from + offset, to: to + offset, insert } })
          offset += insert.length
        }
      })
    }

    return true
  },
})

interface GetCodeMirrorExtensionsOptions {
  /** 编辑容器属性的回调函数 */
  onEditContainer?: OnEditContainer
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
  /** 未配置上传时的提示回调 */
  onMessageNoUploadConfig?: () => void
}

export const getCodeMirrorExtensions = (opts?: GetCodeMirrorExtensionsOptions) => {
  const extensions = [
    markdown(),
    oneDark,
    keymap.of([...defaultKeymap, indentWithTab]),
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

  // 如果有编辑回调，注册 facet
  if (opts?.onEditContainer) {
    extensions.push(containerEditCallback.of(opts.onEditContainer))
  }

  // 如果有图片上传配置，注册 facet
  if (opts?.uploadConfig) {
    extensions.push(uploadConfigFacet.of(opts.uploadConfig))
  }

  // 如果有消息回调，注册 facet
  if (opts?.onMessageNoUploadConfig) {
    extensions.push(messageFacet.of(opts.onMessageNoUploadConfig))
  }

  return extensions
}

export default getCodeMirrorExtensions