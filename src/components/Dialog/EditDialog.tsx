import { useState, useMemo, useEffect, type FC } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Slider, Rate, DatePicker, ColorPicker } from 'antd'
import type { FormInstance, FormItemProps } from 'antd'
import componentRegistry from '../../registry/componentRegistry'
import type { DialogField } from '../../types'

/**
 * 组件类型到 antd 表单组件的映射
 */
const FormComponents: Record<string, FC<any>> = {
  input: Input,
  textarea: Input.TextArea,
  number: InputNumber,
  select: Select,
  switch: Switch,
  slider: Slider,
  rate: Rate,
  color: ColorPicker,
  date: DatePicker,
  dateRange: DatePicker.RangePicker,
}

/**
 * 渲染对应类型的 antd 表单组件
 */
function renderFormItemComponent(field: DialogField) {
  const props = field.componentProps || {}
  const Component = field.componentType ? FormComponents[field.componentType] : Input
  return <Component {...props} />
}

/**
 * 根据 fields 自动生成 Form.Item 列表
 */
function renderAutoForm(form: FormInstance, fields: DialogField[]) {
  if (!fields || fields.length === 0) {
    return null
  }

  return (
    <Form form={form} layout="vertical">
      {fields.map(field => {
        if (!field.componentType) {
          return null
        }

        const formItemProps: FormItemProps = {
          name: field.key,
          label: field.name || field.key,
          valuePropName: field.componentType === 'switch' ? 'checked' : undefined,
          ...field.componentProps,
        }

        return (
          <Form.Item key={field.key} {...formItemProps}>
            {renderFormItemComponent(field)}
          </Form.Item>
        )
      })}
    </Form>
  )
}

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
  const [form] = Form.useForm()

  // 当弹窗打开时，初始化表单值
  const mergedProps = useMemo(() => {
    if (!schema) return currentProps
    const defaults: Record<string, string> = {}
    for (const field of schema.fields || []) {
      defaults[field.key] = field.defaultValue ?? ''
    }
    return { ...defaults, ...currentProps }
  }, [schema, currentProps])

  // 弹窗打开时设置表单值
  useEffect(() => {
    if (visible) {
      form.setFieldsValue(mergedProps)
      setFormProps({})
    }
  }, [visible, mergedProps, form])

  const handleDialogChange = (key: string, value: string) => {
    setFormProps(prev => ({ ...prev, [key]: value }))
  }

  const handleOk = async () => {
    let finalProps: Record<string, any> = visible ? { ...mergedProps, ...formProps } : mergedProps

    // 尝试从 Form 获取值（如果用户使用了 Form.Item 或自动表单）
    try {
      const formValues = await form.validateFields()
      finalProps = { ...finalProps, ...formValues }
    } catch {
      // 用户没有使用 Form.Item，使用原有的逻辑
    }

    onSave(finalProps)
  }

  const handleClose = () => {
    setFormProps({})
    onClose()
  }

  if (!schema) {
    return null
  }

  // 构建 context 对象，供 renderDialog 使用
  const context = {
    props: mergedProps,
    form,
    onChange: handleDialogChange,
    onSave,
  }

  // 渲染策略：
  // 1. 如果有 renderDialog，使用自定义渲染
  // 2. 否则如果 fields 中有 componentType，自动生成表单
  // 3. 否则不渲染任何内容
  const renderDialogContent = () => {
    if (schema.renderDialog) {
      return schema.renderDialog(context)
    }
    // 检查是否有字段配置了 componentType
    const hasComponentType = schema.fields?.some(f => f.componentType)
    if (hasComponentType && schema.fields) {
      return renderAutoForm(form, schema.fields)
    }
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
      {renderDialogContent()}
    </Modal>
  )
}