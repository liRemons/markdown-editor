import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { getCodeMirrorExtensions } from './codemirrorExtensions'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onScrollReady?: (scrollDOM: HTMLElement) => void
  onViewReady?: (view: EditorView) => void
  /** 编辑容器属性的回调 */
  onEditContainer?: (view: any, typeName: string, propsLineFrom: number, propsLineTo: number, currentProps: Record<string, string>) => void
}

export default function Editor({ value, onChange, onScrollReady, onViewReady, onEditContainer }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      basicSetup,
      ...getCodeMirrorExtensions({ onEditContainer }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
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

    if (onScrollReady && viewRef.current) {
      onScrollReady(viewRef.current.scrollDOM)
    }

    if (onViewReady) {
      onViewReady(viewRef.current)
    }

    return () => {
      viewRef.current?.destroy()
    }
  }, [])

  // 外部 value 变化时更新编辑器内容
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      })
    }
  }, [value])

  return <div ref={editorRef} className="editor" />
}