import { useCallback, memo } from 'react'
import type { EditorView } from '@codemirror/view'
import { Button } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import { useToolbar } from './hooks/useToolbar'
import { ToolbarItemRenderer } from './renderers/ToolbarItemRenderer'
import TableDropdown from './renderers/TablePicker/TableDropdown'
import type { ToolbarButtonConfig, ImageUploadConfig, NotifyFn } from '../../types'

interface ToolbarProps {
  editorView: EditorView | null
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  /** 第三方扩展的按钮配置，将追加到工具栏末尾 */
  extraItems?: ToolbarButtonConfig[]
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
  /** 提示注入点（由宿主提供） */
  notify?: NotifyFn
}

function Toolbar({ editorView, fullscreen = true, onToggleFullscreen, extraItems, uploadConfig, notify }: ToolbarProps) {
  const { config, extraItemsConfig, handleClick } = useToolbar(editorView, { extraItems, uploadConfig, notify })

  const renderFullscreen = useCallback(() => {
    if (!onToggleFullscreen) return null
    const Icon = fullscreen ? FullscreenExitOutlined : FullscreenOutlined
    return (
      <Button
        className="toolbar-button"
        type="text"
        size="small"
        title={fullscreen ? '退出全屏' : '全屏'}
        onClick={() => {
          onToggleFullscreen()
        }}
      >
        <Icon />
      </Button>
    )
  }, [fullscreen, onToggleFullscreen])

  function isSeparator(item: ToolbarButtonConfig): boolean {
    return !!(!item.id && item.separatorBefore)
  }

  return (
    <div className="toolbar">
      {config.map((item, idx) => {
        if (isSeparator(item)) {
          return <div key={`sep-${idx}`} className="toolbar-separator" />
        }
        return (
          <ToolbarItemRenderer
            key={item.id}
            item={item}
            onClick={handleClick}
          />
        )
      })}
      <TableDropdown editorView={editorView} />
      {extraItemsConfig?.map((item, idx) => {
        if (isSeparator(item)) {
          return <div key={`extra-sep-${idx}`} className="toolbar-separator" />
        }
        return (
          <ToolbarItemRenderer
            key={item.id}
            item={item}
            onClick={handleClick}
          />
        )
      })}
      {renderFullscreen()}
    </div>
  )
}

// memo：工具栏是 props 的纯函数（无内部 state），各项 props 在输入时引用均稳定，
// content 变化不应连带重渲染整个工具栏
export default memo(Toolbar)