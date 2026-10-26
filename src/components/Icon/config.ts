import { createFromIconfontCN } from '@ant-design/icons';

/**
 * iconfont 运行时配置。
 * 与图标组件分离，避免组件模块混导非组件内容影响 Fast Refresh。
 */

/** 默认 iconfont 脚本地址 */
const DEFAULT_ICONFONT_SCRIPT_URL = 'https://at.alicdn.com/t/c/font_5241307_xoojyr52dqn.js'

let scriptUrl = DEFAULT_ICONFONT_SCRIPT_URL
let IconComp: ReturnType<typeof createFromIconfontCN> | null = null

/**
 * 配置 iconfont 脚本地址（宿主在应用入口调用），需在首次渲染前设置；
 * 变更后重置内部缓存，下次渲染时以新地址重建图标组件。
 */
export function setIconfontScriptUrl(url: string) {
  if (url === scriptUrl) return
  scriptUrl = url
  IconComp = null
}

/** 读取当前 iconfont 脚本地址 */
export function getIconfontScriptUrl(): string {
  return scriptUrl
}

/** 懒创建图标组件：首次渲染时才注入 iconfont 脚本，避免模块层副作用 */
export function getIconComponent() {
  if (!IconComp) {
    IconComp = createFromIconfontCN({ scriptUrl })
  }
  return IconComp
}
