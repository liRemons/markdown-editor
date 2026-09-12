# Markdown 编辑器技术方案

## 1. 项目概述

实现一个基于 React 的 Markdown 编辑器，支持实时预览、双栏同步滚动、自定义组件编辑等功能。

## 2. 技术选型

| 模块 | 库 | 版本 | 说明 |
|------|------|------|------|
| 编辑器 | `@codemirror/basic-setup` | 6.x | 核心文本编辑 |
| 编辑器语言 | `@codemirror/language` | 6.x | 语法高亮支持 |
| Markdown 解析 | `markdown-it` | ^14.x | Markdown → HTML |
| Markdown 任务列表 | `markdown-it-task-lists` | ^2.x | 任务列表支持 |
| Markdown Emoji | `markdown-it-emoji` | ^3.x | Emoji 支持 |
| 代码高亮 | `highlight.js` | ^11.x | 代码语法高亮（markdown-it 内置） |
| 数学公式 | `katex` + `markdown-it-katex` | ^0.16.x | LaTeX 渲染 |
| 图表 | `mermaid` | ^10.x | Mermaid 图表 |
| 分栏布局 | `react-resizable-panels` | ^2.x | 可拖拽分栏 |
| 图标 | `lucide-react` | ^0.x | 工具栏图标 |

## 3. 架构设计

```
┌────────────────────────────────────────────────────────┐
│                        Toolbar                         │
│  [标题][列表][链接][代码][表格][引用][撤销][重做][图片]... │
├─────────────────────────┬───────────────────────────────┤
│                         │                               │
│   CodeMirror 编辑器     │      预览面板                  │
│                         │                               │
│   (左侧)                │   (markdown-it 渲染)           │
│                         │                               │
│   ┌──────────┐          │   ┌──────────┐                │
│   │ gutter   │          │   │ scrollable│                │
│   │ 编辑入口 │◄─────────┼───│          │                │
│   �──────────┘          │   └──────────┘                │
│                         │                               │
├─────────────────────────┴───────────────────────────────┤
│                    依赖关系                              │
│                                                         │
│  EditorState → markdown-it → 预览 DOM                   │
│    ↓                                             ↓       │
│  ViewPlugin (编辑入口)                        mermaid     │
│    ↓                                            katex     │
│  弹窗编辑 (表单) ←→ 字段映射 Schema                    │
└────────────────────────────────────────────────────────┘
```

## 4. 核心模块

### 4.1 编辑器模块

基于 CodeMirror 6 实现，主要功能：

- **Markdown 语法高亮**：使用 `@codemirror/language` 的 markdown 扩展
- **撤销/重做**：CodeMirror 原生支持 `undo` / `redo`
- **图片上传**：监听 `handlePaste` 和 `handleDrop`，插入 `![]()` 语法
- **代码块高亮**：通过 `@codemirror/lang-javascript` 等注入代码块语言支持

```typescript
import { basicSetup } from '@codemirror/basic-setup'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'

const extensions = [
  basicSetup,
  markdown({
    base: markdownLanguage,
    codeLanguages: [javascript(), python()]
  })
]
```

### 4.2 预览渲染模块

使用 `markdown-it` 将 Markdown 文本渲染为 HTML：

```typescript
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItEmoji from 'markdown-it-emoji'
import markdownItKatex from 'markdown-it-katex'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value
    }
    return hljs.highlightAuto(str).value
  }
})

md.use(markdownItTaskLists)
  .use(markdownItEmoji)
  .use(markdownItKatex)
```

#### Mermaid 渲染

渲染完成 HTML 后，查找 `<pre class="mermaid">` 标签，调用 `mermaid.run()` 渲染：

```typescript
async function renderMermaid(container: HTMLElement) {
  const els = container.querySelectorAll('pre.mermaid')
  await mermaid.run({ nodes: Array.from(els) })
}
```

#### 容器渲染

使用 `markdown-it-container` 处理 `:::` 容器，属性从容器内容的第二行（JSON）提取：

