import { useCallback, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { Button, Dropdown } from 'antd'
import { TableOutlined } from '@ant-design/icons'
import TablePicker from './index'

export default function TableDropdown({ editorView }: { editorView: EditorView | null }) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
  }, [])

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
      onOpenChange={handleOpenChange}
      destroyOnHidden
      popupRender={() => (
        <div style={{ padding: 4 }}>
          <TablePicker
            onSelect={(size) => {
              handleTableSelect(size.rows, size.cols)
              setOpen(false)
            }}
          />
        </div>
      )}
      placement="bottomLeft"
    >
      <Button className="toolbar-button" type="text" size="small" title="表格">
        <TableOutlined />
      </Button>
    </Dropdown>
  )
}
