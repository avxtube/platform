"use client"

import * as React from "react"
import {
  Bold,
  Code,
  CodeXml,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

const editorStyles = `
.rte-content { outline: none; overflow-wrap: break-word; }
.rte-content:empty::before { content: attr(data-placeholder); color: var(--color-muted-foreground); opacity: .55; pointer-events: none; }
.rte-content p { margin: .35em 0; }
.rte-content h2 { font-size: 1.5em; font-weight: 700; margin: .85em 0 .3em; }
.rte-content h3 { font-size: 1.2em; font-weight: 650; margin: .7em 0 .25em; }
.rte-content blockquote { border-left: 3px solid var(--color-border); color: var(--color-muted-foreground); margin: .65em 0; padding-left: 1em; }
.rte-content pre { background: var(--color-muted); border-radius: .5rem; font-family: ui-monospace, monospace; font-size: .875em; margin: .65em 0; overflow-x: auto; padding: .8em 1em; }
.rte-content code { background: var(--color-muted); border-radius: .25rem; font-family: ui-monospace, monospace; font-size: .875em; padding: .1em .3em; }
.rte-content pre code { background: none; padding: 0; }
.rte-content ul, .rte-content ol { margin: .35em 0; padding-left: 1.5em; }
.rte-content ul { list-style: disc; }
.rte-content ol { list-style: decimal; }
.rte-content a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
.rte-content hr { border: 0; border-top: 1px solid var(--color-border); margin: 1em 0; }
.rte-content img { border-radius: .5rem; max-width: 100%; }
`

type RichTextEditorProps = {
  id?: string
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: string
  maxLength?: number
  labels?: Partial<typeof defaultLabels>
}

const defaultLabels = {
  toolbar: "Text formatting",
  editor: "Rich text editor",
  undo: "Undo",
  redo: "Redo",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bullets: "Bulleted list",
  numbers: "Numbered list",
  quote: "Quote",
  code: "Code block",
  rule: "Horizontal rule",
  link: "Insert link",
  unlink: "Remove link",
  clear: "Clear formatting",
  source: "View HTML source",
}

type Action = {
  key: string
  label: keyof typeof defaultLabels
  icon: React.ComponentType<{ className?: string }>
  command?: string
  custom?: "heading2" | "heading3" | "quote" | "code" | "link"
}

function execute(command: string, value?: string) {
  document.execCommand(command, false, value)
}

function currentBlockTag(editor: HTMLDivElement) {
  const selection = window.getSelection()
  let node = selection?.anchorNode ?? null
  while (node && node !== editor) {
    if (node instanceof HTMLElement && /^(P|H2|H3|BLOCKQUOTE|PRE)$/.test(node.tagName)) return node.tagName
    node = node.parentNode
  }
  return ""
}

export function RichTextEditor({
  id,
  value = "",
  onChange,
  placeholder,
  disabled = false,
  className,
  minHeight = "18rem",
  maxLength,
  labels,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const internalChange = React.useRef(false)
  const mergedLabels = { ...defaultLabels, ...labels }
  const [active, setActive] = React.useState<Record<string, boolean>>({})
  const [sourceMode, setSourceMode] = React.useState(false)
  const [source, setSource] = React.useState(value)

  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor || internalChange.current || editor.innerHTML === value) return
    editor.innerHTML = value
  }, [value])

  const updateActive = React.useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (maxLength && editor.innerHTML.length > maxLength) {
      editor.innerHTML = value
      return
    }
    const selection = window.getSelection()
    let node = selection?.anchorNode ?? null
    let linked = false
    while (node && node !== editor) {
      if (node instanceof HTMLAnchorElement) linked = true
      node = node.parentNode
    }
    const tag = currentBlockTag(editor)
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      h2: tag === "H2",
      h3: tag === "H3",
      blockquote: tag === "BLOCKQUOTE",
      pre: tag === "PRE",
      link: linked,
    })
  }, [])

  const emitChange = React.useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    internalChange.current = true
    onChange?.(editor.innerHTML)
    requestAnimationFrame(() => { internalChange.current = false })
    updateActive()
  }, [maxLength, onChange, updateActive, value])

  const toggleBlock = React.useCallback((tag: "H2" | "H3" | "BLOCKQUOTE" | "PRE") => {
    const editor = editorRef.current
    if (!editor) return
    execute("formatBlock", currentBlockTag(editor) === tag ? "P" : tag)
    emitChange()
  }, [emitChange])

  const toggleLink = React.useCallback(() => {
    if (active.link) {
      execute("unlink")
      emitChange()
      return
    }
    const url = window.prompt("URL")?.trim()
    if (!url || !/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return
    execute("createLink", url)
    emitChange()
  }, [active.link, emitChange])

  const groups: Action[][] = [
    [
      { key: "undo", label: "undo", icon: Undo2, command: "undo" },
      { key: "redo", label: "redo", icon: Redo2, command: "redo" },
    ],
    [
      { key: "bold", label: "bold", icon: Bold, command: "bold" },
      { key: "italic", label: "italic", icon: Italic, command: "italic" },
      { key: "underline", label: "underline", icon: Underline, command: "underline" },
      { key: "strikeThrough", label: "strike", icon: Strikethrough, command: "strikeThrough" },
    ],
    [
      { key: "h2", label: "heading2", icon: Heading2, custom: "heading2" },
      { key: "h3", label: "heading3", icon: Heading3, custom: "heading3" },
    ],
    [
      { key: "insertUnorderedList", label: "bullets", icon: List, command: "insertUnorderedList" },
      { key: "insertOrderedList", label: "numbers", icon: ListOrdered, command: "insertOrderedList" },
    ],
    [
      { key: "blockquote", label: "quote", icon: Quote, custom: "quote" },
      { key: "pre", label: "code", icon: Code, custom: "code" },
      { key: "rule", label: "rule", icon: Minus, command: "insertHorizontalRule" },
      { key: "link", label: active.link ? "unlink" : "link", icon: active.link ? Unlink : Link, custom: "link" },
    ],
    [{ key: "clear", label: "clear", icon: RemoveFormatting, command: "removeFormat" }],
  ]

  function runAction(action: Action) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    if (action.custom === "heading2") toggleBlock("H2")
    else if (action.custom === "heading3") toggleBlock("H3")
    else if (action.custom === "quote") toggleBlock("BLOCKQUOTE")
    else if (action.custom === "code") toggleBlock("PRE")
    else if (action.custom === "link") toggleLink()
    else if (action.command) {
      execute(action.command)
      emitChange()
    }
  }

  function toggleSource() {
    if (sourceMode) {
      if (editorRef.current) editorRef.current.innerHTML = source
    } else {
      setSource(editorRef.current?.innerHTML ?? value)
    }
    setSourceMode((current) => !current)
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-background", className)}>
      <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
      <div className={cn("flex min-h-11 flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5", disabled && "pointer-events-none opacity-50")} role="toolbar" aria-label={mergedLabels.toolbar}>
        {!sourceMode ? groups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex ? <span className="mx-1 h-5 w-px bg-border" /> : null}
            {group.map((action) => {
              const Icon = action.icon
              return <button key={action.key} type="button" title={mergedLabels[action.label]} aria-label={mergedLabels[action.label]} aria-pressed={Boolean(active[action.key])} disabled={disabled} onMouseDown={(event) => { event.preventDefault(); runAction(action) }} className={cn("inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none", active[action.key] && "bg-accent text-accent-foreground")}><Icon className="size-4" /></button>
            })}
          </React.Fragment>
        )) : <span className="px-2 font-mono text-xs text-muted-foreground">HTML</span>}
        <span className="flex-1" />
        <button type="button" title={mergedLabels.source} aria-label={mergedLabels.source} aria-pressed={sourceMode} disabled={disabled} onMouseDown={(event) => { event.preventDefault(); toggleSource() }} className={cn("inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent", sourceMode && "bg-accent")}><CodeXml className="size-4" /></button>
      </div>
      <textarea id={sourceMode ? id : undefined} value={source} onChange={(event) => { setSource(event.target.value); onChange?.(event.target.value) }} disabled={disabled} maxLength={maxLength} spellCheck={false} placeholder={placeholder} aria-label={mergedLabels.source} className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm outline-none" style={{ minHeight, display: sourceMode ? undefined : "none" }} />
      <div id={!sourceMode ? id : undefined} ref={editorRef} contentEditable={!disabled} suppressContentEditableWarning data-placeholder={placeholder} role="textbox" aria-label={mergedLabels.editor} aria-multiline="true" className="rte-content px-4 py-3 text-sm leading-7" style={{ minHeight, display: sourceMode ? "none" : undefined }} onInput={emitChange} onMouseUp={updateActive} onKeyUp={updateActive} onKeyDown={(event) => { if (!(event.ctrlKey || event.metaKey)) return; const command = { b: "bold", i: "italic", u: "underline" }[event.key.toLowerCase()]; if (!command) return; event.preventDefault(); execute(command); emitChange() }} />
    </div>
  )
}
