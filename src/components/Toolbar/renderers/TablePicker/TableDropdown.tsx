import React, { useCallback, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { Button, Dropdown } from 'antd'
import { TableOutlined } from '@ant-design/icons'
import TablePicker from './index'

export default function TableDropdown({ editorView }: { editorView: EditorView | null }) {
  const [open, setOpen] = React.useState(false)
  const openCountRef = useRef(0)

  const handleTableSelect = useCallback((rows: number, cols: number) => {
    if (!editorView || rows <= 0 || cols <= 0) return
    editorView.focus()
    const headerCells = Array(cols).fill(null).map((_, i) => ` 列${i + 1} `).join('|')
    const separator = Array(cols).fill(' --- ').join('|')
    const dataCell = Array(cols).fill(' 内容 ').join('|')
    const dataRows = Array(rows).fill(`|${dataCell}|`).join('\n')
    const table = `\n|${headerCells}|\n|${separator}|\n${dataRows}\n`
    const { from } = editorView.state.selection.main
    editorView.dispatch({ changes: { from, insert: table } })
  }, [editorView])

  return (
    <Dropdown
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      popupRender={() => {
        openCountRef.current++
        return (
          <div style={{ padding: 4 }} onClick={(e) => e.stopPropagation()}>
            <TablePicker
              key={openCountRef.current}
              onSelect={(size) => {
                handleTableSelect(size.rows, size.cols)
                setOpen(false)
              }}
            />
          </div>
        )
      }}
      placement="bottomLeft"
    >
      <Button className="toolbar-button" type="text" size="small" title="表格">
        <TableOutlined />
      </Button>
    </Dropdown>
  )
}