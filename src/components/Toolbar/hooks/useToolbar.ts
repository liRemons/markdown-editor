import { useCallback, useMemo } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ToolbarButtonConfig, ImageUploadConfig } from '../../../types'
import { createToolbarConfig } from '../config'
import { toggleWrap } from '../buttons'

export interface UseToolbarOptions {
  /** 第三方扩展的按钮配置，将追加到工具栏末尾 */
  extraItems?: ToolbarButtonConfig[]
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
}

export interface UseToolbarReturn {
  config: ToolbarButtonConfig[]
  handleClick: (button: ToolbarButtonConfig) => void
}

export function useToolbar(
  editorView: EditorView | null,
  options?: UseToolbarOptions
): UseToolbarReturn {
  const { extraItems, uploadConfig } = options || {}
  const config = useMemo(() => {
    const base = createToolbarConfig(uploadConfig)
    return extraItems ? [...base, ...extraItems] : base
  }, [extraItems, uploadConfig])

  const handleClick = useCallback((button: ToolbarButtonConfig) => {
    if (!editorView) return

    // 如果配置了 wrapTags，优先使用 toggleWrap
    if (button.wrapTags) {
      const [openTag, closeTag] = button.wrapTags
      toggleWrap(editorView, openTag, closeTag)
      return
    }

    // 有 handler 则执行自定义逻辑
    if (button.handler) {
      editorView.focus()
      button.handler(editorView, editorView.state)
    }
  }, [editorView])

  return { config, handleClick }
}