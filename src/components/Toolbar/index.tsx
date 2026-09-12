import React, { useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { Button } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import { useToolbar } from './hooks/useToolbar'
import { ToolbarItemRenderer } from './renderers/ToolbarItemRenderer'
import TableDropdown from './renderers/TableDropdown'
import type { ToolbarButtonConfig } from '../../types'

interface ToolbarProps {
  editorView: EditorView | null
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  /** 第三方扩展的按钮配置，将追加到工具栏末尾 */
  extraItems?: ToolbarButtonConfig[]
}

export default function Toolbar({ editorView, fullscreen, onToggleFullscreen, extraItems }: ToolbarProps) {
  const { config, handleClick } = useToolbar(editorView, extraItems)

  const renderFullscreen = useCallback(() => {
    if (!onToggleFullscreen) return null
    const Icon = fullscreen ? FullscreenExitOutlined : FullscreenOutlined
    return (
      <>
        <div className="toolbar-separator" />
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
      </>
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
      <div className="toolbar-separator" />
      <TableDropdown editorView={editorView} />
      {renderFullscreen()}
    </div>
  )
}