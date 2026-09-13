import { useState, useRef, useCallback } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import SplitPanels from './components/Panel/SplitPanels'
import Toolbar from './components/Toolbar'
import EditDialog from './components/Dialog/EditDialog'
import componentRegistry from './registry/componentRegistry'
import { updateContainerProps, insertContainer } from './utils/writeContainer'
import type { ToolbarButtonConfig, ImageUploadConfig } from './types'
import { ReadOutlined } from '@ant-design/icons'
import defaultContent from './test.md?raw'
import { useFullscreen } from './hooks/useFullscreen'
import { useScrollSync } from './hooks/useScrollSync'
import './styles/index.less'

function App() {
  const [content, setContent] = useState(defaultContent)
  const scrollDOMRef = useRef<HTMLElement | null>(null)
  const previewElRef = useRef<HTMLDivElement | null>(null)
  const [editorView, setEditorView] = useState<any>(null)
  const { fullscreen, toggleFullscreen } = useFullscreen()
  useScrollSync(scrollDOMRef, previewElRef)

  // 弹窗编辑状态
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogTypeName, setDialogTypeName] = useState('')
  const [dialogProps, setDialogProps] = useState<Record<string, string>>({})
  const [dialogPropsRange, setDialogPropsRange] = useState<[number, number]>([0, 0])

  const handleScrollReady = useCallback((scrollDOM: HTMLElement) => {
    scrollDOMRef.current = scrollDOM
  }, [])

  const handleViewReady = useCallback((view: any) => {
    setEditorView(view)
  }, [])

  const handlePreviewRef = useCallback((node: HTMLDivElement | null) => {
    previewElRef.current = node
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
    // 更新编辑器中的容器属性
    if (editorView) {
      updateContainerProps(editorView, dialogPropsRange[0], dialogPropsRange[1], newProps)
    }
  }, [editorView, dialogPropsRange])

  // 关闭弹窗
  const handleDialogClose = useCallback(() => {
    setDialogVisible(false)
  }, [])

  const containerItems: ToolbarButtonConfig[] = componentRegistry.getAll()
    .filter(schema => !schema.wrapTags)
    .map(schema => {
      const defaultProps: Record<string, string> = {}
      for (const field of schema?.fields ?? []) {
        defaultProps[field.key] = field.defaultValue ?? ''
      }
      return {
        id: `container-${schema.name}`,
        label: schema.label,
        icon: ReadOutlined,
        handler: (view, _state) => insertContainer(view, schema.name, defaultProps),
      }
    })

  const wrapItems: ToolbarButtonConfig[] = componentRegistry.getAll()
    .filter(schema => schema.wrapTags)
    .map(schema => ({
      id: `wrap-${schema.name}`,
      label: schema.label,
      icon: ReadOutlined,
      wrapTags: schema.wrapTags,
    }))

  const extraToolbarItems: ToolbarButtonConfig[] = [...containerItems, ...wrapItems]

  const uploadConfig: ImageUploadConfig = {
    uploadUrl: 'https://remons.cn:3008/content/uploadMarkdownImg',
    onGetUploadUrl: (result) => {
      const path = result.data?.path
      if (path && path.startsWith('/')) {
        return `https://remons.cn:3008${path}`
      }
      return path || null
    },
  }

  return (
    <div className={fullscreen ? 'markdown-editor-app fullscreen' : 'markdown-editor-app'}>
      <Toolbar editorView={editorView} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} extraItems={extraToolbarItems} uploadConfig={uploadConfig} />
      <SplitPanels
        leftPanel={
          <Editor
            value={content}
            uploadConfig={uploadConfig}
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
