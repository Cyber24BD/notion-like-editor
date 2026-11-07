import { useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { LazyEmojiPicker } from '../lazy/LazyWidgets'

export function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <NodeViewWrapper className="callout" data-emoji={node.attrs.emoji as string}>
      <div className="callout__gutter" contentEditable={false}>
        <button
          type="button"
          className="callout__emoji"
          onClick={() => setPickerOpen((open) => !open)}
          aria-label="Change callout icon"
        >
          {node.attrs.emoji as string}
        </button>
        {pickerOpen && (
          <LazyEmojiPicker
            className="emoji-picker--callout"
            onSelect={(emoji) => {
              updateAttributes({ emoji })
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      <NodeViewContent className="callout__content" />
    </NodeViewWrapper>
  )
}
