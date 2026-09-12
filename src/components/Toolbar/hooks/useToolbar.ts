import { useCallback, useMemo } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ToolbarButtonConfig } from '../../../types'
import { createToolbarConfig } from '../config'

export interface UseToolbarReturn {
  config: ToolbarButtonConfig[]
  handleClick: (button: ToolbarButtonConfig) => void
}

export function useToolbar(
  editorView: EditorView | null,
  extraItems?: ToolbarButtonConfig[]
): UseToolbarReturn {
  const config = useMemo(() => {
    const base = createToolbarConfig()
    return extraItems ? [...base, { separatorBefore: true }, ...extraItems] : base
  }, [extraItems])

  const handleClick = useCallback((button: ToolbarButtonConfig) => {
    if (button.handler && editorView) {
      editorView.focus()
      button.handler(editorView, editorView.state)
    }
  }, [editorView])

  return { config, handleClick }
}