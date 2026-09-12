import { forwardRef } from 'react'
import RenderMarkdown, { languagesCommon, initHighlighter } from 'remons-render-markdown';

import 'remons-render-markdown/dist/index.css'

initHighlighter(languagesCommon)

interface PreviewProps {
  content: string
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ content }, ref) => {
  return (
    <div ref={ref} className="preview">
      <RenderMarkdown content={content} isSlotMermaid />
    </div>

  )
})

Preview.displayName = 'Preview'

export default Preview