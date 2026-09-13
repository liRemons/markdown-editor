import { useState, useEffect, useCallback } from 'react'

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((e) => {
        console.error('退出全屏失败:', e)
      })
    } else {
      const el = document.documentElement
      const requestMethod = el.requestFullscreen ||
        (el as any).webkitRequestFullscreen ||
        (el as any).mozRequestFullScreen ||
        (el as any).msRequestFullscreen
      if (requestMethod) {
        requestMethod.call(el).catch((e) => {
          console.error('进入全屏失败:', e)
        })
      }
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  return { fullscreen, toggleFullscreen }
}
