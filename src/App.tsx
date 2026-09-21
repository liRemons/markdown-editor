import MarkdownEditor from './MarkdownEditor'
import defaultContent from './test.md?raw'
import { registerAll } from 'remons-markdown-plugins'
import 'remons-markdown-plugins/style.css'
import './styles/index.less'

function App() {
  return (
    <MarkdownEditor
      defaultValue={defaultContent}
      uploadConfig={{
        uploadUrl: 'https://remons.cn:3008/content/uploadMarkdownImg',
        onGetUploadUrl: (result) => {
          const path = result.data?.path
          return path?.startsWith('/') ? `https://remons.cn:3008${path}` : path || null
        },
      }}
      previewOptions={{
        showToc: true,
        useIncremental: true,
        customRenderers: [(md) => md.use(registerAll)],
      }}
    />
  )
}

export default App
