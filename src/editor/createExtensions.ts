import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Focus, Placeholder } from '@tiptap/extensions'
import { TaskItem, TaskList } from '@tiptap/extension-list'

import { TableKit } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { Typography } from '@tiptap/extension-typography'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { Callout } from './nodes/Callout'
import { ToggleBlock } from './nodes/Toggle'
import { PageLink } from './nodes/PageLink'
import { ImageBlock } from './nodes/ImageBlock'
import { VideoEmbed } from './nodes/VideoEmbed'
import { IframeEmbed } from './nodes/IframeEmbed'
import { Chart } from './nodes/Chart'
import { SlashCommand } from './slash/SlashCommand'

// Only the languages an editor realistically needs. Anything else falls back
// to automatic detection instead of shipping the full highlight.js grammar set.
const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
})

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
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'typescript' }),
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
    IframeEmbed,
    Chart,
    SlashCommand,
  ]
}
