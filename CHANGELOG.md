# Changelog

## 2.0.0

- Scoped package as `@cyber24bd/notion-like-editor` for public publication.
- Added `core`, `standard`, `full` preset entries with matching CSS.
- Added external-Tiptap variants for all presets.
- Preserved the previous full editor as the default `notion-like-editor` behavior.
- Moved the Tiptap/ProseMirror stack to peer dependencies so external-entry hosts share one schema and selection identity.
- Set `immediatelyRender: false` and added an SSR smoke test for Next.js/Remix hosts.
- Added browser coverage for core, standard, core/external and standard/external presets.
- Deduplicated identical preset/external lazy chunks before packing (tarball ~2.5 MB instead of ~5.6 MB).
- Upgraded editor KaTeX to 0.19.1; the remaining low advisory is Mermaid's internal KaTeX copy and is documented.
- Added page covers with upload/change/remove and vertical focal-point dragging.
- Added drag-to-reorder and drag-to-nest pages in the sidebar with cycle protection.
- Added keyboard/touch page-menu actions for Move up/down, Indent, Move out and Move to page.
- Added focus traps to modal dialogs and keyboard-accessible page-cover positioning.
- Added in-page find/replace with match highlighting and replace-all.
- Added case-sensitive, whole-word, page-title and regex search modes to find/replace.
- Added a complete keyboard shortcuts dialog and shortcut documentation.
- Polished image/table toolbars on narrow screens with a fixed bottom action bar.
- Added a sandboxed Custom HTML block with HTML/CSS/JS tabs, live preview, auto-height, full-screen preview and standalone download.
- Added per-block sandbox controls for scripts, forms, network and popups, a focus trap, copy confirmation and a standalone-download warning.
- Fixed Mermaid layout under reduced-motion preferences, responsive SVG sizing, edge-label clipping and dark surfaces.
- Fixed the Radar template, added the optional ZenUML plugin, suppressed/cleaned Mermaid error SVGs, and added a complete Mermaid template test suite.

## 1.1.0

- Added multi-block selection, group actions and range dragging.
- Added versioned documents and v0 -> v1 migrations.
- Added optimistic image preparation/upload, cancellation, retry, a 3-job queue and timeout hardening.
- Scoped library CSS to `.notion-editor-root`; removed bundled KaTeX fonts.
- Added a standalone external-Tiptap entry at `notion-like-editor/external`.
- Added feature presets (`CORE_FEATURES`, `STANDARD_FEATURES`, `FULL_FEATURES`) and custom `extensions`.
- Added Vitest, Playwright, a controlled harness and GitHub Actions CI.
