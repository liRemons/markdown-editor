import MarkdownEditor from './MarkdownEditor'
import defaultContent from './test.md?raw'
import { registerAll, configure, excludedSelectors } from 'remons-markdown-plugins'
import 'remons-markdown-plugins/style.css'
// demo 直接引用组件源码（不走库入口 index.ts），需显式携带库样式
import './styles/index.less'

// demo 远程服务地址由环境变量提供（.env.local: VITE_DEMO_REMOTE）
const remote = import.meta.env.VITE_DEMO_REMOTE ?? 'https://remons.cn:3008'

// 注入插件运行时配置：linkCard 的 OGP 抓取、相对链接兜底主机
configure({
  ogpHost: remote,
  defaultRemoteHost: remote,
})

// 预览配置提到模块级：引用永久稳定，配合 Preview/RenderMarkdown 的 memo，
// 避免宿主重渲染时重建对象导致的无谓子树比对与“初始化语义”配置被新引用遮蔽
const previewOptions = {
  showToc: true,
  incremental: true,
  // 增量渲染时跳过插件挂载容器，避免 morphdom 覆盖 data-md-persist 节点
  excludedSelectors,
  customRenderers: [(md: Parameters<typeof registerAll>[0]) => md.use(registerAll)],
}

function App() {
  return (
    <MarkdownEditor
      defaultValue={defaultContent}
      uploadConfig={{
        uploadUrl: `${remote}/content/uploadMarkdownImg`,
        onGetUploadUrl: (result) => {
          const path = result.data?.path
          return path?.startsWith('/') ? `${remote}${path}` : path || null
        },
      }}
      previewOptions={previewOptions}
    />
  )
}

export default App
