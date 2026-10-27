import { useState, useMemo, useEffect, useRef, type FC } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Slider, Rate, DatePicker, ColorPicker } from 'antd'
import type { FormInstance, FormItemProps } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import componentRegistry from '../../registry/componentRegistry'
import type { DialogField } from '../../types'
import type { ContainerProps } from '../../utils/parseContainer'

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
 * 渲染对应类型的 antd 表单组件（仅接收 componentProps，不再与 Form.Item props 混用）
 */
function renderFormItemComponent(field: DialogField) {
  const props = field.componentProps || {}
  const Component = field.componentType ? FormComponents[field.componentType] : Input
  return <Component {...props} />
}

/**
 * 根据 fields 自动生成 Form.Item 列表
 * 初始值走 <Form initialValues> + 按次打开的 key：
 * initialValues 在字段实体注册时消费，天然避开“Modal 首次挂载前 setFieldsValue 落空”的时序竞态；
 * key 每次打开变化触发 Form 重挂载，确保切换到不同容器时重新取值。
 */
function renderAutoForm(
  form: FormInstance,
  fields: DialogField[],
  initialValues: Record<string, unknown>,
  initKey: number
) {
  if (!fields || fields.length === 0) {
    return null
  }

  return (
    <Form key={initKey} form={form} layout="vertical" preserve={false} initialValues={initialValues}>
      {fields.map(field => {
        if (!field.componentType) {
          return null
        }

        const formItemProps: FormItemProps = {
          name: field.key,
          label: field.name || field.key,
          valuePropName: field.componentType === 'switch' ? 'checked' : undefined,
          ...field.formItemProps,
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

/** 字符串形式的历史属性值（'true'/'false'）还原为布尔，供 Switch 初始化 */
function toFormInitialValue(field: DialogField, value: string | number | boolean | undefined): unknown {
  if (value === undefined) return field.defaultValue ?? (field.componentType === 'switch' ? false : undefined)
  if (field.componentType === 'switch') {
    if (typeof value === 'boolean') return value
    return value === 'true' || value === 1 || value === '1'
  }
  if (field.componentType === 'number' || field.componentType === 'slider' || field.componentType === 'rate') {
    const num = Number(value)
    return Number.isNaN(num) ? undefined : num
  }
  if (field.componentType === 'date') {
    const d = dayjs(typeof value === 'boolean' ? String(value) : (value as string | number))
    return d.isValid() ? d : undefined
  }
  if (field.componentType === 'dateRange') {
    // 属性值为单行字符串，约定以 ',' 分隔两个日期
    const parts = String(value).split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length !== 2) return undefined
    const [start, end] = parts.map(p => dayjs(p))
    return start.isValid() && end.isValid() ? [start, end] : undefined
  }
  return value
}

/** 表单控件值归一化为容器属性可存储的字符串（容器语法仅支持扁平原始值） */
function normalizeValue(field: DialogField | undefined, value: unknown): string | number | boolean {
  if (value === null || value === undefined) return ''
  if (field?.componentType === 'date' && dayjs.isDayjs(value)) {
    return (value as Dayjs).format('YYYY-MM-DD')
  }
  if (field?.componentType === 'dateRange' && Array.isArray(value)) {
    return value
      .filter(v => dayjs.isDayjs(v))
      .map(v => (v as Dayjs).format('YYYY-MM-DD'))
      .join(', ')
  }
  // ColorPicker 在 Form 中可能给出 string 或 { toHexString } 对象
  const colorLike = value as { toHexString?: () => string }
  if (colorLike && typeof colorLike === 'object' && typeof colorLike.toHexString === 'function') {
    return colorLike.toHexString()
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value
  }
  return String(value)
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
  currentProps: ContainerProps
  /** 每次打开递增的序号：作为 Form 的 key，切换容器时触发重挂载重新取 initialValues */
  initKey: number
  /** 保存回调 */
  onSave: (props: ContainerProps) => void
  /** 关闭回调 */
  onClose: () => void
}

/**
 * 属性编辑弹窗组件
 * 根据组件 schema 的 renderDialog 函数渲染弹窗内容
 */
export default function EditDialog({ visible, typeName, currentProps, initKey, onSave, onClose }: EditDialogProps) {
  const schema = componentRegistry.get(typeName)
  const [formProps, setFormProps] = useState<ContainerProps>({})
  const [form] = Form.useForm()

  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const dirtyRef = useRef(false)

  // 容器属性值统一按字符串读取（写入时也统一序列化为字符串）
  const mergedProps = useMemo<ContainerProps>(() => {
    if (!schema) return currentProps
    const merged: ContainerProps = {}
    for (const field of schema.fields || []) {
      if (field.defaultValue !== undefined) merged[field.key] = field.defaultValue
    }
    return { ...merged, ...currentProps }
  }, [schema, currentProps])

  // 表单初始值：供 <Form initialValues> 与自定义 renderDialog 的 form.setFieldsValue 共用，
  // 避免两处计算逻辑重复
  const initialValues = useMemo<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(mergedProps)) {
      const field = schema?.fields?.find(f => f.key === key)
      const formValue = toFormInitialValue(field ?? { key }, value)
      if (formValue !== undefined) initial[key] = formValue
    }
    return initial
  }, [mergedProps, schema])

  // 弹窗“由关到开”时重置手动控制缓存与脏标志（不响应后续 props 变化，避免覆盖用户正在编辑的内容）。
  // 字段回显统一交给 <Form initialValues>（按 initKey 重挂载）；
  // 这里的 setFieldsValue 仅兼容自定义 renderDialog 内部自建 <Form form={form}> 的场景。
  useEffect(() => {
    if (visible) {
      setFormProps({})
      form.setFieldsValue(initialValues)
      dirtyRef.current = false
    }
    // initialValues 仅作为开弹窗时的快照，刻意不响应其后续变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, form])

  const handleDialogChange = (key: string, value: string | number | boolean) => {
    setFormProps(prev => ({ ...prev, [key]: value }))
    dirtyRef.current = true
  }

  const handleOk = async () => {
    try {
      const formValues = await form.validateFields()
      for (const [key, value] of Object.entries(formValues)) {
        // 非归一化的控件值（dayjs/Color 等）先以 unknown 充入，后续统一 normalizeValue
        ;(formProps as Record<string, unknown>)[key] = value
      }
    } catch {
      // 校验失败：保持弹窗打开，由 antd 展示字段错误
      return
    }

    // 统一归一化：日期/颜色/布尔/数字 → 容器可存储的原始值
    const finalProps: ContainerProps = {}
    for (const [key, value] of Object.entries({ ...mergedProps, ...formProps })) {
      const field = schema?.fields?.find(f => f.key === key)
      finalProps[key] = normalizeValue(field, value)
    }

    onSaveRef.current(finalProps)
    dirtyRef.current = false
    onClose()
  }

  const handleClose = () => {
    if (dirtyRef.current && !window.confirm('属性修改尚未保存，确定关闭吗？')) {
      return
    }
    setFormProps({})
    dirtyRef.current = false
    onClose()
  }

  if (!schema) {
    return null
  }

  // 构建 context 对象，供 renderDialog 使用
  // context.onSave 为包装函数：仅更新弹窗内属性并标记脏状态；
  // 弹窗关闭由 onOk / onCancel 最终统一处理
  const contextSave = (props: ContainerProps) => {
    setFormProps(prev => ({ ...prev, ...props }))
    dirtyRef.current = true
  }

  const context = {
    props: { ...mergedProps, ...formProps },
    form,
    onChange: handleDialogChange,
    onSave: contextSave,
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
      return renderAutoForm(form, schema.fields, initialValues, initKey)
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
