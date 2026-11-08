# Changelog

## 2.0.0

- Scoped package as `@cyber24bd/notion-like-editor` for public publication.
- Added `core`, `standard`, `full` preset entries with matching CSS.
- Added external-Tiptap variants for all presets.
- Preserved the previous full editor as the default `notion-like-editor` behavior.

## 1.1.0

- Added multi-block selection, group actions and range dragging.
- Added versioned documents and v0 -> v1 migrations.
- Added optimistic image preparation/upload, cancellation, retry, a 3-job queue and timeout hardening.
- Scoped library CSS to `.notion-editor-root`; removed bundled KaTeX fonts.
- Added a standalone external-Tiptap entry at `notion-like-editor/external`.
- Added feature presets (`CORE_FEATURES`, `STANDARD_FEATURES`, `FULL_FEATURES`) and custom `extensions`.
- Added Vitest, Playwright, a controlled harness and GitHub Actions CI.
