import { useState, useRef, useCallback, useEffect } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import type { ToolbarButtonConfig } from './types'
import { ReadOutlined } from '@ant-design/icons'
import defaultContent from './test.md?raw'
import './App.css'

function App() {
  const [content, setContent] = useState(defaultContent)
  const [scrollDomReady, setScrollDomReady] = useState(false)
  const scrollDOMRef = useRef<HTMLElement | null>(null)
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null)
  const [editorView, setEditorView] = useState<any>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((e) => {
        console.error('退出全屏失败:', e)
      })
    } else {
      const el = document.documentElement
      const requestMethod = el.requestFullscreen ||
        (el as any).webkitRequestFullscreen ||
        (el as any).mozRequestFullScreen ||
        (el as any).msRequestFullscreen
      if (requestMethod) {
        requestMethod.call(el).catch((e) => {
          console.error('进入全屏失败:', e)
        })
      }
    }
  }, [])

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // WebKit/Chrome compatibility
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 弹窗编辑状态
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogTypeName, setDialogTypeName] = useState('')
  const [dialogProps, setDialogProps] = useState<Record<string, string>>({})
  const [dialogPropsRange, setDialogPropsRange] = useState<[number, number]>([0, 0])

  const handleScrollReady = useCallback((scrollDOM: HTMLElement) => {
    scrollDOMRef.current = scrollDOM
    setScrollDomReady(true)
  }, [])

  const handleViewReady = useCallback((view: any) => {
    setEditorView(view)
  }, [])

  // 设置滚动同步
  useEffect(() => {
    if (!scrollDomReady) return
    const source = scrollDOMRef.current
    const target = previewEl
    if (!source || !target) return

    let rafId: number | null = null

    const listener = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const s = scrollDOMRef.current
        const t = previewEl
        if (!s || !t) { rafId = null; return }
        const sourceScrollHeight = s.scrollHeight - s.clientHeight
        if (sourceScrollHeight <= 0) { rafId = null; return }
        const ratio = s.scrollTop / sourceScrollHeight
        const targetScrollHeight = t.scrollHeight - t.clientHeight
        if (targetScrollHeight > 0) {
          t.scrollTop = ratio * targetScrollHeight
        }
        rafId = null
      })
    }

    source.addEventListener('scroll', listener, { passive: true })

    return () => {
      source.removeEventListener('scroll', listener)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [scrollDomReady, previewEl])

  const handlePreviewRef = useCallback((node: HTMLDivElement | null) => {
    setPreviewEl(node)
  }, [])

  // 编辑容器属性时触发
  const handleEditContainer = useCallback((view: any, typeName: string, propsLineFrom: number, propsLineTo: number, currentProps: Record<string, string>) => {
    setDialogTypeName(typeName)
    setDialogProps({ ...currentProps })
    setDialogPropsRange([propsLineFrom, propsLineTo])
    setDialogVisible(true)
  }, [])

  // 保存容器属性
  const handleDialogSave = useCallback((newProps: Record<string, string>) => {
    setDialogVisible(false)
    // 更新编辑器中的容器属性
    if (editorView) {
      updateContainerProps(editorView, dialogPropsRange[0], dialogPropsRange[1], newProps)
    }
  }, [editorView, dialogPropsRange])

  // 关闭弹窗
  const handleDialogClose = useCallback(() => {
    setDialogVisible(false)
  }, [])

  const extraToolbarItems: ToolbarButtonConfig[] = componentRegistry.getAll().map(schema => {
    const defaultProps: Record<string, string> = {}
    for (const field of schema.fields) {
      defaultProps[field.key] = field.defaultValue ?? ''
    }
    return {
      id: `container-${schema.name}`,
      label: schema.label,
      icon: ReadOutlined,
      handler: (view, _state) => insertContainer(view, schema.name, defaultProps),
    }
  })

  return (
    <div className={fullscreen ? 'app fullscreen' : 'app'}>
      <Toolbar editorView={editorView} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} extraItems={extraToolbarItems} />
      <SplitPanels
        leftPanel={
          <Editor
            value={content}
            onChange={setContent}
            onScrollReady={handleScrollReady}
            onViewReady={handleViewReady}
            onEditContainer={handleEditContainer}
          />
        }
        rightPanel={
          <Preview
            content={content}
            ref={handlePreviewRef}
          />
        }
      />
      {/* 容器属性编辑弹窗 */}
      <EditDialog
        visible={dialogVisible}
        typeName={dialogTypeName}
        currentProps={dialogProps}
        onSave={handleDialogSave}
        onClose={handleDialogClose}
      />
    </div>
  )
}

export default App
