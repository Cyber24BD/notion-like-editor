import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Focus, Placeholder } from '@tiptap/extensions'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { Typography } from '@tiptap/extension-typography'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Callout } from '../nodes/Callout'
import { ToggleBlock } from '../nodes/Toggle'
import { PageLink } from '../nodes/PageLink'
import { ImageBlock } from '../nodes/ImageBlock'
import { BlockRange } from '../nodes/BlockRange'
import { SlashCommand } from '../slash/SlashCommand'
import { slashItems } from '../slash/items'
import { CORE_FEATURES, type EditorFeatures } from '../features'

export interface PresetExtensionsOptions {
  features?: EditorFeatures
  extensions?: Extensions
}

const coreItems = slashItems.filter(
  (item) => !item.feature || CORE_FEATURES[item.feature],
)

export function buildCoreExtensions(
  extensions?: Extensions,
): Extensions {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      },
      dropcursor: {
        color: 'var(--accent)',
        width: 2,
        class: 'notion-drop-cursor',
      },
    }),
    BlockRange,
    Placeholder.configure({
      showOnlyCurrent: true,
      showOnlyWhenEditable: true,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return `Heading ${String(node.attrs.level ?? '')}`.trim()
        }
        return "Type '/' for commands…"
      },
    }),
    Focus.configure({ className: 'has-focus', mode: 'deepest' }),
    TaskList,
    TaskItem.configure({ nested: true }),
    ImageBlock.configure({ allowBase64: true }),
    TableKit.configure({
      table: {
        resizable: true,
        lastColumnResizable: false,
        allowTableNodeSelection: true,
        HTMLAttributes: { class: 'notion-table' },
      },
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Typography,
    Callout,
    ToggleBlock,
    PageLink,
    ...(extensions ?? []),
  ]
}

export function createExtensions(
  options: PresetExtensionsOptions = {},
): Extensions {
  return [
    ...buildCoreExtensions(options.extensions),
    SlashCommand.configure({ items: coreItems }),
  ]
}
