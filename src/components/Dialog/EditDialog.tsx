import { useState, useMemo } from 'react'
import { Modal } from 'antd'
import componentRegistry from '../../registry/componentRegistry'

/**
 * 弹窗编辑容器属性的组件
 */
interface EditDialogProps {
  /** 弹窗是否显示 */
  visible: boolean
  /** 容器类型名称 */
  typeName: string
  /** 当前属性值 */
  currentProps: Record<string, string>
  /** 保存回调 */
  onSave: (props: Record<string, string>) => void
  /** 关闭回调 */
  onClose: () => void
}

/**
 * 属性编辑弹窗组件
 * 根据组件 schema 的 renderDialog 函数渲染弹窗内容
 */
export default function EditDialog({ visible, typeName, currentProps, onSave, onClose }: EditDialogProps) {
  const schema = componentRegistry.get(typeName)
  const [formProps, setFormProps] = useState<Record<string, string>>({})

  // 当弹窗打开时，初始化表单值
  const mergedProps = useMemo(() => {
    if (!schema) return currentProps
    const defaults: Record<string, string> = {}
    for (const field of schema.fields || []) {
      defaults[field.key] = field.defaultValue ?? ''
    }
    return { ...defaults, ...currentProps }
  }, [schema, currentProps])

  const handleDialogChange = (key: string, value: string) => {
    setFormProps(prev => ({ ...prev, [key]: value }))
  }

  const handleOk = () => {
    const finalProps = visible ? { ...mergedProps, ...formProps } : mergedProps
    onSave(finalProps)
    setFormProps({})
  }

  const handleClose = () => {
    setFormProps({})
    onClose()
  }

  if (!schema || !schema.renderDialog) {
    return null
  }

  return (
    <Modal
      title={`${schema.label} 属性编辑`}
      open={visible}
      onOk={handleOk}
      onCancel={handleClose}
      okText="保存"
      cancelText="取消"
    >
      {schema.renderDialog(visible ? { ...mergedProps, ...formProps } : mergedProps, handleDialogChange)}
    </Modal>
  )
}