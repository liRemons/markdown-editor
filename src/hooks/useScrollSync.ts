import { useEffect, useRef } from 'react'

/**
 * 滚动同步 Hook
 * 将源滚动容器的滚动位置同步到目标预览容器
 */
export function useScrollSync(
  sourceRef: React.RefObject<HTMLElement | null>,
  targetRef: React.RefObject<HTMLDivElement | null>
) {
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const source = sourceRef.current
    const target = targetRef.current
    if (!source || !target) return

    const listener = () => {
      if (rafIdRef.current) return
      rafIdRef.current = requestAnimationFrame(() => {
        const s = sourceRef.current
        const t = targetRef.current
        if (!s || !t) { rafIdRef.current = null; return }
        const sourceScrollHeight = s.scrollHeight - s.clientHeight
        if (sourceScrollHeight <= 0) { rafIdRef.current = null; return }
        const ratio = s.scrollTop / sourceScrollHeight
        const targetScrollHeight = t.scrollHeight - t.clientHeight
        if (targetScrollHeight > 0) {
          t.scrollTop = ratio * targetScrollHeight
        }
        rafIdRef.current = null
      })
    }

    source.addEventListener('scroll', listener, { passive: true })

    return () => {
      source.removeEventListener('scroll', listener)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [sourceRef, targetRef])
}
