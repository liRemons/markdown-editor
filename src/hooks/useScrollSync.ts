import { useEffect, useRef } from 'react'

/**
 * 双向滚动同步 Hook
 * 编辑器与预览区互相同步滚动位置（基于比例）
 * 使用 síncing 锁防止双向循环触发
 */
export function useScrollSync(
  sourceRef: React.RefObject<HTMLElement | null>,
  targetRef: React.RefObject<HTMLDivElement | null>
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
    const source = sourceRef.current
    const target = targetRef.current
    if (!source || !target) return

    const onSourceScroll = () => {
      if (syncingRef.current !== null) return          // 锁住，正在被反向同步
      const s = sourceRef.current!
      const t = targetRef.current!
      syncScroll('source', s, t)
    }

    const onTargetScroll = () => {
      if (syncingRef.current !== null) return          // 锁住，正在被正向同步
      const s = sourceRef.current!
      const t = targetRef.current!
      syncScroll('target', t, s)
    }

    source.addEventListener('scroll', onSourceScroll, { passive: true })
    target.addEventListener('scroll', onTargetScroll, { passive: true })

    return () => {
      source.removeEventListener('scroll', onSourceScroll)
      target.removeEventListener('scroll', onTargetScroll)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [sourceRef, targetRef])
}
