import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { getCodeMirrorExtensions } from './codemirrorExtensions'
import type { OnEditContainer } from './containerWidget'
import type { ImageUploadConfig } from '../../types'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onScrollReady?: (scrollDOM: HTMLElement) => void
  onViewReady?: (view: EditorView) => void
  /** 编辑容器属性的回调 */
  onEditContainer?: OnEditContainer
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
  /** 未配置上传时的提示回调 */
  onMessageNoUploadConfig?: () => void
}

export default function Editor({ value, onChange, onScrollReady, onViewReady, onEditContainer, uploadConfig, onMessageNoUploadConfig }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // 回调/配置经 ref 中转：扩展仅在 mount 时创建，getter 形式保证运行期始终读到最新引用
  const latestRef = useRef({ onChange, onEditContainer, uploadConfig, onMessageNoUploadConfig })
  latestRef.current = { onChange, onEditContainer, uploadConfig, onMessageNoUploadConfig }

  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      basicSetup,
      ...getCodeMirrorExtensions({
        getUploadConfig: () => latestRef.current.uploadConfig,
        getOnMessageNoUploadConfig: () => latestRef.current.onMessageNoUploadConfig,
        onEditContainer: (view, container) => latestRef.current.onEditContainer?.(view, container),
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          latestRef.current.onChange(update.state.doc.toString())
        }
      }),
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    if (viewRef.current) {
      onScrollReady?.(viewRef.current.scrollDOM)
      onViewReady?.(viewRef.current)
    }

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 外部 value 变化时更新编辑器内容：scrollSnapshot 保持滚动视口，避免整篇替换后跳顶
  // （新版 @codemirror/view 的 dispatch 为变长 TransactionSpec，效果需并入同一个 spec）
  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        effects: view.scrollSnapshot(),
        scrollIntoView: false,
      })
    }
  }, [value])

  return <div ref={editorRef} className="editor" />
}
