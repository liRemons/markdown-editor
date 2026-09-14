import { forwardRef, useEffect } from 'react'
import RenderMarkdown, { languagesCommon, initHighlighter } from 'remons-render-markdown';
import type { RenderMarkdownProps } from 'remons-render-markdown';
import 'remons-render-markdown/dist/index.css';

export type PreviewOptions = Omit<RenderMarkdownProps, 'content'> & {
  languages?: Record<string, any> | null | undefined
}

export interface PreviewProps {
  content: string
  previewOptions?: PreviewOptions
}


const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ content, previewOptions }, ref) => {
  useEffect(() => {
    initHighlighter({
      ...languagesCommon,
      ...(previewOptions?.languages ? previewOptions?.languages : {})
    })
  }, [previewOptions?.languages])

  return (
    <div ref={ref} className="preview">
      <RenderMarkdown isSlotMermaid content={content} {...previewOptions} />
    </div>
  )
})

Preview.displayName = 'Preview'

export default Preview