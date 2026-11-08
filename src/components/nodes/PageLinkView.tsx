import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { usePageNav } from '../../editor/PageNavContext'
import { ArrowLeft } from '../Icons'

export function PageLinkView({ node, selected }: NodeViewProps) {
  const { navigate } = usePageNav()
  const title = (node.attrs.title as string) || 'Untitled'
  const icon = (node.attrs.icon as string) || '📄'
  const pageId = node.attrs.pageId as string | null

  return (
    <NodeViewWrapper
      className="notion-page-link-row"
      data-selected={selected ? 'true' : 'false'}
      contentEditable={false}
    >
      <button
        type="button"
        className="notion-page-link-row__button"
        onClick={() => {
          if (pageId) navigate(pageId)
        }}
      >
        <span className="notion-page-link-row__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="notion-page-link-row__title">{title}</span>
        <span className="notion-page-link-row__arrow" aria-hidden="true">
          <ArrowLeft size={14} />
        </span>
      </button>
    </NodeViewWrapper>
  )
}
