import React from 'react'
import { Splitter } from 'antd'

const { Panel } = Splitter

interface SplitPanelsProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

export default function SplitPanels({ leftPanel, rightPanel }: SplitPanelsProps) {
  return (
    <Splitter className="split-panels">
      <Panel defaultSize="50%" min="20%" max="80%">
        {leftPanel}
      </Panel>
      <Panel>{rightPanel}</Panel>
    </Splitter>
  )
}