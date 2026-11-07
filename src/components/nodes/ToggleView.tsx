import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ChevronRight } from '../Icons'

export function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const open = Boolean(node.attrs.open)

  return (
    <NodeViewWrapper className="toggle-block" data-open={open ? 'true' : 'false'}>
      <div className="toggle-block__row">
        <button
          type="button"
          className="toggle-block__arrow"
          contentEditable={false}
          aria-expanded={open}
          aria-label={open ? 'Collapse toggle' : 'Expand toggle'}
          onClick={() => updateAttributes({ open: !open })}
        >
          <ChevronRight size={14} />
        </button>
        <NodeViewContent
          className="toggle-block__content"
          onFocus={() => {
            if (!open) updateAttributes({ open: true })
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
