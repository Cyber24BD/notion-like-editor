# Testing

The repo has two layers of automated checks:

## Unit tests (Vitest)

```bash
npm run test:unit
```

Covers pure logic such as video URL parsing, the upload serialization boundary
that keeps preview blob URLs out of saved content, server rendering and safe
KaTeX output.

## Browser tests (Playwright)

Install Chromium once:

```bash
npx playwright install chromium
```

Then:

```bash
npm run test:e2e
```

Playwright starts Vite on port `5199` and uses:

- `/` — the demo app (navigation and chart smoke tests)
- `/harness.html` — a small controlled host for the public library API
  (controlled `value`, refs, upload adapter, cancellation, retry, queue, local
  fallback and undo/redo)
- `/preset-harness.html?preset=…` — direct smoke tests for `core`, `standard`,
  `core-external` and `standard-external` entries
- Page cover, find/replace, shortcuts, mobile toolbars and sidebar drag/reorder
  are covered in `tests/e2e/p2.spec.ts`
- All 23 Mermaid templates, invalid syntax cleanup and dark Mermaid surfaces are
  covered in `tests/e2e/mermaid.spec.ts`
- Sandboxed Custom HTML editing, isolation, advanced sandbox controls, script errors,
  focus trapping, download warnings and auto-sized blocks are covered in
  `tests/e2e/custom-html.spec.ts`

Useful commands:

```bash
npm run test          # unit + e2e
npm run test:e2e:ui   # interactive Playwright mode
```

CI runs typecheck, unit tests, browser tests, the app build and the library
build on every push to `main` and on pull requests (`.github/workflows/ci.yml`).
