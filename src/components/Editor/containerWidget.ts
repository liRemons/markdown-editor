import { ViewPlugin, Decoration, WidgetType, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { EditorState, Facet, StateEffect } from '@codemirror/state'
import type { Transaction } from '@codemirror/state'
import { findContainers } from '../../utils/parseContainer'
import type { ContainerBlock } from '../../utils/parseContainer'
import componentRegistry from '../../registry/componentRegistry'

/**
 * 唤醒容器装饰重建的状态 effect（不改变文档）。
 * 编辑按钮是否展示取决于容器类型是否已注册，而宿主常在编辑器挂载之后才
 * 通过 useRegisterToolbar 异步注册 schema；注册不是 CodeMirror 事务，默认不会触发
 * ViewPlugin.update，导致初始化时烘焙的 registered=false 无法刷新（需手动改一个字才出现）。
 * 宿主在注册中心版本变化时 dispatch 本 effect，驱动插件重新求值 registered。
 */
export const refreshContainers = StateEffect.define<null>()

/**
 * 编辑容器属性的回调函数类型
 * @param view 当前编辑器实例
 * @param container 被点击编辑的容器块（含位置与最新属性）
 */
export type OnEditContainer = (view: EditorView, container: ContainerBlock) => void

/**
 * 自定义 facet 用于传递编辑回调
 */
export const containerEditCallback = Facet.define<OnEditContainer, OnEditContainer | null>({
  combine: (values) => (values.length ? values[values.length - 1] : null),
})

/**
 * 只读的容器头行 Widget（显示 :::typeName + 编辑按钮）
 * 使用 Decoration.replace 替换原始文本，使其不可直接编辑。
 * widget 直接携带所属容器索引与类型，点击时无需再做位置猜测。
 */
class ContainerHeaderWidget extends WidgetType {
  constructor(
    private typeName: string,
    private containerIndex: number,
    private registered: boolean,
    /** 嵌套在引用中时的原始前缀（如 "> "），整行被 widget 替换，需原样展示 */
    private quotePrefix: string
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span')
    container.className = 'container-widget-header'

    const text = document.createElement('span')
    text.className = 'container-widget-text'
    text.textContent = `${this.quotePrefix}:::${this.typeName}`
    container.appendChild(text)

    // 仅已注册的类型提供编辑入口，未注册容器（如 :::note）保持只读展示
    if (this.registered) {
      const button = document.createElement('button')
      button.className = 'container-edit-btn'
      button.title = `编辑 ${this.typeName}`
      button.textContent = '✎'
      button.dataset.containerIndex = String(this.containerIndex)
      button.dataset.typeName = this.typeName
      container.appendChild(button)
    }
    return container
  }

  eq(other: ContainerHeaderWidget): boolean {
    return (
      this.typeName === other.typeName &&
      this.containerIndex === other.containerIndex &&
      this.registered === other.registered &&
      this.quotePrefix === other.quotePrefix
    )
  }

  ignoreEvent(): boolean {
    return false
  }
}

/**
 * 只读的容器属性行 Widget（显示 { key: value, ... }）
 * 嵌套在引用中时原始行带 "> " 前缀，展示时剔除，与头行 widget 风格一致
 */
class ContainerPropsWidget extends WidgetType {
  constructor(
    private propsText: string,
    private quotePrefix: string
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'container-widget-props'
    const text = this.propsText.startsWith(this.quotePrefix)
      ? this.propsText.slice(this.quotePrefix.length)
      : this.propsText
    span.textContent = text
    return span
  }

  eq(other: ContainerPropsWidget): boolean {
    return this.propsText === other.propsText && this.quotePrefix === other.quotePrefix
  }

  ignoreEvent(): boolean {
    return false
  }
}

/**
 * 只读的容器结束行 Widget（显示 :::，嵌套引用时保留 "> " 前缀）
 */
class ContainerCloseWidget extends WidgetType {
  constructor(private text: string) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'container-widget-text'
    span.textContent = this.text
    return span
  }

  eq(other: ContainerCloseWidget): boolean {
    return this.text === other.text
  }

  ignoreEvent(): boolean {
    return false
  }
}

