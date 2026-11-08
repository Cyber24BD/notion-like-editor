# Notion-like editor

A Notion-style block editor built with **React 19 + TypeScript + Tiptap 3 + Vite**, recreated to feel like the real thing: Notion's typography, colors, scrollbar, block hover handles, slash menu, inline toolbar, nested pages, dark mode and responsive behavior.

Everything is local — pages are stored in `localStorage`, there is no backend or account.

Repository: [github.com/Cyber24BD/notion-like-editor](https://github.com/Cyber24BD/notion-like-editor)

[![CI](https://github.com/Cyber24BD/notion-like-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/Cyber24BD/notion-like-editor/actions/workflows/ci.yml)

## Run the demo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## Test

```bash
npm run test:unit              # Vitest
npx playwright install chromium # first time only
npm run test:e2e               # Playwright
npm run test                   # both
```

Playwright uses the demo at `/` and a controlled library harness at `/harness.html`. See [TESTING.md](./TESTING.md) for details. CI runs typecheck, unit tests, browser tests, the app build and the library build.

## Use it in another React project

The editor is also exposed as an embeddable component. Build the library and pack it locally:

```bash
npm run build:lib
npm pack
# in your other app:
npm install ../notion-like-editor-1.0.0.tgz
```

```tsx
import { useRef, useState } from 'react'
import {
  NotionEditor,
  type JSONContent,
  type NotionEditorHandle,
} from 'notion-like-editor'
import 'notion-like-editor/style.css'

export function MyPage() {
  const [title, setTitle] = useState('My document')
  const [content, setContent] = useState<JSONContent | null>(null)
  const editor = useRef<NotionEditorHandle>(null)

  return (
    <div style={{ height: '80vh' }}>
      <NotionEditor
        ref={editor}
        documentId="doc-1"
        title={title}
        icon="📝"
        value={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
        uploadImage={async (file) => {
          const form = new FormData()
          form.append('file', file)
          const response = await fetch('/api/images', {
            method: 'POST',
            body: form,
          })
          const { url } = await response.json()
          return url
        }}
        onImageUploadError={(error) => console.error(error)}
      />
    </div>
  )
}
```

- **React 18 or 19.** React is a peer dependency; the editor stack ships with the package.
- **Size the parent.** The editor fills its container and scrolls internally, so give the wrapper a height.
- **Controlled content:** `value` + `onContentChange` keeps the document in sync. External value changes (server loads, undo from your app, etc.) are applied **without remounting**. `content` is still available as initial-only content. Keep `value` stable while typing; don't feed back a debounced stale snapshot.
- **`documentId` identifies a document.** Changing it remounts the editor. Use `value` rather than a remount when the same document reloads.
- **Imperative API:** `ref` exposes `getJSON()`, `setContent(content, { emitUpdate })`, `focus('start' | 'end' | 'all' | number)`, `getEditor()` and `isEmpty()`. `setContent` emits `onContentChange` by default; pass `{ emitUpdate: false }` for a silent restore. `onReady(editor)` fires when the editor is ready.
- **Image uploads:** with `uploadImage`, images are uploaded and only the returned URL is stored. Uploads are optimistic: a preview appears immediately, with progress, cancel, retry and inline errors. Up to **3 images** prepare/upload at once; the rest wait in a queue. The editor passes an optimized file: large raster images arrive as **WebP under 200 KB**; images already under 200 KB, SVGs and GIFs arrive as the original file. `context.originalFile` always contains the untouched upload. Use `context.signal` for cancellation and `context.onProgress(0–100)` to report progress. Return a URL or `{ src, width, height, alt }`; return `null` to cancel. Handle failures with `onImageUploadError`.
- **Uploading images are never persisted.** Preview blob URLs and progress attrs live only in the live editor. `getJSON()` and `onContentChange` return the saved shape, so it is safe to save while an upload is in flight. Replacing an image keeps the old URL persisted until the new upload succeeds.
- **Without an uploader:** images use the same optimistic placeholder and queue, compressed locally (same 200 KB WebP rule) and embedded as data URLs. Videos and charts store metadata/settings rather than media bytes.
- **Optional callbacks:** `onIconChange`, `onNavigatePage` / `onCreateSubPage` for page links.
- **Presentation props:** `editable`, `showHeader`, `showBubbleToolbar`, `showTableToolbar`, `className`.
- **Theming:** the stylesheet includes Notion design tokens, base typography and scrollbars. Set `data-theme="dark"` on `<html>` for dark mode, or override the CSS variables.
- **Types** are included at `dist-lib/lib/index.d.ts`; the package exports `./style.css`.

The demo app (`src/App.tsx`, `src/store`) is separate from the library entry and is not required by consumers.

## What's included

**Blocks**

- Paragraphs, heading 1–3, bulleted / numbered / to-do lists, toggle lists, quotes, dividers, callouts (with emoji picker), code blocks (syntax highlighted via lowlight with auto-detection, a language picker, copy, line numbers, word wrap, fixed-height scrolling, height presets and download), tables (resizable; header row/column; insert/delete rows and columns; select row, column or table; merge/split cells), images (upload, paste or drop — then resize, crop, restyle, caption, replace and delete, plus a fullscreen lightbox with zoom, pan, gallery navigation, copy, download, open original and fullscreen mode), video embeds (YouTube, Vimeo, Loom, Dailymotion, Wistia, Twitch and direct MP4/WebM files with paste-to-embed, aspect ratios, sizing, start time, autoplay and privacy mode), audio embeds (Spotify, SoundCloud, Apple Podcasts, Apple Music, Mixcloud, Deezer, Tidal and direct MP3/WAV/OGG/M4A/AAC/FLAC/OPUS/WebM files with paste-to-embed, provider detection, sizing, height presets and captions), iframe embeds (any http(s) URL or `<iframe>` snippet — maps, forms, Figma, CodePen, dashboards and widgets — with live preview, width/height resizing, alignment, captions and fullscreen control), bookmark/link preview cards (favicon, title, description, domain and preview image with a fallback card when metadata is unavailable), table of contents blocks (auto-generated from H1–H3 with click-to-jump navigation), inline and block math equations (KaTeX with live preview, symbol palette, templates, copy LaTeX and click-to-edit), Mermaid diagrams (flowcharts, sequence diagrams, Gantt charts, class/state/ER diagrams, mindmaps, timelines, kanban, pie, journey, git graphs and more with live preview, themes, templates, SVG download, Mermaid Live export and fullscreen preview), charts (bar, line, area, pie, donut with an editable data table, palettes, heights, legend/grid/value/stacked options and hover tooltips), nested page links.
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
    nodes/                 React NodeViews (callout, toggle, page link, media, embeds, charts, bookmarks)
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
- Images are read locally with the OS file picker. Images already **200 KB or smaller are kept exactly as uploaded** (original format and bytes). Larger raster images are converted to WebP and progressively downscaled until the encoded image is under 200 KB. SVG stays vector and GIFs keep their animation, so both are left untouched. In the demo the result is embedded as a data URL; when the library is given an `uploadImage` adapter, only the returned URL is stored. If browser storage fills up, the sidebar shows a “Storage full” warning.
- Clicking an image opens a fullscreen lightbox. It supports wheel/pinch zoom, drag-to-pan, double-click zoom, fit/actual-size controls, keyboard shortcuts (`+`/`-`/`0`/arrows/`F`/`Esc`), previous/next navigation across all images on the page, copy image, download, open original, browser fullscreen, image dimensions and captions. The image toolbar also has a Preview button.
- Selecting an image reveals a floating toolbar (S/M/L/Full presets, alignment, crop, frame styles, replace, delete) plus corner handles for free resizing. Captions are editable directly under the image.
- Placing the caret in a table shows a table toolbar with Row and Column menus, merge/split, header toggles, select row/column/table and delete table. Drag a column border to resize it.
- `/video` opens an embed dialog with a live preview and provider detection. Paste a video link (or an iframe embed code) on an empty line to embed it instantly; recognized links become real players, with a floating toolbar for sizing, alignment, aspect ratio, start time, autoplay, privacy mode, opening the original and deleting.
- `/audio` opens an audio embed dialog. It accepts Spotify, SoundCloud, Apple Podcasts, Apple Music, Mixcloud, Deezer and Tidal links or embed codes, plus direct audio files (MP3, WAV, OGG, OGA, M4A, AAC, FLAC, OPUS, WebA, WebM, M3U8, AIFF, CAF). Direct files use a native player; providers use their official embeds. The block toolbar changes width/alignment/height, reloads provider embeds, opens the original, edits settings or deletes the block.
- `/iframe` opens an embed dialog that accepts a URL or a full `<iframe>` snippet, previews it live, and inserts a resizable block. Only http(s) sources are allowed; the block toolbar changes width, alignment and height, reloads, opens the original page, edits settings or deletes the embed. The settings dialog has a browser-style preview bar (reload / copy / open), a height slider and a fullscreen toggle. Same-origin embeds get a custom draggable Notion-style scrollbar overlay; cross-origin embeds control their own scrollbars and cannot be styled by the parent page.
- `/mermaid` opens a Mermaid diagram dialog. It supports live preview, 20+ templates (flowchart, sequence, Gantt, class, state, ER, pie, journey, git graph, mindmap, timeline, quadrant, requirement, C4, Sankey, XY chart, block, kanban, radar, treemap, ZenUML, architecture and packet), theme and height options, copy code, SVG download, Mermaid Live export and a fullscreen zoom/pan preview. Diagrams render locally with Mermaid and the heavy Mermaid bundle is lazy-loaded only when needed.
- `/math` opens a KaTeX equation dialog. It supports inline and block modes, live preview, error messages, a symbol palette, templates (fractions, roots, sums, integrals, matrices, cases, aligned equations, derivatives, vectors and more), copy LaTeX and ⌘/Ctrl + Enter to insert. Inline equations sit inside text; block equations get their own centered row. Click any equation to edit it; block equations also have a hover toolbar for edit, copy LaTeX and delete.
- `/toc` inserts a table of contents block. It automatically lists every H1–H3 heading on the page, updates as headings are added, renamed, moved or removed, and jumps to the heading when clicked. It shows an empty state when the page has no headings yet.
- Code blocks have a header with a language picker (auto-detect by default), line count, copy, line-number toggle, word-wrap toggle, height presets (240/360/480/640/auto) and a download button. Tab inserts two spaces inside code blocks. Line numbers are hidden while word wrap is on so the gutter stays aligned.
- `/bookmark` opens a link-preview dialog. Paste a URL to get a card with favicon, title, description, domain and preview image. Metadata is fetched through Microlink's public API; if the site blocks it or the service is unavailable, the card falls back to the domain, URL and favicon. The block toolbar changes width/alignment, refreshes metadata, copies the link, opens it, edits settings or deletes the card.
- `/chart` inserts a real, dependency-free SVG chart. Its settings dialog has a live preview, chart type and palette chips, height and display toggles, and a spreadsheet-like data table (add/remove rows, add/remove series). The block toolbar switches type and palette, toggles presentation options and edits the data; bars, points and slices have hover tooltips.
- Drag-and-drop uses Tiptap's native drag handle + ProseMirror drop cursor; the block menu and "Move up/down" provide keyboard-friendly alternatives.

## License

This project is licensed under the **GNU General Public License v2.0**. See [LICENSE](LICENSE) for the full text.
