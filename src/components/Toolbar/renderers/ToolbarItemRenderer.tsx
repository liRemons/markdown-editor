import { Button, Dropdown, Tooltip } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { ToolbarButtonConfig } from '../../../types'

interface Props {
  item: ToolbarButtonConfig
  onClick: (item: ToolbarButtonConfig) => void
}

export function ToolbarItemRenderer({ item, onClick }: Props) {
  const Icon = item.icon!

  // 有 children 的渲染为下拉菜单
  if (item.children && item.children.length > 0) {
    return (
      <>
        {item.separatorBefore && <div className="toolbar-separator" />}
        <div className="toolbar-group">
          <Tooltip title={item.label}>
          <Dropdown
            menu={{
              items: item.children.map(child => ({
                type: 'item',
                key: child.id ?? '',
                label: (
                  <span onClick={() => onClick(child)}>
                    {child.icon && (() => { const ChildIcon = child.icon; return <ChildIcon />; })()}
                    {' '}{child.label}
                  </span>
                ),
              })),
            }}
            placement="bottomLeft"
          >
            <Button className="toolbar-button" type="text" size="small">
              <Icon />
              <DownOutlined style={{ marginLeft: 2, fontSize: 10 }} />
            </Button>
          </Dropdown>
        </Tooltip>
        </div>
      </>
    )
  }

  // 普通按钮
  const isDisabled = item.disabled
  return (
    <>
      {item.separatorBefore && <div className="toolbar-separator" />}
      <div className="toolbar-group">
        <Tooltip title={item.label}>
          <Button
            id={item.id}
            className="toolbar-button"
            type="text"
            size="small"
            disabled={isDisabled}
            onClick={() => !isDisabled && onClick(item)}
          >
            <Icon />
          </Button>
        </Tooltip>
      </div>
    </>
  )
}