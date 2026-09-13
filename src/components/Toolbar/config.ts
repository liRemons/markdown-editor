import type { ToolbarButtonConfig, ImageUploadConfig } from '../../types'
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  PictureOutlined,
  CodeOutlined,
  BlockOutlined,
  MinusOutlined,
  FieldStringOutlined,
  FontSizeOutlined,
} from '@ant-design/icons'
import { insertAtCursor, insertAtLineStart, wrapSelection, uploadImage, isUploadConfigured } from './buttons'

/**
 * 创建工具栏配置
 * @param options - 配置选项
 */
export function createToolbarConfig(options?: ImageUploadConfig): ToolbarButtonConfig[] {
  // 判断是否配置了图片上传
  const hasUploadConfig = isUploadConfigured(options)
  return [
    {
      id: 'heading',
      icon: FontSizeOutlined,
      label: '标题',
      children: [
        { id: 'heading1', label: '标题 1', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '# ') },
        { id: 'heading2', label: '标题 2', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '## ') },
        { id: 'heading3', label: '标题 3', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '### ') },
        { id: 'heading4', label: '标题 4', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '#### ') },
        { id: 'heading5', label: '标题 5', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '##### ') },
        { id: 'heading6', label: '标题 6', icon: FontSizeOutlined, handler: (v) => insertAtLineStart(v, '###### ') },
      ],
    },
    { separatorBefore: true },
    { id: 'bold', label: '加粗', icon: BoldOutlined, handler: (v) => wrapSelection(v, '**', '**') },
    { id: 'italic', label: '斜体', icon: ItalicOutlined, handler: (v) => wrapSelection(v, '*', '*') },
    { id: 'strikethrough', label: '删除线', icon: StrikethroughOutlined, handler: (v) => wrapSelection(v, '~~', '~~') },
    { id: 'underline', label: '下划线', icon: UnderlineOutlined, handler: (v) => wrapSelection(v, '<u>', '</u>') },
    { separatorBefore: true },
    { id: 'ul', label: '无序列表', icon: UnorderedListOutlined, handler: (v) => insertAtLineStart(v, '- ') },
    { id: 'ol', label: '有序列表', icon: OrderedListOutlined, handler: (v) => insertAtLineStart(v, '1. ') },
    { separatorBefore: true },
    { id: 'link', label: '链接', icon: LinkOutlined, handler: (v) => insertAtCursor(v, '[', '](url)', '文本') },
    // 图片按钮：未配置上传时禁用并提示
    {
      id: 'image',
      label: hasUploadConfig ? '图片' : '请配置图片上传地址',
      icon: PictureOutlined,
      disabled: !hasUploadConfig,
      handler: hasUploadConfig ? (v) => uploadImage(v, { uploadUrl: options?.uploadUrl, onUploadImage: options?.onUploadImage }) : undefined,
    },
    { separatorBefore: true },
    { id: 'code', label: '行内代码', icon: FieldStringOutlined, handler: (v) => wrapSelection(v, '`', '`') },
    {
      id: 'codeblock',
      label: '代码块',
      icon: CodeOutlined,
      handler: (v) => {
        const { from, to } = v.state.selection.main
        const selected = v.state.doc.sliceString(from, to)
        const insert = selected ? '```\n' + selected + '\n```' : '```\n\n```'
        v.dispatch({ changes: { from, to, insert } })
      },
    },
    { id: 'quote', label: '引用', icon: BlockOutlined, handler: (v) => insertAtLineStart(v, '> ') },
    {
      id: 'hr',
      label: '分割线',
      icon: MinusOutlined,
      handler: (v) => {
        const { from } = v.state.selection.main
        v.dispatch({ changes: { from, insert: '\n---\n' } })
      },
    },
  ]
}