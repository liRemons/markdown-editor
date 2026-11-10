import { useCallback, useMemo } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ToolbarButtonConfig, ImageUploadConfig, NotifyFn } from '../../../types'
import { createToolbarConfig } from '../config'
import { toggleWrap, wrapSelection } from '../buttons'
import { findWrap, parseTagBase, parseWrapAttributes, buildOpenTag, TAG_BASE_KEY, type WrapInfo } from '../../../utils/wrapTag'
import type { ContainerProps } from '../../../utils/parseContainer'

export interface UseToolbarOptions {
  /** 第三方扩展的按钮配置，将追加到工具栏末尾 */
  extraItems?: ToolbarButtonConfig[]
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
  /** 提示注入点（由宿主提供） */
  notify?: NotifyFn
  /** 打开 wrapTags 属性编辑弹窗（schema 配了 fields 时走此回调而非直接 toggle） */
  onOpenWrapDialog?: (info: WrapInfo | null, typeName: string, props: ContainerProps) => void
}

export interface UseToolbarReturn {
  config: ToolbarButtonConfig[]
  extraItemsConfig: ToolbarButtonConfig[]
  handleClick: (button: ToolbarButtonConfig) => void
}

export function useToolbar(
  editorView: EditorView | null,
  options?: UseToolbarOptions
): UseToolbarReturn {
  const { extraItems, uploadConfig, notify, onOpenWrapDialog } = options || {}
  const config = useMemo(() => {
    return createToolbarConfig({ upload: uploadConfig, notify })
  }, [uploadConfig, notify])

  const extraItemsConfig = useMemo(() => {
    return extraItems || []
  }, [extraItems])

  const handleClick = useCallback((button: ToolbarButtonConfig) => {
    if (!editorView) return

    // 配置了 wrapTags，优先使用标签包裹模式
    if (button.wrapTags) {
      const [openTag, closeTag] = button.wrapTags
      const defaultBase = parseTagBase(openTag)
      // 多变体：候选基名（缺省仅默认基名，行为与单标签一致）
      const bases = button.wrapBases?.length ? button.wrapBases : [defaultBase]
      const { from, to, empty } = editorView.state.selection.main

      // 逐个候选基名探测光标/选区是否已落在某个包裹内，命中即为当前类型
      let info: WrapInfo | null = null
      let hitBase = defaultBase
      for (const b of bases) {
        const found = findWrap(editorView.state.doc, from, to, empty, b)
        if (found) {
          info = found
          hitBase = b
          break
        }
      }

      // 配了 fields → 属性编辑模式：已包裹时回显开标签属性打开弹窗；
      // 未包裹时先用默认属性包裹，再唤起弹窗继续配置（类型可随后在弹窗内切换）
      if (button.fields?.length && onOpenWrapDialog) {
        // 空选区且未命中存量包裹：无可包裹内容，不弹无目标的弹窗
        if (!info && empty) {
          notify?.('warning', '请先选中要包裹的文本')
          return
        }
        // 默认属性（排除承载标签基名的元字段 __tagBase）
        const defaultAttrs: ContainerProps = {}
        let defaultType: string | undefined
        for (const field of button.fields) {
          if (field.key === TAG_BASE_KEY) {
            if (field.defaultValue !== undefined) defaultType = String(field.defaultValue)
            continue
          }
          if (field.defaultValue !== undefined) defaultAttrs[field.key] = field.defaultValue
        }
        let nextInfo = info
        if (!info) {
          hitBase = defaultType ?? hitBase
          nextInfo = wrapSelection(editorView, buildOpenTag(hitBase, defaultAttrs), `</${hitBase}>`)
        }
        const attrs = nextInfo ? parseWrapAttributes(nextInfo.openText) : defaultAttrs
        editorView.focus()
        // typeName 传 schema 名供弹窗稳定解析 schema；当前类型基名经 __tagBase 随属性一起回传
        onOpenWrapDialog(nextInfo, button.schemaName ?? hitBase, { ...defaultAttrs, ...attrs, [TAG_BASE_KEY]: hitBase })
        return
      }

      toggleWrap(editorView, openTag, closeTag)
      return
    }

    // 有 handler 则执行自定义逻辑
    if (button.handler) {
      editorView.focus()
      button.handler(editorView, editorView.state)
    }
  }, [editorView, onOpenWrapDialog])

  return { config, extraItemsConfig, handleClick }
}