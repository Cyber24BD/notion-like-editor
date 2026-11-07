import { useEffect, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { TableOfContents } from '../Icons'

interface HeadingItem {
  id: string
  level: number
  text: string
  pos: number
}

function collectHeadings(doc: PMNode): HeadingItem[] {
  const headings: HeadingItem[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const level = Number(node.attrs.level)
    if (level < 1 || level > 3) return
    headings.push({
      id: `${pos}:${level}`,
      level,
      text: node.textContent.trim() || 'Untitled heading',
      pos,
    })
  })
  return headings
}

function sameHeadings(a: HeadingItem[], b: HeadingItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (item, index) =>
      item.id === b[index].id &&
      item.level === b[index].level &&
      item.text === b[index].text,
  )
}

export function TableOfContentsView({
  node,
  editor,
  selected,
}: NodeViewProps) {
  const title = (node.attrs.title as string) || 'Table of contents'
  const [headings, setHeadings] = useState<HeadingItem[]>(() =>
    collectHeadings(editor.state.doc),
  )

  useEffect(() => {
    const update = () => {
      const next = collectHeadings(editor.state.doc)
      setHeadings((previous) => (sameHeadings(previous, next) ? previous : next))
    }

    update()
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])

  const jumpTo = (pos: number) => {
    const max = editor.state.doc.content.size
    const target = Math.min(Math.max(pos + 1, 0), max)
    editor.chain().focus().setTextSelection(target).scrollIntoView().run()
  }

  return (
    <NodeViewWrapper
      className="toc-block"
      data-selected={selected ? 'true' : 'false'}
      contentEditable={false}
    >
      <div className="toc-block__header">
        <span className="toc-block__icon" aria-hidden="true">
          <TableOfContents size={16} />
        </span>
        <span className="toc-block__title">{title}</span>
        <span className="toc-block__count">
          {headings.length} {headings.length === 1 ? 'heading' : 'headings'}
        </span>
      </div>

      {headings.length > 0 ? (
        <nav className="toc-block__list" aria-label={title}>
          {headings.map((heading) => (
            <button
              key={heading.id}
              type="button"
              className="toc-block__item"
              data-level={heading.level}
              title={heading.text}
              onClick={() => jumpTo(heading.pos)}
            >
              <span className="toc-block__marker" aria-hidden="true" />
              <span className="toc-block__text">{heading.text}</span>
            </button>
          ))}
        </nav>
      ) : (
        <div className="toc-block__empty">
          Add H1–H3 headings to build a table of contents.
        </div>
      )}
    </NodeViewWrapper>
  )
}
