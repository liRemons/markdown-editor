import { Button, Dropdown, Tooltip } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { ComponentType, ReactNode } from 'react'
import type { ToolbarButtonConfig } from '../../../types'

interface Props {
  item: ToolbarButtonConfig
  onClick: (item: ToolbarButtonConfig) => void
}

/**
 * 渲染图标：统一接受组件类型；兼容传入 ReactNode 的旧用法。
 * 组件类型不仅指函数/class，也包括 forwardRef、memo 包装出的对象
 * （@ant-design/icons 即为 forwardRef，不能当作普通 child 直接渲染）。
 */
const REACT_FORWARD_REF = Symbol.for('react.forward_ref')
const REACT_MEMO = Symbol.for('react.memo')

function isComponentType(icon: unknown): boolean {
  if (typeof icon === 'function') return true
  if (typeof icon === 'object' && icon !== null) {
    const t = (icon as { $$typeof?: symbol }).$$typeof
    return t === REACT_FORWARD_REF || t === REACT_MEMO
  }
  return false
}

function renderIcon(icon: ComponentType | ReactNode): ReactNode {
  if (isComponentType(icon)) {
    const Icon = icon as ComponentType
    return <Icon />
  }
  // 非组件类型（string / number / 已构造的 React 元素等）直接作为节点渲染
  return icon as ReactNode
}

export function ToolbarItemRenderer({ item, onClick }: Props) {
  // 有 children 的渲染为下拉菜单：点击经 menu.onClick 分发，键盘选择菜单项同样生效
  if (item.children && item.children.length > 0) {
    return (
      <>
        {item.separatorBefore && <div className="toolbar-separator" />}
        <div className="toolbar-group">
          <Tooltip title={item.label}>
            <Dropdown
              menu={{
                items: item.children.map(child => ({
                  key: child.id ?? '',
                  label: (
                    <span>
                      {child.icon && renderIcon(child.icon)}
                      {' '}{child.label}
                    </span>
                  ),
                  disabled: child.disabled,
                })),
                onClick: ({ key }) => {
                  const child = item.children?.find(c => c.id === key)
                  if (child && !child.disabled) onClick(child)
                },
              }}
              placement="bottomLeft"
            >
              <Button className="toolbar-button" type="text" size="small">
                {item.icon && renderIcon(item.icon)}
                <DownOutlined style={{ fontSize: 10 }} />
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
            {item.icon && renderIcon(item.icon)}
          </Button>
        </Tooltip>
      </div>
    </>
  )
}
