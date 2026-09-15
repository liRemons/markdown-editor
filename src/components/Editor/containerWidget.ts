import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { EditorState, Facet } from '@codemirror/state'
import { findContainers } from '../../utils/parseContainer'
import componentRegistry from '../../registry/componentRegistry'

/**
 * 编辑容器属性的回调函数类型
 */
export interface OnEditContainer {
  (view: any, typeName: string, propsLineFrom: number, propsLineTo: number, currentProps: Record<string, string>): void
}

/**
 * 自定义 facet 用于传递编辑回调
 */
export const containerEditCallback = Facet.define<any, OnEditContainer>({
  combine: (values) => values[0],
})

/**
 * 只读的容器头行 Widget（显示 :::typeName + 编辑按钮）
 * 使用 Decoration.replace 替换原始文本，使其不可直接编辑
 */
class ContainerHeaderWidget extends WidgetType {
  public typeName: string

  constructor(typeName: string) {
    super()
    this.typeName = typeName
  }

  public toDOM(): HTMLElement {
    const container = document.createElement('span')
    container.className = 'container-widget-header'

    const text = document.createElement('span')
    text.className = 'container-widget-text'
    text.textContent = `:::${this.typeName}`

    const button = document.createElement('button')
    button.className = 'container-edit-btn'
    button.title = `编辑 ${componentRegistry.get(this.typeName)?.label ?? this.typeName}`
    button.textContent = '✎'
    ;(button as any).__typeName = this.typeName

    container.appendChild(text)
    container.appendChild(button)
    return container
  }

  public eq(other: ContainerHeaderWidget): boolean {
    return this.typeName === other.typeName
  }

  public ignoreEvent(): boolean {
    return false
  }
}

/**
 * 只读的容器属性行 Widget（显示 { key: value, ... }）
 * 使用 Decoration.replace 替换原始文本，使其不可直接编辑
 */
class ContainerPropsWidget extends WidgetType {
  public propsText: string

  constructor(propsText: string) {
    super()
    this.propsText = propsText
  }

  public toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'container-widget-props'
    span.textContent = this.propsText
    return span
  }

  public eq(other: ContainerPropsWidget): boolean {
    return this.propsText === other.propsText
  }

  public ignoreEvent(): boolean {
    return false
  }
}

/**
 * 只读的容器结束行 Widget（显示 :::）
 * 使用 Decoration.replace 替换原始文本，使其不可直接编辑
 */
class ContainerCloseWidget extends WidgetType {
  public toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'container-widget-text'
    span.textContent = ':::'
    return span
  }

  public eq(): boolean {
    return true
  }

  public ignoreEvent(): boolean {
    return false
  }
}

/**
 * 查找文档中的容器，创建 Decoration 装饰物
 * 将 ::: 头行、{} 属性行和 ::: 结束行替换为只读 widget，使其无法在编辑器中直接编辑
 */
function findContainerDecorations(state: EditorState): Array<{ from: number; to: number; value: Decoration }> {
  const docText = state.doc.toString()
  const containers = findContainers(docText)
  const decorations: Array<{ from: number; to: number; value: Decoration }> = []

  for (const container of containers) {
    const headerLine = state.doc.lineAt(container.startPos)

    // 替换 :::typeName 头行为只读 widget
    decorations.push({
      from: headerLine.from,
      to: headerLine.to,
      value: Decoration.replace({
        widget: new ContainerHeaderWidget(container.typeName),
      }),
    })

    // 替换 {} 属性行为只读 widget
    if (container.propsLineFrom > 0 && container.propsLineTo > 0) {
      const propsLine = state.doc.lineAt(container.propsLineFrom)
      const propsText = propsLine.text

      decorations.push({
        from: propsLine.from,
        to: propsLine.to,
        value: Decoration.replace({
          widget: new ContainerPropsWidget(propsText),
        }),
      })
    }

    // 替换 ::: 结束行为只读 widget
    if (container.endPos > 0) {
      const endLine = state.doc.lineAt(container.endPos)
      decorations.push({
        from: endLine.from,
        to: endLine.to,
        value: Decoration.replace({
          widget: new ContainerCloseWidget(),
        }),
      })
    }
  }

  return decorations
}

/**
 * 容器编辑 ViewPlugin
 * 将容器的 ::: 头行和 {} 属性行替换为只读 widget，使其无法在编辑器中直接编辑
 */
export const containerWidgetPlugin = ViewPlugin.fromClass(
  class {
    public decorations: DecorationSet

    constructor(view: any) {
      this.decorations = Decoration.set(findContainerDecorations(view.state), true)
    }

    public update(update: any) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = Decoration.set(findContainerDecorations(update.state), true)
      }
    }
  },
  {
    decorations: (value) => value.decorations,
    eventHandlers: {
      // 阻止编辑按钮的 mousedown 事件，防止焦点移动
      mousedown: (event: MouseEvent, view: any) => {
        const target = event.target as HTMLElement
        if (target.classList.contains('container-edit-btn')) {
          event.preventDefault()
          return true
        }
        return false
      },
      // 点击编辑按钮时触发回调
      click: (event: MouseEvent, view: any) => {
        const target = event.target as HTMLElement
        if (target.classList.contains('container-edit-btn')) {
          event.preventDefault()
          event.stopPropagation()
          const typeName = (target as any).__typeName
          if (typeName) {
            const docText = view.state.doc.toString()
            const containers = findContainers(docText)
            const buttonPos = view.posAtDOM(target)

            // 通过 button 位置匹配最近的容器头行，避免多个同类型容器匹配错误
            for (const container of containers) {
              const headerLine = view.state.doc.lineAt(container.startPos)
              // 按钮位置在头行的范围内（允许一定偏差，因为 widget 替换后位置可能略有偏移）
              if (buttonPos >= headerLine.from - 5 && buttonPos <= headerLine.to + 5) {
                const callback = view.state.facet(containerEditCallback)
                if (callback) {
                  callback(view, container.typeName, container.propsLineFrom, container.propsLineTo, { ...container.props })
                }
                return true
              }
            }
          }
          return false
        }
        return false
      },
    },
  }
)