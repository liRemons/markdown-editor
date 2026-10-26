import { forwardRef, useEffect, memo } from 'react'
import RenderMarkdown, { languagesCommon, initHighlighter } from 'remons-render-markdown';
import type { RenderMarkdownProps } from 'remons-render-markdown';
import 'remons-render-markdown/dist/index.css';

export type PreviewOptions = Omit<RenderMarkdownProps, 'content'>

export interface PreviewProps {
  content: string
  /** 透传给 RenderMarkdown 的渲染配置 */
  previewOptions?: PreviewOptions
  /** 额外的高亮语言包（与 languagesCommon 合并注册） */
  languages?: Record<string, any> | null
}


const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ content, previewOptions, languages }, ref) => {
  useEffect(() => {
    initHighlighter({
      ...languagesCommon,
      ...(languages ?? {})
    })
  }, [languages])

  // 防御旧用法：即使运行时把 languages 传进了 previewOptions，也不会流入 RenderMarkdown
  const { languages: _ignored, ...restOptions } = (previewOptions ?? {}) as Record<string, unknown>

  return (
    <div ref={ref} className="preview">
      <RenderMarkdown content={content} {...(restOptions as PreviewOptions)} />
    </div>
  )
})

Preview.displayName = 'Preview'

// memo：content/previewOptions 引用不变时跳过重渲染，
// 避免编辑器其它 state（弹窗、全屏、view 就绪）连带 RenderMarkdown 重跑
export default memo(Preview)
