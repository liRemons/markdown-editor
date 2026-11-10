import type { Text } from '@codemirror/state'

/**
 * 标签包裹模式（wrapTags）的开标签属性存取。
 * 开标签文本形如 `<tag-base key="value" key2="value2">`，
 * 属性以 HTML 属性格式直出，渲染端 markdown-it HTML 直通即可生效。
 */

/**
 * 承载“当前选中标签基名”的弹窗元字段。
 * 单按钮多容器变体时，弹窗用此 key 的 select 选定输出哪个标签；
 * 它以 `__` 前缀标识为元数据，buildOpenTag 会跳过，不会写成 HTML 属性。
 */
export const TAG_BASE_KEY = '__tagBase'

/** 文档中一处已存在的标签包裹位置 */
export interface WrapInfo {
  /** 开标签起始位置（含 < ） */
  openFrom: number
  /** 开标签结束位置（不含 > ） */
  openTo: number
  /** 闭标签起始位置（含 < ） */
  closeFrom: number
  /** 闭标签结束位置（含 > ） */
  closeTo: number
  /** 标签名（不含 <> 与属性） */
  base: string
  /** 开标签原始文本 */
  openText: string
}

/** 从开/闭标签文本取标签名：`<u>` / `<center-container style="...">` → u / center-container */
export function parseTagBase(tag: string): string {
  return tag.replace(/^<\//, '').replace(/^</, '').replace(/>\s*$/, '').split(/\s+/)[0]
}

/** 解析开标签上的 HTML 属性对；值支持双引号、单引号与无引号三种写法 */
export function parseWrapAttributes(openTag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(openTag)) !== null) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

/** 属性值序列化：双引号是包裹检测的分隔符，必须转义；换行拆行会破坏单行包裹检测，折成空格；高危协议/表达式片段直接丢弃 */
function escapeAttrValue(value: string): string {
  if (/javascript:|vbscript:|expression\s*\(/i.test(value)) return ''
  return value.replace(/[\r\n]+/g, ' ').replace(/"/g, '&quot;')
}

/** 由标签名与属性对象重建开标签；空值与不安全属性省略 */
export function buildOpenTag(base: string, attrs: Record<string, unknown>): string {
  const parts = Object.entries(attrs)
    // `__` 前缀为弹窗元字段（如 __tagBase），不作为 HTML 属性直出
    .filter(([k]) => !k.startsWith('__'))
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .map(([k, v]) => [k, escapeAttrValue(String(v))] as const)
    .filter(([, escaped]) => escaped !== '')
    .map(([k, escaped]) => `${k}="${escaped}"`)
  return `<${base}${parts.length ? ' ' + parts.join(' ') : ''}>`
}

/**
 * 在文档中定位选区/光标处（同名标签、任意属性变体）的包裹。
 * 全文扫描出所有同名开/闭标签，返回“包含光标（或选区端点）的最内层一对”，
 * 因此跨行的块级包裹（开标签与闭标签不在同一行）同样能被逆向定位。
 * 找不到返回 null。
 */
export function findWrap(
  doc: Text,
  from: number,
  to: number,
  _empty: boolean,
  base: string
): WrapInfo | null {
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const text = doc.toString()
  const closeLen = `</${base}>`.length

  const opens: Array<{ start: number; end: number; text: string }> = []
  const openRe = new RegExp(`<${esc}(?:\\s[^<>]*)?>`, 'g')
  let m: RegExpExecArray | null
  while ((m = openRe.exec(text)) !== null) {
    opens.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
  }
  // 闭标签起点升序，与开标签按出现顺序就近配对（不支持同名标签嵌套，符合内容包裹场景）
  const closes: number[] = []
  const closeRe = new RegExp(`</${esc}>`, 'g')
  while ((m = closeRe.exec(text)) !== null) {
    closes.push(m.index)
  }

  // 定位包含 pos 的最内层包裹：取「起点 <= pos 且其配对闭标签终点 >= pos」中最靠后的开标签
  const enclosing = (pos: number): WrapInfo | null => {
    let found: WrapInfo | null = null
    for (const open of opens) {
      if (open.start > pos) break
      const closeFrom = closes.find(c => c >= open.end)
      if (closeFrom === undefined || pos > closeFrom + closeLen) continue
      found = {
        openFrom: open.start,
        openTo: open.end,
        closeFrom,
        closeTo: closeFrom + closeLen,
        base,
        openText: open.text,
      }
    }
    return found
  }

  // 优先按选区起点，其次终点（整体/部分选区、跨行均可命中）
  return enclosing(from) ?? (to > from ? enclosing(to) : null)
}
