import { useEffect } from 'react'
import { Modal, Form, Input, Select } from 'antd'
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
 * 根据组件 schema 动态渲染表单字段
 */
export default function EditDialog({ visible, typeName, currentProps, onSave, onClose }: EditDialogProps) {
  const schema = componentRegistry.get(typeName)
  const [form] = Form.useForm()

  // 当弹窗打开时，设置表单值
  useEffect(() => {
    if (visible && schema) {
      const values: Record<string, string> = {}
      for (const field of schema.fields) {
        values[field.key] = currentProps[field.key] ?? field.defaultValue ?? ''
      }
      form.setFieldsValue(values)
    }
  }, [visible, schema, currentProps, form])

  const handleOk = async () => {
    if (!schema) return
    try {
      const values = await form.validateFields()
      const newProps: Record<string, string> = {}
      for (const field of schema.fields) {
        newProps[field.key] = values[field.key] ?? field.defaultValue ?? ''
      }
      onSave(newProps)
    } catch {
      // 验证失败，不执行操作
    }
  }

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  if (!schema) {
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
      <Form form={form} layout="vertical">
        {schema.fields.map((field) => (
          <Form.Item
            key={field.key}
            name={field.key}
            label={field.label}
          >
            {field.type === 'textarea' ? (
              <Input.TextArea rows={3} />
            ) : field.type === 'select' && field.options ? (
              <Select options={field.options} />
            ) : field.type === 'color' ? (
              <Input type="color" />
            ) : field.type === 'number' ? (
              <Input type="number" />
            ) : (
              <Input />
            )}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}