```typescript
import containerPlugin from 'markdown-it-container'

md.use(containerPlugin, 'linkCard', {
  validate: (params: string) => params.trim().match(/^linkCard\s*$/),
  render: (tokens: any[], idx: number) => {
    const token = tokens[idx]
    if (token.nesting === 1) {
      // 下一行是 JSON 属性行，需要从 content 中解析
      const contentLines = token.content.split('\n')
      const propsLine = contentLines.find(l => l.trim().match(/^\{.*\}$/))
      const props = propsLine ? parseContainerProps(propsLine) : {}
      return `<div class="md-container link-card" data-props='${JSON.stringify(props)}'><button class="edit-btn">✎</button>`
    }
    return `</div>\n`
  }
})
```

### 4.3 双栏滚动同步

**方案**：监听编辑器 `scroll` 事件，计算滚动百分比，同步设置预览面板滚动位置。

```typescript
function useScrollSync(editorViewRef, previewRef) {
  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return

    view.dispatch({
      effects: ViewUpdate.for(focusChange)
    })

    const listener = (e: Event) => {
      const scrollEl = view.scrollDOM
      const ratio = scrollEl.scrollTop / (scrollEl.scrollHeight - scrollEl.clientHeight)
      const preview = previewRef.current
      preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
    }

    view.scrollDOM.addEventListener('scroll', listener)
    return () => view.scrollDOM.removeEventListener('scroll', listener)
  }, [])
}
```

**防抖处理**：使用 `requestAnimationFrame` 优化频繁滚动事件。

### 4.4 工具栏模块

配置化按钮数组，遍历渲染：

```typescript
interface ToolbarButtonConfig {
  id: string
  icon: React.ComponentType
  title: string
  action: (view: EditorView, state: EditorState) => void
  disabled?: boolean
}

// 内置按钮
const defaultButtons: ToolbarButtonConfig[] = [
  {
    id: 'heading',
    icon: HeadingIcon,
    title: '标题',
    action: (view, state) => insertHeading(view, state)
  },
  {
    id: 'ul',
    icon: ListIcon,
    title: '无序列表',
    action: (view, state) => insertList(view, state, '-')
  },
  {
    id: 'code',
    icon: CodeIcon,
    title: '代码块',
    action: (view, state) => insertCodeBlock(view, state)
  },
  {
    id: 'bold',
    icon: BoldIcon,
    title: '加粗',
    action: (view, state) => wrapSelection(view, state, '**', '**')
  },
  {
    id: 'italic',
    icon: ItalicIcon,
    title: '倾斜',
    action: (view, state) => wrapSelection(view, state, '*', '*')
  },
  {
    id: 'underline',
    icon: UnderlineIcon,
    title: '下划线',
    action: (view, state) => wrapSelection(view, state, '<u>', '</u>')
  },
  {
    id: 'strikethrough',
    icon: StrikethroughIcon,
    title: '中划线',
    action: (view, state) => wrapSelection(view, state, '~~', '~~')
  }
  // ... 更多
]

// 自定义按钮注册
function registerToolbarButton(config: ToolbarButtonConfig) {
  addToolbarItem(config)
}
```

### 4.5 自定义组件模块

#### 问题定义

自定义组件（如 `:::linkCard`）在编辑器中需要：
1. 保护语法标记不被误删
2. 提供可视化编辑入口
3. 支持字段映射与回写

#### 容器语法格式

属性以 JSON 对象形式写在 `:::` 标识行的下一行：

```markdown
:::linkCard
{ title: '测试链接', link: 'https://example.com', description: '这是一个描述' }
:::
```

#### 容器添加与取消

**添加容器**：选中内容后，用 `<plugin-container>` 标签包裹选中的内容：

```typescript
function addContainer(view: EditorView, state: EditorState): void {
  const { from, to } = state.selection.main
  const selectedText = state.doc.sliceString(from, to)
  
  if (!selectedText) return
  
  const containerTag = `<plugin-container>\n${selectedText}\n</plugin-container>`
  view.dispatch({
    changes: {
      from,
      to,
      insert: containerTag
    }
  })
}
```

**取消容器**：选中内容后，移除 `<plugin-container>` 标签，保留内部内容：

