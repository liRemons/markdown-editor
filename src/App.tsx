import MarkdownEditor from './MarkdownEditor'
import { useRegisterToolbar } from './hooks/useRegisterToolbar'
import defaultContent from './test.md?raw'
import { registerAll, configure, excludedSelectors } from 'remons-markdown-plugins'
import 'remons-markdown-plugins/style.css'
import { LinkOutlined, TagOutlined, NotificationOutlined, EnvironmentOutlined, Html5Outlined } from '@ant-design/icons'
import type { ComponentSchema } from './types'
// demo 直接引用组件源码（不走库入口 index.ts），需显式携带库样式
import './styles/index.less'

// demo 远程服务地址由环境变量提供（.env.local: VITE_DEMO_REMOTE）
const remote = import.meta.env.VITE_DEMO_REMOTE ?? 'https://remons.cn:3008'

// 注入插件运行时配置：linkCard 的 OGP 抓取、相对链接兜底主机
configure({
  ogpHost: remote,
  defaultRemoteHost: remote,
})

// 工具栏容器 schema（仿 remons_website_manage 的 MdEditor）：
// 与 test.md 中使用的 badge / linkCard / shareCode 对应，注册后这些容器才会展示“编辑”按钮，
// 并从工具栏提供一键插入。稳定常量，避免每次渲染重复注册。
const TOOLBAR_SCHEMAS: ComponentSchema[] = [
  {
    name: 'badge',
    label: '徽章标签',
    icon: TagOutlined,
    fields: [
      {
        key: 'type',
        name: '类型',
        defaultValue: 'price',
        componentType: 'select',
        componentProps: {
          options: [
            { value: 'price', label: '价格/金额' },
            { value: 'time', label: '时间/时间范围' },
            { value: 'duration', label: '时长/用时' },
            { value: 'address', label: '地址/定位' },
            { value: 'distance', label: '距离/里程' },
            { value: 'reservation', label: '预约' },
            { value: 'parking', label: '停车' },
          ],
        },
      },
      { key: 'content', name: '内容', defaultValue: '', componentType: 'input', componentProps: { placeholder: '请输入内容' } },
    ],
  },
  {
    name: 'linkCard',
    label: '链接卡片',
    icon: LinkOutlined,
    fields: [
      { key: 'content', name: '链接地址', defaultValue: '', componentType: 'input', componentProps: { placeholder: '请输入链接地址' } },
    ],
  },
  {
    name: 'shareCode',
    label: '分享口令',
    icon: NotificationOutlined,
    fields: [
      {
        key: 'type',
        name: '类型',
        defaultValue: 'redbook',
        componentType: 'select',
        componentProps: {
          options: [
            { value: 'redbook', label: '小红书' },
            { value: 'ctrip', label: '携程' },
            { value: 'meituan', label: '美团' },
          ],
        },
      },
      { key: 'content', name: '口令内容', defaultValue: '', componentType: 'textarea', componentProps: { rows: 4, placeholder: '请输入分享口令，如：\n【淘宝】https://e.tb.cn/xxx' } },
    ],
  },
  {
    name: 'amap',
    label: '高德地图链接',
    icon: EnvironmentOutlined,
    fields: [
      { key: 'label', name: '地址', defaultValue: '', componentType: 'input', componentProps: { placeholder: '请输入地址名称，如：公司总部' } },
      { key: 'url', name: '高德分享链接', defaultValue: '', componentType: 'input', componentProps: { placeholder: '请输入高德地图分享链接' } },
    ],
  },
  {
    name: 'htmlTag',
    label: 'HTML 标签',
    icon: Html5Outlined,
    wrapTags: ['<plugin-container>', '</plugin-container>'],
  },
]

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
  // 将上方 schema 注册到全局工具栏/容器编辑（对应 :::name 的“编辑”入口）
  useRegisterToolbar(TOOLBAR_SCHEMAS)

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
