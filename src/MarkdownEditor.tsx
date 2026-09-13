import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import type { ToolbarButtonConfig } from './types'
import type { PreviewOptions } from './components/Preview'
import { ReadOutlined } from '@ant-design/icons'
import './App.css'

export interface MarkdownEditorRef {
  getContent: () => string
}

export interface MarkdownEditorProps {
  /** 初始内容 */
  defaultValue?: string
  /** 受控内容 */
  value?: string
  /** 内容变化回调 */
  onChange?: (value: string) => void
  /** 是否显示预览面板 */
  showPreview?: boolean
  /** 是否支持全屏 */
  fullscreen?: boolean
  /** Preview 渲染配置 */
  previewOptions?: PreviewOptions
}

export default forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor({
  defaultValue = '',
  value,
  onChange,
  showPreview = true,
  fullscreen: fullscreenProp = false,
  previewOptions,
}, ref) {
  const [content, setContent] = useState(value ?? defaultValue)
  const [editorView, setEditorView] = useState<any>(null)
  const scrollDOMRef = useRef<HTMLElement | null>(null)
  const previewElRef = useRef<HTMLDivElement | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // 容器编辑弹窗状态
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogTypeName, setDialogTypeName] = useState('')
  const [dialogProps, setDialogProps] = useState<Record<string, string>>({})
  const [dialogPropsRange, setDialogPropsRange] = useState<[number, number]>([0, 0])

  // 受控模式：外部 value 变化时同步
  useEffect(() => {
    if (value !== undefined) {
      setContent(value)
    }
  }, [value])

  const internalSetContent = useCallback((newContent: string) => {
    setContent(newContent)
    onChange?.(newContent)
  }, [onChange])

  // 暴露 getContent 方法
  useImperativeHandle(ref, () => ({
    getContent: () => content,
  }), [content])

  // 全屏切换
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
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 从注册中心自动生成工具栏按钮
  const extraToolbarItems: ToolbarButtonConfig[] = componentRegistry.getAll().map(schema => {
    const defaultProps: Record<string, string> = {}
    for (const field of schema.fields) {
      defaultProps[field.key] = field.defaultValue ?? ''
    }
    const iconNode = schema.icon ?? <ReadOutlined />
    return {
      id: `container-${schema.name}`,
      label: schema.label,
      icon: () => iconNode,
      handler: (view, _state) => insertContainer(view, schema.name, defaultProps),
    }
  })

  // 滚动同步
  const handleScrollReady = useCallback((scrollDOM: HTMLElement) => {
    scrollDOMRef.current = scrollDOM
  }, [])

  // 设置滚动同步
  useEffect(() => {
    const source = scrollDOMRef.current
    const target = previewElRef.current
    if (!source || !target) return

    let rafId: number | null = null

    const listener = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const s = scrollDOMRef.current
        const t = previewElRef.current
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
  }, [previewElRef.current])

  const handlePreviewRef = useCallback((node: HTMLDivElement | null) => {
    previewElRef.current = node
  }, [])

  const handleViewReady = useCallback((view: any) => {
    setEditorView(view)
  }, [])

  // 编辑容器属性时触发
  const handleEditContainer = useCallback((_view: any, typeName: string, propsLineFrom: number, propsLineTo: number, currentProps: Record<string, string>) => {
    setDialogTypeName(typeName)
    setDialogProps({ ...currentProps })
    setDialogPropsRange([propsLineFrom, propsLineTo])
    setDialogVisible(true)
  }, [])

  // 保存容器属性
  const handleDialogSave = useCallback((newProps: Record<string, string>) => {
    setDialogVisible(false)
    if (editorView) {
      updateContainerProps(editorView, dialogPropsRange[0], dialogPropsRange[1], newProps)
    }
  }, [editorView, dialogPropsRange])

  // 关闭弹窗
  const handleDialogClose = useCallback(() => {
    setDialogVisible(false)
  }, [])

  return (
    <div className={fullscreen ? 'app fullscreen' : 'app'}>
      <Toolbar
        editorView={editorView}
        fullscreen={fullscreen}
        onToggleFullscreen={fullscreenProp ? toggleFullscreen : undefined}
        extraItems={extraToolbarItems}
      />
      {showPreview ? (
        <SplitPanels
          leftPanel={
            <Editor
              value={content}
              onChange={internalSetContent}
              onScrollReady={handleScrollReady}
              onViewReady={handleViewReady}
              onEditContainer={handleEditContainer}
            />
          }
          rightPanel={
            <Preview
              content={content}
              ref={handlePreviewRef}
              previewOptions={previewOptions}
            />
          }
        />
      ) : (
        <Editor
          value={content}
          onChange={internalSetContent}
          onScrollReady={handleScrollReady}
          onViewReady={handleViewReady}
          onEditContainer={handleEditContainer}
        />
      )}
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
})
