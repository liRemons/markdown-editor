import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { message } from 'antd'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import type { ToolbarButtonConfig, ImageUploadConfig } from './types'
import type { PreviewOptions } from './components/Preview'
import { ReadOutlined } from '@ant-design/icons'
import { useFullscreen } from './hooks/useFullscreen'
import { useScrollSync } from './hooks/useScrollSync'

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
  /** 图片上传配置 */
  uploadConfig?: ImageUploadConfig
}

export default forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor({
  defaultValue = '',
  value,
  onChange,
  showPreview = true,
  fullscreen: fullscreenProp = true,
  previewOptions,
  uploadConfig,
}, ref) {
  const [content, setContent] = useState(value ?? defaultValue)
  const [editorView, setEditorView] = useState<any>(null)
  const scrollDOMRef = useRef<HTMLElement | null>(null)
  const previewElRef = useRef<HTMLDivElement | null>(null)
  const { fullscreen, toggleFullscreen } = useFullscreen()
  useScrollSync(scrollDOMRef, previewElRef)

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

  // 从注册中心自动生成工具栏按钮
  const extraToolbarItems: ToolbarButtonConfig[] = componentRegistry.getAll().flatMap(schema => {
    // 支持 wrapTags 的标签包裹模式
    if (schema.wrapTags) {
      return {
        id: `wrap-${schema.name}`,
        label: schema.label,
        icon: () => (schema.icon ?? <ReadOutlined />),
        wrapTags: schema.wrapTags,
      }
    }
    // 容器插入模式
    const defaultProps: Record<string, string> = {}
    for (const field of schema?.fields ?? []) {
      defaultProps[field.key] = field.defaultValue ?? ''
    }
    return {
      id: `container-${schema.name}`,
      label: schema.label,
      icon: () => (schema.icon ?? <ReadOutlined />),
      handler: (view, _state) => insertContainer(view, schema.name, defaultProps),
    }
  })

  // 滚动同步 (already handled by useScrollSync hook)
  const handleScrollReady = useCallback((scrollDOM: HTMLElement) => {
    scrollDOMRef.current = scrollDOM
  }, [])

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
    <div className={fullscreen ? 'markdown-editor-app fullscreen' : 'markdown-editor-app'}>
      <Toolbar
        editorView={editorView}
        fullscreen={fullscreen}
        onToggleFullscreen={fullscreenProp ? toggleFullscreen : undefined}
        extraItems={extraToolbarItems}
        uploadConfig={uploadConfig}
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
              uploadConfig={uploadConfig}
              onMessageNoUploadConfig={() => message.warning('请先配置图片上传功能')}
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
          uploadConfig={uploadConfig}
          onMessageNoUploadConfig={() => message.warning('请先配置图片上传功能')}
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
