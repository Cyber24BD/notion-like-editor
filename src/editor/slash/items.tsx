import type { Editor, Range } from '@tiptap/core'
import {
  Audio,
  Bookmark,
  CalloutIcon,
  ChartBar,
  Code as CodeIcon,
  DividerIcon,
  Frame,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  ListBulleted,
  ListOrdered,
  PageIcon,
  Quote as QuoteIcon,
  Sigma,
  Table as TableIcon,
  TableOfContents,
  Todo,
  Video as VideoIcon,
  ToggleIcon,
  Type,
} from '../../components/Icons'
import { pickImageFile } from '../images/imageFiles'
import { openVideoDialog } from '../video/dialogStore'
import { openAudioDialog } from '../audio/dialogStore'
import { openIframeDialog } from '../iframe/dialogStore'
import { openBookmarkDialog } from '../bookmark/dialogStore'
import { openMathDialog } from '../math/dialogStore'
import type { SlashItem } from './types'

function chain(editor: Editor, range: Range | null) {
  const commands = editor.chain().focus()
  return range ? commands.deleteRange(range) : commands
}

const ICON_SIZE = 22

export const slashItems: SlashItem[] = [
  {
    id: 'paragraph',
    title: 'Text',
    subtitle: 'Just start writing with plain text.',
    group: 'Basic blocks',
    icon: <Type size={ICON_SIZE} />,
    keywords: ['paragraph', 'plain', 'body', 'p'],
    run: ({ editor, range }) => {
      chain(editor, range).setParagraph().run()
    },
  },
  {
    id: 'heading-1',
    title: 'Heading 1',
    subtitle: 'Big section heading.',
    group: 'Basic blocks',
    icon: <Heading1 size={ICON_SIZE} />,
    keywords: ['h1', 'title', 'big', 'heading'],
    run: ({ editor, range }) => {
      chain(editor, range).setHeading({ level: 1 }).run()
    },
  },
  {
    id: 'heading-2',
    title: 'Heading 2',
    subtitle: 'Medium section heading.',
    group: 'Basic blocks',
    icon: <Heading2 size={ICON_SIZE} />,
    keywords: ['h2', 'subtitle', 'heading'],
    run: ({ editor, range }) => {
      chain(editor, range).setHeading({ level: 2 }).run()
    },
  },
  {
    id: 'heading-3',
    title: 'Heading 3',
    subtitle: 'Small section heading.',
    group: 'Basic blocks',
    icon: <Heading3 size={ICON_SIZE} />,
    keywords: ['h3', 'heading'],
    run: ({ editor, range }) => {
      chain(editor, range).setHeading({ level: 3 }).run()
    },
  },
  {
    id: 'bullet-list',
    title: 'Bulleted list',
    subtitle: 'Create a simple bulleted list.',
    group: 'Basic blocks',
    icon: <ListBulleted size={ICON_SIZE} />,
    keywords: ['bullet', 'unordered', 'ul', 'list'],
    run: ({ editor, range }) => {
      chain(editor, range).toggleBulletList().run()
    },
  },
  {
    id: 'numbered-list',
    title: 'Numbered list',
    subtitle: 'Create a list with numbering.',
    group: 'Basic blocks',
    icon: <ListOrdered size={ICON_SIZE} />,
    keywords: ['number', 'ordered', 'ol', 'list'],
    run: ({ editor, range }) => {
      chain(editor, range).toggleOrderedList().run()
    },
  },
  {
    id: 'task-list',
    title: 'To-do list',
    subtitle: 'Track tasks with a checklist.',
    group: 'Basic blocks',
    icon: <Todo size={ICON_SIZE} />,
    keywords: ['todo', 'task', 'checkbox', 'check'],
    run: ({ editor, range }) => {
      chain(editor, range).toggleTaskList().run()
    },
  },
  {
    id: 'toggle',
    title: 'Toggle list',
    subtitle: 'Hide and show nested content.',
    group: 'Basic blocks',
    icon: <ToggleIcon size={ICON_SIZE} />,
    keywords: ['toggle', 'collapse', 'details', 'accordion'],
    run: ({ editor, range }) => {
      chain(editor, range).wrapIn('toggle', { open: true }).run()
    },
  },
  {
    id: 'quote',
    title: 'Quote',
    subtitle: 'Capture a quote.',
    group: 'Basic blocks',
    icon: <QuoteIcon size={ICON_SIZE} />,
    keywords: ['quote', 'blockquote', 'citation'],
    run: ({ editor, range }) => {
      chain(editor, range).toggleBlockquote().run()
    },
  },
  {
    id: 'divider',
    title: 'Divider',
    subtitle: 'Visually divide blocks.',
    group: 'Basic blocks',
    icon: <DividerIcon size={ICON_SIZE} />,
    keywords: ['divider', 'separator', 'hr', 'line'],
    run: ({ editor, range }) => {
      chain(editor, range).setHorizontalRule().run()
    },
  },
  {
    id: 'callout',
    title: 'Callout',
    subtitle: 'Make writing stand out.',
    group: 'Basic blocks',
    icon: <CalloutIcon size={ICON_SIZE} />,
    keywords: ['callout', 'note', 'info', 'banner'],
    run: ({ editor, range }) => {
      chain(editor, range).wrapIn('callout', { emoji: '💡' }).run()
    },
  },
  {
    id: 'code',
    title: 'Code',
    subtitle: 'Capture a code snippet.',
    group: 'Basic blocks',
    icon: <CodeIcon size={ICON_SIZE} />,
    keywords: ['code', 'snippet', 'pre', 'mono'],
    run: ({ editor, range }) => {
      chain(editor, range).toggleCodeBlock().run()
    },
  },
  {
    id: 'image',
    title: 'Image',
    subtitle: 'Upload an image from your computer.',
    group: 'Media',
    icon: <ImageIcon size={ICON_SIZE} />,
    keywords: ['image', 'picture', 'photo', 'media', 'upload', 'file', 'computer'],
    run: ({ editor, range }) => {
      // Remove the "/image" text first, then open the OS picker synchronously
      // so the browser still treats it as a user gesture.
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()

      void pickImageFile().then((image) => {
        if (!image || editor.isDestroyed) return
        editor.chain().focus().setImage({ src: image.src, alt: image.alt }).run()
      })
    },
  },
  {
    id: 'table',
    title: 'Table',
    subtitle: 'Add a simple table.',
    group: 'Media',
    icon: <TableIcon size={ICON_SIZE} />,
    keywords: ['table', 'grid', 'rows', 'columns', 'sheet'],
    run: ({ editor, range }) => {
      chain(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    id: 'chart',
    title: 'Chart',
    subtitle: 'Bar, line, area, pie or donut with editable data.',
    group: 'Media',
    icon: <ChartBar size={ICON_SIZE} />,
    keywords: ['chart', 'graph', 'bar', 'line', 'pie', 'donut', 'data', 'analytics'],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.insertChart().run()
    },
  },
  {
    id: 'video',
    title: 'Video',
    subtitle: 'Embed YouTube, Vimeo, Loom or a video file.',
    group: 'Media',
    icon: <VideoIcon size={ICON_SIZE} />,
    keywords: ['video', 'embed', 'youtube', 'vimeo', 'loom', 'twitch', 'mp4', 'media'],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()
      openVideoDialog(editor)
    },
  },
  {
    id: 'audio',
    title: 'Audio',
    subtitle: 'Embed Spotify, SoundCloud, Apple Podcasts or an audio file.',
    group: 'Media',
    icon: <Audio size={ICON_SIZE} />,
    keywords: [
      'audio',
      'music',
      'podcast',
      'spotify',
      'soundcloud',
      'apple podcasts',
      'apple music',
      'mixcloud',
      'deezer',
      'tidal',
      'mp3',
      'wav',
      'ogg',
      'm4a',
      'flac',
      'sound',
      'player',
      'embed',
    ],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()
      openAudioDialog(editor)
    },
  },
  {
    id: 'iframe',
    title: 'Iframe',
    subtitle: 'Embed a website, map, form or widget.',
    group: 'Media',
    icon: <Frame size={ICON_SIZE} />,
    keywords: [
      'iframe',
      'embed',
      'website',
      'web',
      'url',
      'html',
      'widget',
      'map',
      'form',
      'figma',
      'codepen',
    ],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()
      openIframeDialog(editor)
    },
  },
  {
    id: 'bookmark',
    title: 'Bookmark',
    subtitle: 'Create a link preview card with title and description.',
    group: 'Media',
    icon: <Bookmark size={ICON_SIZE} />,
    keywords: [
      'bookmark',
      'link',
      'url',
      'preview',
      'card',
      'website',
      'article',
      'embed',
    ],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()
      openBookmarkDialog(editor)
    },
  },
  {
    id: 'math',
    title: 'Math',
    subtitle: 'Insert an inline or block LaTeX equation.',
    group: 'Advanced',
    icon: <Sigma size={ICON_SIZE} />,
    keywords: [
      'math',
      'latex',
      'equation',
      'formula',
      'katex',
      'inline',
      'block',
      'symbol',
      'fraction',
      'matrix',
    ],
    run: ({ editor, range }) => {
      const commands = editor.chain().focus()
      if (range) commands.deleteRange(range)
      commands.run()
      openMathDialog({
        editor,
        mode: 'block',
        initialLatex: '',
        allowModeChange: true,
        onApply: (latex, mode) => {
          if (mode === 'inline') {
            editor.chain().focus().setInlineMath(latex).run()
          } else {
            editor.chain().focus().setBlockMath(latex).run()
          }
        },
      })
    },
  },
  {
    id: 'table-of-contents',
    title: 'Table of contents',
    subtitle: 'Jump to headings on this page.',
    group: 'Advanced',
    icon: <TableOfContents size={ICON_SIZE} />,
    keywords: [
      'toc',
      'table of contents',
      'outline',
      'headings',
      'navigation',
      'index',
      'contents',
    ],
    run: ({ editor, range }) => {
      chain(editor, range)
        .setTableOfContents({ title: 'Table of contents' })
        .run()
    },
  },
  {
    id: 'page',
    title: 'Page',
    subtitle: 'Embed a sub-page inside this one.',
    group: 'Media',
    icon: <PageIcon size={ICON_SIZE} />,
    keywords: ['page', 'subpage', 'document', 'nested'],
    run: ({ editor, range }) => {
      const createSubPage = editor.storage.pageLink?.createSubPage
      const page = createSubPage?.('') ?? null
      if (!page) return
      chain(editor, range)
        .insertContent({
          type: 'pageLink',
          attrs: { pageId: page.id, title: page.title, icon: page.icon },
        })
        .run()
    },
  },
]
