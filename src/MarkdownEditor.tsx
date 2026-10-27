import { useState, useRef, useCallback, useEffect, useMemo, useSyncExternalStore, forwardRef, useImperativeHandle } from 'react'
import type React from 'react'
import { App, message } from 'antd'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import { refreshContainers } from './components/Editor/containerWidget'
import type { ContainerBlock, ContainerProps } from './utils/parseContainer'
import type { ToolbarButtonConfig, ImageUploadConfig, ComponentSchema, NotifyFn } from './types'
import type { PreviewOptions } from './components/Preview'
import { ReadOutlined } from '@ant-design/icons'
import type { EditorView } from '@codemirror/view'
import { useFullscreen } from './hooks/useFullscreen'
import { useScrollSync } from './hooks/useScrollSync'

export interface MarkdownEditorRef {
  getContent: () => string
}

export interface MarkdownEditorProps {
  /** 初始内容（非受控） */
  defaultValue?: string
  /** 受控内容；传入时请同时提供 onChange，否则外部更新会覆盖本地编辑 */
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
  /**
   * 局部注册的容器 schema：仅对当前编辑器实例生效，
   * 同名时覆盖全局注册（useRegisterToolbar）的 schema。
   * 请传入稳定引用（组件外常量或 useMemo）。
   */
  schemas?: ComponentSchema[]
  /**
   * 提示注入点（如"请先配置图片上传功能"）。
   * 缺省使用宿主 antd App 上下文的 message，其次回退 console。
   */
  onNotify?: NotifyFn
}

