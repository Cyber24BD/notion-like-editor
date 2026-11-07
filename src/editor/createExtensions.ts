import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Focus, Placeholder } from '@tiptap/extensions'
import { TaskItem, TaskList } from '@tiptap/extension-list'

import { TableKit } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { Typography } from '@tiptap/extension-typography'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Callout } from './nodes/Callout'
import { ToggleBlock } from './nodes/Toggle'
import { PageLink } from './nodes/PageLink'
import { ImageBlock } from './nodes/ImageBlock'
import { VideoEmbed } from './nodes/VideoEmbed'
import { AudioEmbed } from './nodes/AudioEmbed'
import { IframeEmbed } from './nodes/IframeEmbed'
import { Bookmark } from './nodes/Bookmark'
import { CodeBlock } from './nodes/CodeBlock'
import { TableOfContents } from './nodes/TableOfContents'
import { InlineMath } from './nodes/InlineMath'
import { BlockMath } from './nodes/BlockMath'
import { Chart } from './nodes/Chart'
import { SlashCommand } from './slash/SlashCommand'

export function createExtensions(): Extensions {
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
    CodeBlock,
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
    VideoEmbed,
    AudioEmbed,
    IframeEmbed,
    Bookmark,
    TableOfContents,
    InlineMath,
    BlockMath,
    Chart,
    SlashCommand,
  ]
}