/**
 * 查找文档中的容器，创建 Decoration 装饰物
 * 将 ::: 头行、{} 属性行和 ::: 结束行替换为只读 widget，使其无法在编辑器中直接编辑
 */
function findContainerDecorations(state: EditorState): Array<{ from: number; to: number; value: Decoration }> {
  const containers = findContainers(state.doc.toString())
  const decorations: Array<{ from: number; to: number; value: Decoration }> = []

  containers.forEach((container, index) => {
    const headerLine = state.doc.lineAt(container.startPos)

    // 替换 :::typeName 头行为只读 widget
    decorations.push({
      from: headerLine.from,
      to: headerLine.to,
      value: Decoration.replace({
        widget: new ContainerHeaderWidget(
          container.typeName,
          index,
          container.registered,
          container.quotePrefix ?? ''
        ),
      }),
    })

    // 替换 {} 属性行为只读 widget
    if (container.propsLineFrom > 0 && container.propsLineTo > 0) {
      const propsLine = state.doc.lineAt(container.propsLineFrom)
      decorations.push({
        from: propsLine.from,
        to: propsLine.to,
        value: Decoration.replace({
          widget: new ContainerPropsWidget(propsLine.text, container.quotePrefix ?? ''),
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
          widget: new ContainerCloseWidget(endLine.text),
        }),
      })
    }
  })

  // 嵌套容器时，外层结束行的位置会晚于内层头行，按容器列表顺序并不等于位置顺序；
  // 而 Decoration.set(..., sorted=true) 要求区间已按 from 升序（from 相同时按 to 降序），
  // 否则报错导致整个插件产不出装饰（表现为所有编辑按钮消失），故先排序
  decorations.sort((a, b) => a.from - b.from || b.to - a.to)

  return decorations
}

/**
 * 点击编辑按钮时，依据按钮携带的容器索引回查最新属性并触发回调
 */
function handleEditButtonClick(event: MouseEvent, view: EditorView): boolean {
  const target = event.target as HTMLElement
  if (!target.classList.contains('container-edit-btn')) return false

  event.preventDefault()
  event.stopPropagation()

  const indexAttr = target.dataset.containerIndex
  if (indexAttr === undefined) return false

  const containers = findContainers(view.state.doc.toString())
  const container = containers[Number(indexAttr)]
  if (!container || !container.registered) return false

  const callback = view.state.facet(containerEditCallback)
  if (callback) {
    // 传入编辑时的最新属性，避免弹窗保存时使用过期位置
    callback(view, { ...container, props: { ...container.props } })
  }
  return true
}

/**
 * 容器编辑 ViewPlugin
 * 将容器的 ::: 头行和 {} 属性行替换为只读 widget，使其无法在编辑器中直接编辑。
 * 仅在文档内容变化时重建装饰，光标移动不触发全文扫描。
 */
export const containerWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    /** 上次构建装饰时的注册中心版本，用于感知异步注册（不能标 private，否则导出匿名类的 dts 报 TS4094） */
    registryVersion: number

    constructor(view: EditorView) {
      this.registryVersion = componentRegistry.getVersion()
      this.decorations = Decoration.set(findContainerDecorations(view.state), true)
    }

    update(update: { docChanged: boolean; state: EditorState; transactions: readonly Transaction[] }) {
      const registryChanged = componentRegistry.getVersion() !== this.registryVersion
      const woken = update.transactions.some((tr) => tr.effects.some((e) => e.is(refreshContainers)))
      if (update.docChanged || registryChanged || woken) {
        this.registryVersion = componentRegistry.getVersion()
        this.decorations = Decoration.set(findContainerDecorations(update.state), true)
      }
    }
  },
  {
    decorations: (value) => value.decorations,
    eventHandlers: {
      // 阻止编辑按钮的 mousedown 事件，防止焦点移动
      mousedown: (event: MouseEvent, _view: EditorView) => {
        const target = event.target as HTMLElement
        if (target.classList.contains('container-edit-btn')) {
          event.preventDefault()
          return true
        }
        return false
      },
      // 点击编辑按钮时触发回调
      click: handleEditButtonClick,
    },
  }
)
