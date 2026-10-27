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

export default function TablePicker({ onSelect }: TablePickerProps) {
  /** 当前高亮区域（rows x cols），渲染唯一依赖此状态 */
  const [size, setSize] = useState<TableSize>({ rows: 0, cols: 0 })
  /** 鼠标回撤（向上/向左）后需要重置列跟踪，prevRow 与 pending 成对出现，仅事件处理内使用 */
  const prevRowRef = useRef(0)
  const pendingColsRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearFlash = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      // 组件卸载时清理动画定时器（下拉关闭时 destroyOnHidden 会卸载本组件）
      clearFlash()
    },
    [clearFlash]
  )

  /**
   * 扩展选中区域至 (col, row)
   */
  function extend(col: number, row: number) {
    if (row < prevRowRef.current || col < pendingColsRef.current) {
      // 鼠标回撤（向上或向左），重置列跟踪
      pendingColsRef.current = 0
    }
    if (col > pendingColsRef.current) {
      pendingColsRef.current = col
    }
    const cols = pendingColsRef.current
    setSize({ rows: row, cols })
    prevRowRef.current = row
  }

  /**
   * 跳跃动画效果：逐行推进高亮，结束后落到 (col, limit)
   */
  function flash(col: number, dir: 1 | -1, limit: number) {
    clearFlash()
    let current = dir === 1 ? 1 : limit
    const step = dir === 1 ? 1 : -1

    flashTimerRef.current = setInterval(() => {
      if ((dir === 1 && current > limit) || (dir === -1 && current < 1)) {
        clearFlash()
        const finalRow = current - step
        setSize({ rows: finalRow, cols: col })
        return
      }
      setSize({ rows: current, cols: col })
      current += step
    }, 50)
  }

  /**
   * 核心逻辑：鼠标进入格子
   */
  function onCellEnter(index: number) {
    clearFlash()
    const row = Math.floor(index / MAX_COL) + 1
    const col = (index % MAX_COL) + 1
    const maxCol = pendingColsRef.current

    const isJump = Math.abs(row - prevRowRef.current) > 1
    prevRowRef.current = row

    if (!isJump) {
      // 正常悬停：相邻行或同一行
      extend(col, row)
    } else if (row > 0 && (col > maxCol || maxCol >= MAX_COL)) {
      // 向下跳跃：逐行推进动画
      pendingColsRef.current = Math.min(MAX_COL, col)
      flash(Math.min(MAX_COL, col), 1, Math.min(row, MAX_ROW))
    } else {
      // 向上跳跃：重置列跟踪并播放动画
      pendingColsRef.current = 0
      extend(col, row)
    }
  }

  function onMouseDown() {
    // 提交当前高亮区域（size 始终与视觉高亮一致）
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
          const isSelected = row <= size.rows && col <= size.cols
          return (
            <div
              key={i}
              className={`${styles.cell} ${isSelected ? styles.cellActive : ''}`}
              onMouseEnter={() => onCellEnter(i)}
            />
          )
        })}
      </div>
      <div className={styles.label}>
        {size.rows} x {size.cols || 1}
      </div>
    </div>
  )
}