/** 订阅注册中心版本，注册变化时触发重渲染 */
function useRegistryVersion(): number {
  const subscribe = useCallback((onChange: () => void) => componentRegistry.subscribe(onChange), [])
  const getSnapshot = useCallback(() => componentRegistry.getVersion(), [])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

const MarkdownEditorInner = (
  {
    defaultValue = '',
    value,
    onChange,
    showPreview = true,
    fullscreen: fullscreenProp = true,
    previewOptions,
    uploadConfig,
    schemas,
    onNotify,
  }: MarkdownEditorProps,
  ref: React.Ref<MarkdownEditorRef>
) => {
  const [content, setContent] = useState(value ?? defaultValue)
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [scrollDOM, setScrollDOM] = useState<HTMLElement | null>(null)
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null)
  const { fullscreen, toggleFullscreen } = useFullscreen()
  useScrollSync(scrollDOM, previewEl)

  // 容器编辑弹窗状态
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogTypeName, setDialogTypeName] = useState('')
  const [dialogContainer, setDialogContainer] = useState<ContainerBlock | null>(null)
  // 每次打开弹窗递增：作为 EditDialog 内 Form 的 key，重挂载使 initialValues 重新生效
  const [dialogSeq, setDialogSeq] = useState(0)

  const app = App.useApp()
  const notify = useCallback<NotifyFn>((type, text) => {
    if (onNotify) {
      onNotify(type, text)
      return
    }
    const messageApi = app?.message ?? message
    messageApi[type](text)
  }, [onNotify, app])

  // 受控模式：外部 value 变化时同步（跳过自身 onChange 引发的回环）
  const lastEmittedRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (value !== undefined && value !== lastEmittedRef.current) {
      setContent(value)
    }
  }, [value])

  const internalSetContent = useCallback((newContent: string) => {
    setContent(newContent)
    lastEmittedRef.current = newContent
    onChange?.(newContent)
  }, [onChange])

  // 暴露 getContent 方法
  useImperativeHandle(ref, () => ({
    getContent: () => content,
  }), [content])

  // 注册中心变化时重新生成工具栏按钮
  const registryVersion = useRegistryVersion()

  // schema 常在编辑器挂载之后才异步注册，而注册不是 CodeMirror 事务，
  // 不会触发 containerWidgetPlugin.update → 初始化时烘焙的 registered=false 得不到刷新，
  // 表现为“编辑按钮一开始没有、改一个字才出现”。版本变化时 dispatch 一个空 effect 唤醒插件重建装饰。
  useEffect(() => {
    editorView?.dispatch({ effects: refreshContainers.of(null) })
  }, [registryVersion, editorView])

  // 从注册中心（全局 + 局部）自动生成工具栏按钮
  const extraToolbarItems = useMemo<ToolbarButtonConfig[]>(() => {
    const merged = new Map<string, ComponentSchema>()
    for (const schema of componentRegistry.getAll()) {
      merged.set(schema.name, schema)
    }
    for (const schema of schemas ?? []) {
      merged.set(schema.name, schema)
    }
    return [...merged.values()].flatMap(schema => {
      // 支持 wrapTags 的标签包裹模式
      if (schema.wrapTags) {
        return {
          id: `wrap-${schema.name}`,
          label: schema.label,
          icon: schema.icon ?? ReadOutlined,
          wrapTags: schema.wrapTags,
        }
      }
      // 容器插入模式
      const defaultProps: ContainerProps = {}
      for (const field of schema.fields ?? []) {
        if (field.defaultValue !== undefined) {
          defaultProps[field.key] = field.defaultValue
        }
      }
      return {
        id: `container-${schema.name}`,
        label: schema.label,
        icon: schema.icon ?? ReadOutlined,
        handler: (view: EditorView) => insertContainer(view, schema.name, defaultProps),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryVersion, schemas])

  const handleScrollReady = useCallback((dom: HTMLElement) => {
    setScrollDOM(dom)
  }, [])

  const handlePreviewRef = useCallback((node: HTMLDivElement | null) => {
    setPreviewEl(node)
  }, [])

  const handleViewReady = useCallback((view: EditorView) => {
    setEditorView(view)
  }, [])

  // 编辑容器属性时触发
  const handleEditContainer = useCallback((_view: EditorView, container: ContainerBlock) => {
    setDialogTypeName(container.typeName)
    setDialogContainer(container)
    setDialogSeq((seq) => seq + 1)
    setDialogVisible(true)
  }, [])

  // 保存容器属性（仅写回编辑器，不关闭弹窗；关闭由 EditDialog 内部控制）
  const handleDialogSave = useCallback((newProps: ContainerProps) => {
    if (editorView && dialogContainer) {
      updateContainerProps(
        editorView,
        dialogContainer.startPos,
        dialogContainer.propsLineFrom,
        dialogContainer.propsLineTo,
        newProps,
        dialogContainer.quotePrefix
      )
    }
  }, [editorView, dialogContainer])

  // 关闭弹窗
  const handleDialogClose = useCallback(() => {
    setDialogVisible(false)
  }, [])

  const editorNode = (
    <Editor
      value={content}
      onChange={internalSetContent}
      onScrollReady={handleScrollReady}
      onViewReady={handleViewReady}
      onEditContainer={handleEditContainer}
      uploadConfig={uploadConfig}
      onMessageNoUploadConfig={() => notify('warning', '请先配置图片上传功能')}
    />
  )

  return (
    <div className={fullscreen ? 'markdown-editor-app fullscreen' : 'markdown-editor-app'}>
      <Toolbar
        editorView={editorView}
        fullscreen={fullscreen}
        onToggleFullscreen={fullscreenProp ? toggleFullscreen : undefined}
        extraItems={extraToolbarItems}
        uploadConfig={uploadConfig}
        notify={notify}
      />
      {showPreview ? (
        <SplitPanels
          leftPanel={editorNode}
          rightPanel={
            <Preview
              content={content}
              ref={handlePreviewRef}
              previewOptions={previewOptions}
            />
          }
        />
      ) : editorNode}
      {/* 容器属性编辑弹窗 */}
      <EditDialog
        visible={dialogVisible}
        typeName={dialogTypeName}
        currentProps={dialogContainer?.props ?? {}}
        initKey={dialogSeq}
        onSave={handleDialogSave}
        onClose={handleDialogClose}
      />
    </div>
  )
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(MarkdownEditorInner)

/**
 * 包一层 antd App：为库内部的 message 等反馈组件提供上下文；
 * 宿主已有 App 包裹时内层仅作兜底（component={false} 不额外渲染 DOM）。
 * 注意：必须用 forwardRef 透传 ref，React 18 下普通函数组件不接收 ref 属性，
 * 否则宿主通过 ref.getContent() 拿到的永远是空内容。
 */
const MarkdownEditorWithApp = forwardRef<MarkdownEditorRef, MarkdownEditorProps>((props, ref) => {
  return (
    <App component={false}>
      <MarkdownEditor {...props} ref={ref} />
    </App>
  )
})

export default MarkdownEditorWithApp
