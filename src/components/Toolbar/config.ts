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
  MinusOutlined,
  FontSizeOutlined,
  CheckSquareOutlined
} from '@ant-design/icons';
import IconComponent from '../Icon'
import { insertAtCursor, insertAtLineStart, wrapSelection, uploadImage, isUploadConfigured, toggleTaskList, toggleHeading, toggleWrap, toggleLinePrefix } from './buttons'

function Quote() {
  return IconComponent('quote')
}

function InlineCode() {
  return IconComponent('inlinecode')
}

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
        { id: 'heading1', label: 'H1', handler: (v) => toggleHeading(v, 1) },
        { id: 'heading2', label: 'H2', handler: (v) => toggleHeading(v, 2) },
        { id: 'heading3', label: 'H3', handler: (v) => toggleHeading(v, 3) },
        { id: 'heading4', label: 'H4', handler: (v) => toggleHeading(v, 4) },
        { id: 'heading5', label: 'H5', handler: (v) => toggleHeading(v, 5) },
        { id: 'heading6', label: 'H6', handler: (v) => toggleHeading(v, 6) },
      ],
    },
    { separatorBefore: true },
    { id: 'bold', label: '加粗', icon: BoldOutlined, handler: (v) => toggleWrap(v, '**', '**') },
    { id: 'italic', label: '斜体', icon: ItalicOutlined, handler: (v) => toggleWrap(v, '*', '*') },
    { id: 'strikethrough', label: '删除线', icon: StrikethroughOutlined, handler: (v) => toggleWrap(v, '~~', '~~') },
    { id: 'underline', label: '下划线', icon: UnderlineOutlined, handler: (v) => toggleWrap(v, '<u>', '</u>') },
    { separatorBefore: true },
    // 列表按钮：切换式，行已是列表项则点击移除前缀（无序列表不匹配待办行 `- [ ]`）
    { id: 'ul', label: '无序列表', icon: UnorderedListOutlined, handler: (v) => toggleLinePrefix(v, /^(\s*)-(?!\s*\[)\s/, '- ') },
    { id: 'ol', label: '有序列表', icon: OrderedListOutlined, handler: (v) => toggleLinePrefix(v, /^(\s*)\d+\.\s/, '1. ') },
    { id: 'checkbox', label: '待办', icon: CheckSquareOutlined, handler: (v) => toggleTaskList(v) },
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
    { id: 'code', label: '行内代码', icon: InlineCode, handler: (v) => wrapSelection(v, '`', '`') },
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
    { id: 'quote', label: '引用', icon: Quote, handler: (v) => insertAtLineStart(v, '> ') },
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