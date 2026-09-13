import MarkdownEditor from './MarkdownEditor'
import defaultContent from './test.md?raw'
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
    />
  )
}

export default App