```typescript
function removeContainer(view: EditorView, state: EditorState): void {
  const { from, to } = state.selection.main
  const selectedText = state.doc.sliceString(from, to)
  
  // 移除开闭标签，保留内部内容
  const cleanText = selectedText
    .replace(/<plugin-container>\s*\n?/g, '')
    .replace(/\s*\n?<\/plugin-container>/g, '')
  
  view.dispatch({
    changes: {
      from,
      to,
      insert: cleanText
    }
  })
}
```

**Toolbar 按钮配置**：

```typescript
{
  id: 'container',
  icon: ContainerIcon,
  title: '容器',
  action: (view, state) => addContainer(view, state)
},
{
  id: 'removeContainer',
  icon: RemoveContainerIcon,
  title: '取消容器',
  action: (view, state) => removeContainer(view, state)
}
```

#### 组件注册 Schema

每个自定义组件注册时定义可编辑字段：

```typescript
interface ComponentSchema {
  name: string
  label: string
  fields: ComponentField[]
}

interface ComponentField {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'color'
  defaultValue?: string
  options?: { label: string; value: string }[] // for select
}

// 注册示例
componentRegistry.register('linkCard', {
  name: 'linkCard',
  label: '链接卡片',
  fields: [
    { key: 'title', label: '标题', type: 'text', defaultValue: '' },
    { key: 'link', label: '链接', type: 'text', defaultValue: '' },
    { key: 'description', label: '描述', type: 'textarea', defaultValue: '' },
    { key: 'theme', label: '主题', type: 'select', defaultValue: 'default',
      options: [
        { label: '默认', value: 'default' },
        { label: '主要', value: 'primary' },
        { label: '警告', value: 'warning' }
      ]
    }
  ]
})
```

#### 编辑器 gutter 编辑入口

使用 CodeMirror `ViewPlugin` 在 `:::` 行渲染编辑按钮：

```typescript
// 查找 ::: 容器起始行
function findContainerOpens(state: EditorState): ContainerOpen[] {
  const result: ContainerOpen[] = []
  for (let pos = 0; pos < state.doc.length; ) {
    const line = state.doc.lineAt(pos)
    const match = line.text.match(/^:::(\w+)?$/)
    if (match && pos < state.doc.lines) {
      // 读取下一行获取 JSON 属性
      const nextLine = state.doc.lineAt(line.to + 1)
      const propsMatch = nextLine.text.match(/^\{[\s\S]*\}$/)
      if (propsMatch) {
        result.push({
          pos: line.from,
          type: match[1],
          props: parseContainerProps(propsMatch[0])
        })
      }
    }
    pos = line.to + 1
  }
  return result
}

// ViewPlugin：在 ::: 行渲染 gutter widget
const containerWidget = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = Decoration.set(
        findContainerOpens(view.state)
          .map(({ pos, type }) =>
            Decoration.widget({
              widget: new EditButtonWidget(type),
              side: -1, // 渲染在行左侧
              block: true
            })
          )
      )
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = Decoration.set(
          findContainerOpens(update.state)
            .map(({ pos, type }) =>
              Decoration.widget({
                widget: new EditButtonWidget(type),
                side: -1,
                block: true
              })
            )
        )
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)
```

#### 弹窗编辑与回写

```typescript
// 解析 JSON 属性行 "{ key: 'value' }"
function parseContainerProps(jsonStr: string): Record<string, string> {
  try {
    const props: Record<string, string> = {}
    const trimmed = jsonStr.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return props
      // 简单的 key: 'value' 格式解析
      const matches = inner.matchAll(/(\w+):\s*['"]([^'"]*)['"]/g)
      for (const m of matches) {
        props[m[1]] = m[2]
      }
    }
    return props
  } catch {
    return {}
  }
}

// 生成 JSON 属性行
function writeContainerProps(props: Record<string, string>): string {
  const entries = Object.entries(props)
    .map(([k, v]) => `${k}: '${v}'`)
    .join(', ')
  return entries ? `{ ${entries} }` : '{}'
}

// 回写属性到编辑器（修改 ::: 下一行的 JSON）
function updateContainerProps(view: EditorView, linePos: number, type: string, newProps: Record<string, string>): void {
  const line = view.state.doc.lineAt(linePos)
  // 找到下一行（JSON 属性行）
  const propsLine = view.state.doc.lineAt(line.to + 1)
  const newPropsLine = writeContainerProps(newProps)
  view.dispatch({
    changes: {
      from: propsLine.from,
      to: propsLine.to,
      insert: newPropsLine
    }
  })
}
```

