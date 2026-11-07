# Notion-like editor

A Notion-style block editor built with **React 19 + TypeScript + Tiptap 3 + Vite**, recreated to feel like the real thing: Notion's typography, colors, scrollbar, block hover handles, slash menu, inline toolbar, nested pages, dark mode and responsive behavior.

Everything is local — pages are stored in `localStorage`, there is no backend or account.

Repository: [github.com/Cyber24BD/notion-like-editor](https://github.com/Cyber24BD/notion-like-editor)

## Run the demo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## Use it in another React project

The editor is also exposed as an embeddable component. Build the library and pack it locally:

```bash
npm run build:lib
npm pack
# in your other app:
npm install ../notion-like-editor-1.0.0.tgz
```

```tsx
import { useState } from 'react'
import { NotionEditor, type JSONContent } from 'notion-like-editor'
import 'notion-like-editor/style.css'

export function MyPage() {
  const [title, setTitle] = useState('My document')
  const [content, setContent] = useState<JSONContent | null>(null)

  return (
    <div style={{ height: '80vh' }}>
      <NotionEditor
        documentId="doc-1"
        title={title}
        icon="📝"
        content={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
      />
    </div>
  )
}
```

- **React 18 or 19.** React is a peer dependency; the editor stack ships with the package.
- **Size the parent.** The editor fills its container and scrolls internally, so give the wrapper a height.
- **Persistence is yours.** Save `content` JSON however you like. Images are embedded as data URLs, while videos/charts only store metadata and settings.
- **`documentId` remounts.** Change it when you switch documents. Editing the same document externally requires a new id/key.
- **Optional callbacks:** `onIconChange`, `onNavigatePage` / `onCreateSubPage` for page links.
- **Presentation props:** `editable`, `showHeader`, `showBubbleToolbar`, `showTableToolbar`, `className`.
- **Theming:** the stylesheet includes Notion design tokens, base typography and scrollbars. Set `data-theme="dark"` on `<html>` for dark mode, or override the CSS variables.
- **Types** are included at `dist-lib/lib/index.d.ts`; the package exports `./style.css`.

The demo app (`src/App.tsx`, `src/store`) is separate from the library entry and is not required by consumers.

## What's included

**Blocks**

- Paragraphs, heading 1–3, bulleted / numbered / to-do lists, toggle lists, quotes, dividers, callouts (with emoji picker), code blocks (syntax highlighted via lowlight), tables (resizable; header row/column; insert/delete rows and columns; select row, column or table; merge/split cells), images (upload, paste or drop — then resize, crop, restyle, caption, replace and delete), video embeds (YouTube, Vimeo, Loom, Dailymotion, Wistia, Twitch and direct MP4/WebM files with paste-to-embed, aspect ratios, sizing, start time, autoplay and privacy mode), iframe embeds (any http(s) URL or `<iframe>` snippet — maps, forms, Figma, CodePen, dashboards and widgets — with live preview, width/height resizing, alignment, captions and fullscreen control), charts (bar, line, area, pie, donut with an editable data table, palettes, heights, legend/grid/value/stacked options and hover tooltips), nested page links.
- Inline: bold, italic, underline, strikethrough, inline code, links, plus text and highlight colors with theme-aware presets, a custom color picker and recent colors.
- Markdown input rules (e.g. `# `, `- `, `1. `, `> `, `` ` ``, `---`) from StarterKit + Typography.

**Notion UI**

- Hover block handle (＋ / ⋮⋮) with drag-to-move, a live drop indicator, and a block menu: Duplicate, Delete, Turn into, Copy text, Move up/down.
- `/` slash menu with groups, fuzzy search, keyboard navigation and a “+” insert mode.
- Selection bubble toolbar: turn-into block menu, bold/italic/underline/strike/code, text + highlight color palettes (9 theme-aware presets, custom color, recent colors), inline link editor and clear formatting.
- Custom Notion-style scrollbars (WebKit + Firefox), Inter/system font stack, exact surface colors, subtle hover states and menu shadows.
- Sidebar with workspace switcher, search, nested page tree, inline rename, per-page menu, theme menu and reset.
- Top bar with breadcrumbs, word count, share-link copy, page menu, theme toggle.
- Command palette (`⌘/Ctrl + K`), page creation, duplicate, JSON export and delete.
- Light, dark and "use system" themes, persisted.

**Responsive**

- Desktop sidebar docks; below 900px it becomes an overlay drawer with a scrim and hamburger toggle.
- Touch devices hide the hover handle, keep icon/action affordances visible, use ≥44px targets and stack the slash menu to the viewport.
- Tables scroll horizontally, images and code never overflow, no horizontal page scroll at 320px.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `/` | Open the block menu |
| `⌘/Ctrl + K` | Search pages |
| `⌘/Ctrl + B / I / U` | Bold / italic / underline |
| `⌘/Ctrl + Shift + M` | Toggle light & dark |
| `⌘/Ctrl + Shift + S` | Strikethrough |
| `Enter` (in title) | Jump into the page body |
| `Tab` / `Shift + Tab` | Indent / outdent list items |
| `↑` `↓` `Enter` `Esc` | Navigate any menu |

## Project layout

```
src/
  App.tsx                  app shell, routing by URL hash, global shortcuts
  components/
    PageEditor.tsx         title, icon, editor instance, providers
    Sidebar.tsx            page tree, workspace & theme menus
    TopBar.tsx             breadcrumbs, share, page menu
    BlockHandle.tsx        hover handle, insert-below, block movement
    BlockMenu.tsx          per-block actions + "Turn into"
    SlashMenu.tsx          "/" command palette (portal)
    BubbleToolbar.tsx      selection toolbar, link + color popovers
    CommandPalette.tsx     ⌘K page search
    Menu.tsx               reusable popover menu
    EmojiPicker.tsx        icon picker
    Icons.tsx              inline SVG icon set
    nodes/                 React NodeViews (callout, toggle, page link)
  editor/
    createExtensions.ts    Tiptap extension setup
    nodes/                 custom nodes
    slash/                 slash items, filter, store, extension
  store/
    usePages.ts            workspace state + persistence + tree helpers
    seed.ts                demo content
  styles/                  tokens, global, editor, UI
```

## Notes

- The editor uses the CDN build of **Inter** (`rsms.me`) with a full system-font fallback, so it stays close to Notion on every platform and still renders offline.
- Clearing site data (or “Reset demo” in the sidebar) restores the seeded workspace.
- Images are read locally with the OS file picker, downscaled and compressed (WebP when the browser supports it) before being embedded as data URLs, so they survive refreshes without a server. If the browser storage fills up, the sidebar shows a “Storage full” warning.
- Selecting an image reveals a floating toolbar (S/M/L/Full presets, alignment, crop, frame styles, replace, delete) plus corner handles for free resizing. Captions are editable directly under the image.
- Placing the caret in a table shows a table toolbar with Row and Column menus, merge/split, header toggles, select row/column/table and delete table. Drag a column border to resize it.
- `/video` opens an embed dialog with a live preview and provider detection. Paste a video link (or an iframe embed code) on an empty line to embed it instantly; recognized links become real players, with a floating toolbar for sizing, alignment, aspect ratio, start time, autoplay, privacy mode, opening the original and deleting.
- `/iframe` opens an embed dialog that accepts a URL or a full `<iframe>` snippet, previews it live, and inserts a resizable block. Only http(s) sources are allowed; the block toolbar changes width, alignment and height, reloads, opens the original page, edits settings or deletes the embed. The settings dialog has a browser-style preview bar (reload / copy / open), a height slider and a fullscreen toggle. Same-origin embeds get a custom draggable Notion-style scrollbar overlay; cross-origin embeds control their own scrollbars and cannot be styled by the parent page.
- `/chart` inserts a real, dependency-free SVG chart. Its settings dialog has a live preview, chart type and palette chips, height and display toggles, and a spreadsheet-like data table (add/remove rows, add/remove series). The block toolbar switches type and palette, toggles presentation options and edits the data; bars, points and slices have hover tooltips.
- Drag-and-drop uses Tiptap's native drag handle + ProseMirror drop cursor; the block menu and "Move up/down" provide keyboard-friendly alternatives.

## License

This project is licensed under the **GNU General Public License v2.0**. See [LICENSE](LICENSE) for the full text.
