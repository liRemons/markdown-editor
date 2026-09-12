import React from 'react'
import { Splitter } from 'antd'

interface SplitPanelsProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

export default function SplitPanels({ leftPanel, rightPanel }: SplitPanelsProps) {
  return (
    <Splitter className="split-panels">
      <Splitter.Panel defaultSize="50%" min="20%" max="80%">
        {leftPanel}
      </Splitter.Panel>
      <Splitter.Panel>{rightPanel}</Splitter.Panel>
    </Splitter>
  )
}