import type { JSONContent } from '@tiptap/core'

type Mark = NonNullable<JSONContent['marks']>[number]

const text = (value: string, mark?: Mark): JSONContent => ({
  type: 'text',
  text: value,
  ...(mark ? { marks: [mark] } : {}),
})

const p = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  ...(content.length ? { content } : {}),
})

export const seedContent: Record<string, JSONContent> = {
  welcome: {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs: { emoji: '👋' },
        content: [
          p(
            text('Welcome! This is a fully working Notion-style editor — '),
            text('type /', { type: 'bold' }),
            text(' anywhere to insert a block, or hover a line to grab its handle.'),
          ),
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [text('Everything a page needs')] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [p(text('Slash commands for 14+ block types'))] },
          { type: 'listItem', content: [p(text('Drag & drop blocks with a live drop indicator'))] },
          { type: 'listItem', content: [p(text('Inline formatting bubble menu, links and highlights'))] },
          { type: 'listItem', content: [p(text('Nested pages, dark mode and local persistence'))] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [text('Rich text that feels native')] },
      p(
        text('Select any text to reveal the toolbar. You can write '),
        text('bold', { type: 'bold' }),
        text(', '),
        text('italic', { type: 'italic' }),
        text(', '),
        text('underline', { type: 'underline' }),
        text(', '),
        text('strikethrough', { type: 'strike' }),
        text(', '),
        text('inline code', { type: 'code' }),
        text(' and '),
        text('highlighted text', { type: 'highlight', attrs: { color: 'var(--notion-highlight)' } }),
        text(' — or add a '),
        text('link', { type: 'link', attrs: { href: 'https://tiptap.dev', target: '_blank', rel: 'noopener noreferrer nofollow' } }),
        text(' like this one.'),
      ),
      { type: 'heading', attrs: { level: 3 }, content: [text('A to-do list')] },
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [p(text('Build the editor shell'))],
          },
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [p(text('Match the Notion scrollbar and typography'))],
          },
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [p(text('Write something of your own'))],
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          p(
            text(
              '“Simplicity is about subtracting the obvious and adding the meaningful.”',
            ),
          ),
        ],
      },
      {
        type: 'toggle',
        attrs: { open: true },
        content: [
          p(text('Where are my pages stored?')),
          p(
            text(
              'Everything lives in your browser’s localStorage — no account, no server round-trips. Refreshing keeps your work; clearing site data resets it.',
            ),
          ),
        ],
      },
      {
        type: 'toggle',
        attrs: { open: false },
        content: [
          p(text('Keyboard shortcuts')),
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [p(text('⌘/Ctrl + B — bold'))] },
              { type: 'listItem', content: [p(text('⌘/Ctrl + ⇧ + S — strikethrough'))] },
              { type: 'listItem', content: [p(text('⌘/Ctrl + U — underline'))] },
              { type: 'listItem', content: [p(text('Esc — close any menu'))] },
            ],
          },
        ],
      },
      { type: 'horizontalRule' },
      { type: 'heading', attrs: { level: 2 }, content: [text('Code and tables')] },
      {
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [
          text(
            "const editor = new Editor({\n  extensions: [StarterKit, SlashCommand],\n  content: '<p>Hello, notion</p>',\n})\n\neditor.commands.focus('end')",
          ),
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [p(text('Shortcut'))] },
              { type: 'tableHeader', content: [p(text('Action'))] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [p(text('/'))] },
              { type: 'tableCell', content: [p(text('Open the block menu'))] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [p(text('⌘ + K'))] },
              { type: 'tableCell', content: [p(text('Search pages'))] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [p(text('⌘ + Shift + M'))] },
              { type: 'tableCell', content: [p(text('Toggle dark mode'))] },
            ],
          },
        ],
      },
      { type: 'paragraph' },
    ],
  },
  blocks: {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs: { emoji: '⌨️' },
        content: [p(text('Handy shortcuts for moving around a page quickly.'))],
      },
      { type: 'heading', attrs: { level: 2 }, content: [text('Editing')] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [p(text('Enter — new block below'))] },
          { type: 'listItem', content: [p(text('Shift + Enter — soft line break'))] },
          { type: 'listItem', content: [p(text('Tab / Shift + Tab — indent or outdent list items'))] },
          { type: 'listItem', content: [p(text('Backspace at the start — merge with the block above'))] },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [text('Formatting')] },
      {
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [p(text('**bold** → bold text'))] },
          { type: 'listItem', content: [p(text('_italic_ → italic text'))] },
          { type: 'listItem', content: [p(text('`code` → inline code'))] },
          { type: 'listItem', content: [p(text('> → block quote'))] },
        ],
      },
      { type: 'paragraph' },
    ],
  },
  design: {
    type: 'doc',
    content: [
      p(text('A few notes on the design system used across this workspace.')),
      { type: 'heading', attrs: { level: 2 }, content: [text('Surfaces')] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [p(text('Sidebar — #f7f7f5, 8% black hover states'))] },
          { type: 'listItem', content: [p(text('Page — pure white, 708px content column'))] },
          { type: 'listItem', content: [p(text('Dark mode — #191919 page, #202020 sidebar'))] },
        ],
      },
      {
        type: 'blockquote',
        content: [p(text('Every surface, border and shadow is driven by a CSS custom property.'))],
      },
      { type: 'paragraph' },
    ],
  },
}
