import { useEffect, useRef } from 'react'

/**
 * 双向滚动同步 Hook
 * 编辑器与预览区互相同步滚动位置（基于比例）
 * 使用 syncing 锁防止双向循环触发
 *
 * source：编辑器滚动容器（.cm-scroller），挂载即存在且稳定，直接绑监听。
 * host + targetSelector：预览侧。真正的滚动元素 .markdown > .markdown-html 是
 *   「易变节点」——增量渲染首帧可能还没内容（渲染的是 <Empty/>）、内容清空重填时还会
 *   卸载重挂。若在挂载时把它缓存起来，就会因首帧时序或重挂而绑到不存在/已脱离的节点，
 *   表现为「同步偶现失效」。故这里绑到永久存在的 .preview 外壳，滚动事件发生时
 *   再用 targetSelector 现查当前滚动元素；滚动不冒泡，但捕获阶段能收到后代滚动事件。
 */
export function useScrollSync(
  source: HTMLElement | null,
  host: HTMLElement | null,
  targetSelector: string
) {
  const rafIdRef = useRef<number | null>(null)
  // 锁：'source' 表示正在同步 source→target，'target' 表示反向
  const syncingRef = useRef<'source' | 'target' | null>(null)

  const syncScroll = (
    from: 'source' | 'target',
    fromEl: HTMLElement,
    toEl: HTMLElement
  ) => {
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      const fromScrollHeight = fromEl.scrollHeight - fromEl.clientHeight
      if (fromScrollHeight <= 0) { rafIdRef.current = null; syncingRef.current = null; return }
      const ratio = fromEl.scrollTop / fromScrollHeight
      const toScrollHeight = toEl.scrollHeight - toEl.clientHeight
      if (toScrollHeight > 0) {
        syncingRef.current = from        // 加锁
        toEl.scrollTop = ratio * toScrollHeight
        // 下一帧解锁，让对面的 listener 可以响应新的一次滚动
        requestAnimationFrame(() => { syncingRef.current = null })
      }
      rafIdRef.current = null
    })
  }

  useEffect(() => {
    if (!source || !host) return

    // 每次事件现查，天然兼容"节点晚于挂载出现 / 卸载后重挂"两种情况
    const resolveTarget = () => host.querySelector<HTMLElement>(targetSelector)

    const onSourceScroll = () => {
      if (syncingRef.current !== null) return          // 锁住，正在被反向同步
      const target = resolveTarget()
      if (!target) return
      syncScroll('source', source, target)
    }

    // 捕获监听（滚动不冒泡）：只认当前滚动元素自身派发的事件，忽略后代（代码块等）滚动
    const onTargetScroll = (e: Event) => {
      if (syncingRef.current !== null) return          // 锁住，正在被正向同步
      const target = resolveTarget()
      if (!target || e.target !== target) return
      syncScroll('target', target, source)
    }

    source.addEventListener('scroll', onSourceScroll, { passive: true })
    host.addEventListener('scroll', onTargetScroll, true)

    return () => {
      source.removeEventListener('scroll', onSourceScroll)
      host.removeEventListener('scroll', onTargetScroll, true)
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      syncingRef.current = null
    }
  }, [source, host, targetSelector])
}
