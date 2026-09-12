import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { containerWidgetPlugin, containerEditCallback } from './containerWidget'
import type { OnEditContainer } from './containerWidget'

interface GetCodeMirrorExtensionsOptions {
  /** 编辑容器属性的回调函数 */
  onEditContainer?: OnEditContainer
}

export const getCodeMirrorExtensions = (opts?: GetCodeMirrorExtensionsOptions) => {
  const extensions = [
    markdown(),
    oneDark,
    keymap.of([...defaultKeymap, indentWithTab]),
    EditorView.lineWrapping,
    EditorView.baseTheme({
      '.cm-scroller': {
        height: '100%',
        overflow: 'auto',
      },
      // 容器头行 Widget 样式
      '.container-widget-header': {
        display: 'inline',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      },
      '.container-widget-text': {
        fontWeight: 'bold',
        color: '#79c0ff',
      },
      // 容器属性行 Widget 样式
      '.container-widget-props': {
        display: 'inline',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        color: '#a5d6ff',
      },
      // 容器编辑按钮样式
      '.container-edit-btn': {
        display: 'inline-block',
        padding: '0 4px',
        fontSize: '12px',
        color: '#58a6ff',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '4px',
        verticalAlign: 'middle',
      },
      '.container-edit-btn:hover': {
        background: 'rgba(88, 166, 255, 0.16)',
      },
    }),
  ]

  // 添加容器 widget 插件
  extensions.push(containerWidgetPlugin)

  // 如果有编辑回调，注册 facet
  if (opts?.onEditContainer) {
    extensions.push(containerEditCallback.of(opts.onEditContainer))
  }

  return extensions
}

export default getCodeMirrorExtensions