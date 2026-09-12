import { useEffect, type RefObject } from 'react'

const useScrollSync = (
  sourceRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    const source = sourceRef.current
    const target = targetRef.current
    if (!source || !target) return

    let rafId: number | null = null

    const listener = () => {
      console.log('scrolling')
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const sourceEl = sourceRef.current
        const targetEl = targetRef.current
        if (!sourceEl || !targetEl) {
          rafId = null
          return
        }
        
        const sourceScrollHeight = sourceEl.scrollHeight - sourceEl.clientHeight
        if (sourceScrollHeight <= 0) {
          rafId = null
          return
        }
        
        const ratio = sourceEl.scrollTop / sourceScrollHeight
        const targetScrollHeight = targetEl.scrollHeight - targetEl.clientHeight
        if (targetScrollHeight > 0) {
          targetEl.scrollTop = ratio * targetScrollHeight
        }
        rafId = null
      })
    }

    source.addEventListener('scroll', listener, { passive: true })
    return () => {
      if (sourceRef.current) {
        sourceRef.current.removeEventListener('scroll', listener)
      }
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [sourceRef, targetRef])
}

export default useScrollSync