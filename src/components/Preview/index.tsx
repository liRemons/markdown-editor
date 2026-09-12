import { forwardRef } from 'react'
import { registerAll, excludedSelectors } from 'remons-markdown-plugins';
import RenderMarkdown, { languagesCommon, initHighlighter } from 'remons-render-markdown';
import 'remons-markdown-plugins/style.css';
import 'remons-render-markdown/dist/index.css';

initHighlighter(languagesCommon)

interface PreviewProps {
  content: string
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ content }, ref) => {
  return (
    <div ref={ref} className="preview">
      <RenderMarkdown content={content} isSlotMermaid excludedSelectors={excludedSelectors} customRenderers={[(md) => md.use(registerAll)]} />
    </div>
  )
})

Preview.displayName = 'Preview'

export default Preview