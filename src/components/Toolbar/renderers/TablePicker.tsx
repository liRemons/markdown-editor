import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './TablePicker.module.less'

interface TableSize {
  rows: number
  cols: number
}

interface TablePickerProps {
  onSelect: (size: TableSize) => void
}

const MAX_ROW = 12
const MAX_COL = 12
const REFRESH_TIME = 200

export default function TablePicker({ onSelect }: TablePickerProps) {
  const [hoverSize, setHoverSize] = useState({ row: 0, col: 0 })
  const [prevHoverSize, setPrevHoverSize] = useState({ row: 0, col: 0 })
  const [confirmedSize, setConfirmedSize] = useState({ row: 0, col: 0 })
  const maxColRef = useRef(0)
  const timerIdRef = useRef<any>(null)
  const refreshTimerRef = useRef<any>(null)
  const commitRef = useRef<{ cols: number; rows: number } | null>(null)

  const clearTimer = useCallback((flushFn?: () => void) => {
    if (timerIdRef.current) {
      timerIdRef.current = null
    }
    if (flushFn && maxColRef.current > 0) {
      timerIdRef.current = setTimeout(flushFn, REFRESH_TIME)
    }
  }, [])

  useEffect(
    () => () => {
      // Cleanup on unmount
      if (timerIdRef.current) clearTimeout(timerIdRef.current)
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    },
    []
  )

  /**
   * Extend selection to (col, row)
   */
  function extend(col: number, row: number) {
    if (col > maxColRef.current) {
      maxColRef.current = col
      setHoverSize({ row, col })
      setConfirmedSize({ row, col })
    } else {
      setHoverSize({ row, col })
      if (row !== confirmedSize.row) {
        setConfirmedSize({ row, col: maxColRef.current })
      }
      if (row === 1) {
        commitRef.current = { cols: col, rows: 1 }
        setConfirmedSize({ row: 1, col })
      }
    }
  }

  /**
   * Flash animation for jumps
   */
  function flash(
    col: number,
    dir: 1 | -1,
    limit: number,
    finalCallback: (finalCol: number, finalRow: number) => void
  ) {
    let current = dir === 1 ? 1 : limit
    const step = dir === 1 ? 1 : -1
    let timer = 0

    refreshTimerRef.current = setInterval(() => {
      setHoverSize({ row: current, col })
      if (current > confirmedSize.row || dir === -1) {
        maxColRef.current = Math.min(MAX_COL, col)
      }
      current += step
      if ((dir === 1 && current > limit) || (dir === -1 && current < 1)) {
        clearInterval(refreshTimerRef.current)
        setHoverSize({ row: current - step, col })
        finalCallback(col, current - step)
      }
    }, 50)

    clearTimeout(timer)
    return () => {
      clearInterval(refreshTimerRef.current)
    }
  }

  /**
   * Core logic: mouse enters a cell at index in the grid
   */
  function onCellEnterCheck(index: number) {
    clearTimer()
    const row = Math.floor(index / MAX_COL) + 1
    const col = (index % MAX_COL) + 1

    const isDown = row > hoverSize.row

    if (Math.abs(row - hoverSize.row) <= 1) {
      // Normal hover - adjacent row
      extend(col, row)
    } else {
      // Jump - fast mouse movement
      if (isDown && (col > maxColRef.current || maxColRef.current >= MAX_COL)) {
        const finalRow = Math.min(row, MAX_ROW)
        flash(col, 1, finalRow, (c, r) => {
          setConfirmedSize({ row: r, col: c })
        })
      } else if (!isDown) {
        flash(col, -1, row, (c, r) => {
          setConfirmedSize({ row: r, col: c })
          if (r === 1) {
            commitRef.current = { cols: Math.min(MAX_COL, col), rows: 1 }
            setConfirmedSize({ row: 1, col: Math.min(MAX_COL, col) })
          }
        })
      }
    }

    // When column reaches max and current row exceeds previous, reset for next round
    if (col >= MAX_COL && row >= prevHoverSize.row) {
      if (row !== prevHoverSize.row) {
        maxColRef.current = 0
        setPrevHoverSize({ row: 0, col: 0 })
      }
    }
    setPrevHoverSize({ row, col })
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