#### 弹窗组件

```typescript
interface EditDialogProps {
  componentType: string
  currentProps: Record<string, string>
  onSave: (type: string, props: Record<string, string>) => void
  onClose: () => void
}

function EditDialog({ componentType, currentProps, onSave, onClose }: EditDialogProps) {
  const schema = componentRegistry.get(componentType)
  const [values, setValues] = useState<Record<string, string>>(currentProps)

  return (
    <Modal open onClose={onClose}>
      <div className="edit-dialog">
        <h3>{schema.label} 属性</h3>
        <Form>
          {schema.fields.map(field => (
            <FormItem key={field.key} label={field.label}>
              {field.type === 'textarea' ? (
                <TextArea
                  value={values[field.key] || field.defaultValue || ''}
                  onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                />
              ) : field.type === 'select' ? (
                <Select
                  value={values[field.key] || field.defaultValue || ''}
                  options={field.options}
                  onChange={v => setValues({ ...values, [field.key]: v })}
                />
              ) : (
                <Input
                  value={values[field.key] || field.defaultValue || ''}
                  onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                />
              )}
            </FormItem>
          ))}
        </Form>
        <div className="dialog-actions">
          <button onClick={onClose}>取消</button>
          <button onClick={() => {
            onSave(componentType, values)
            onClose()
          }}>确认</button>
        </div>
      </div>
    </Modal>
  )
}
```

### 4.6 图片上传

支持拖拽和粘贴上传，插入 Markdown 图片语法：

```typescript
function handleImageUpload(view: EditorView, file: File): void {
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    const { from, to } = view.state.selection.main
    const insert = `![${file.name}](${base64})`
    view.dispatch({ changes: { from, to, insert } })
  }
  reader.readAsDataURL(file)
}
```

## 5. 目录结构

```
src/
├── components/
│   ├── Editor/
│   │   ├── index.tsx              # 编辑器主组件
│   │   ├── codemirrorExtensions.ts # CodeMirror 扩展配置
│   │   └── containerWidget.ts     # 容器编辑入口 widget
│   ├── Preview/
│   │   ├── index.tsx              # 预览面板
│   │   └── render.ts              # markdown-it 渲染逻辑
│   ├── Toolbar/
│   │   ├── index.tsx              # 工具栏
│   │   └── buttons.ts             # 按钮配置
│   ├── Panel/
│   │   └── SplitPanels.tsx        # 分栏组件
│   └── Dialog/
│       └── EditDialog.tsx         # 弹窗编辑组件
├── hooks/
│   ├── useScrollSync.ts           # 滚动同步
│   └── useEditor.ts               # 编辑器状态
├── registry/
│   ├── componentRegistry.ts       # 组件注册中心
│   └── toolbarRegistry.ts         # 工具栏注册中心
├── utils/
│   ├── parseContainer.ts          # 容器属性解析
│   └── writeContainer.ts          # 容器属性写入
├── types/
│   └── index.ts                   # 类型定义
├── App.tsx                        # 主应用组件
└── main.tsx                       # 入口
```

## 6. 实施计划

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| P0 | [x] 项目初始化、CodeMirror 编辑器、markdown-it 预览 | 高 |
| P0 | [x] 双栏布局、滚动同步 | 高 |
| P1 | [x] 工具栏（标题、列表、链接、代码块、表格、引用） | 高 |
| P1 | ~~撤销/重做~~ | 高 |
| P1 | ~~图片上传~~ | 高 |
| P2 | ~~代码高亮、Mermaid 图表、LaTeX 公式~~ | 中 |
| P2 | 全屏模式 | 中 |
| P3 | 自定义组件容器、弹窗编辑 | 低 |
| P3 | [x] 自定义工具栏按钮 | 低 |
