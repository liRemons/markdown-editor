import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './index.module.less'

interface TableSize {
  rows: number
  cols: number
}

interface TablePickerProps {
  onSelect: (size: TableSize) => void
}

const MAX_ROW = 8
const MAX_COL = 8
const REFRESH_TIME = 200

export default function TablePicker({ onSelect }: TablePickerProps) {
  const [hoverSize, setHoverSize] = useState({ row: 0, col: 0 })
  const [confirmedSize, setConfirmedSize] = useState({ row: 0, col: 0 })
  const maxColRef = useRef(0)
  const prevRowRef = useRef(0)
  const timerIdRef = useRef<any>(null)
  const refreshTimerRef = useRef<any>(null)
  const commitRef = useRef<{ cols: number; rows: number } | null>(null)

  const clearTimer = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current)
      timerIdRef.current = null
    }
  }, [])

  const clearFlash = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      // 组件卸载时清理定时器
      if (timerIdRef.current) clearTimeout(timerIdRef.current)
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    },
    []
  )

  /**
   * 扩展选中区域至 (col, row)
   */
  function extend(col: number, row: number) {
    if (row < prevRowRef.current || col < maxColRef.current) {
      // 鼠标回撤（向上或向左），重置列跟踪
      maxColRef.current = 0
    }
    if (col > maxColRef.current) {
      maxColRef.current = col
    }
    setHoverSize({ row, col })
    setConfirmedSize({ row, col: maxColRef.current })

    if (row === 1) {
      commitRef.current = { cols: maxColRef.current, rows: 1 }
    }
  }

  /**
   * 跳跃动画效果
   */
  function flash(
    col: number,
    dir: 1 | -1,
    limit: number,
    finalCallback: (finalCol: number, finalRow: number) => void
  ) {
    let current = dir === 1 ? 1 : limit
    const step = dir === 1 ? 1 : -1

    refreshTimerRef.current = setInterval(() => {
      setHoverSize({ row: current, col })
      if (current > confirmedSize.row || dir === -1) {
        maxColRef.current = Math.min(MAX_COL, col)
      }
      current += step
      if ((dir === 1 && current > limit) || (dir === -1 && current < 1)) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
        const finalRow = current - step
        setHoverSize({ row: finalRow, col })
        finalCallback(col, finalRow)
      }
    }, 50)
  }

  /**
   * 核心逻辑：鼠标进入格子
   */
  function onCellEnterCheck(index: number) {
    clearTimer()
    clearFlash()
    const row = Math.floor(index / MAX_COL) + 1
    const col = (index % MAX_COL) + 1

    const prevRow = prevRowRef.current
    const isJump = Math.abs(row - prevRow) > 1
    const isDown = row > prevRow
    prevRowRef.current = row

    if (!isJump) {
      // 正常悬停：相邻行或同一行
      extend(col, row)
    } else if (isDown) {
      // 快速向下跳跃
      if (col > maxColRef.current || maxColRef.current >= MAX_COL) {
        const finalRow = Math.min(row, MAX_ROW)
        flash(col, 1, finalRow, (c, r) => {
          setConfirmedSize({ row: r, col: c })
        })
      } else {
        extend(col, row)
      }
    } else {
      // 快速向上跳跃：重置列跟踪并播放动画
      maxColRef.current = 0
      flash(col, -1, row, (c, r) => {
        setConfirmedSize({ row: r, col: c })
        if (r === 1) {
          commitRef.current = { cols: Math.min(MAX_COL, col), rows: 1 }
          setConfirmedSize({ row: 1, col: Math.min(MAX_COL, col) })
        }
      })
    }
  }

  function onMouseDown() {
    const size = commitRef.current || { cols: maxColRef.current, rows: confirmedSize.row }
    if (size.rows > 0 && size.cols > 0) {
      onSelect(size)
    }
  }

  return (
    <div
      className={styles.container}
      onMouseDown={onMouseDown}
    >
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${MAX_COL}, 24px)` }}
      >
        {Array.from({ length: MAX_ROW * MAX_COL }).map((_, i) => {
          const row = Math.floor(i / MAX_COL) + 1
          const col = (i % MAX_COL) + 1
          const isSelected = row <= hoverSize.row && col <= maxColRef.current
          return (
            <div
              key={i}
              className={`${styles.cell} ${isSelected ? styles.cellActive : ''}`}
              onMouseEnter={() => onCellEnterCheck(i)}
            />
          )
        })}
      </div>
      <div className={styles.label}>
        {hoverSize.row} x {maxColRef.current || 1}
      </div>
    </div>
  )
}
