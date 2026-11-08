import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error — plain JS PostCSS plugin
import scopeCss from './scripts/scope-css.mjs'
import presetExtensions from './scripts/preset-extensions.mjs'

const preset = process.env.PRESET
const external = process.env.EXTERNAL === '1'

if (preset !== 'core' && preset !== 'standard') {
  throw new Error('Set PRESET to core or standard')
}

const presets = {
  core: {
    entry: external ? 'src/lib/coreExternal.ts' : 'src/lib/core.ts',
    extensions: 'src/editor/presets/coreExtensions.ts',
    fileName: 'core.js',
    cssFileName: 'core',
    outDir: external ? 'dist-lib/core-external' : 'dist-lib',
  },
  standard: {
    entry: external ? 'src/lib/standardExternal.ts' : 'src/lib/standard.ts',
    extensions: 'src/editor/presets/standardExtensions.ts',
    fileName: 'standard.js',
    cssFileName: 'standard',
    outDir: external ? 'dist-lib/standard-external' : 'dist-lib',
  },
} as const

const selected = presets[preset]

export default defineConfig({
  plugins: [presetExtensions(selected.extensions), react()],
  resolve: {
    dedupe: [
      '@tiptap/pm',
      '@tiptap/extension-node-range',
      'prosemirror-tables',
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
      'prosemirror-transform',
    ],
    alias: [
      {
        find: 'use-sync-external-store/shim/with-selector.js',
        replacement: '/src/lib/shims/useSyncExternalStoreWithSelector.ts',
      },
      {
        find: 'use-sync-external-store/shim/with-selector',
        replacement: '/src/lib/shims/useSyncExternalStoreWithSelector.ts',
      },
      {
        find: 'use-sync-external-store/shim/index.js',
        replacement: '/src/lib/shims/useSyncExternalStore.ts',
      },
      {
        find: 'use-sync-external-store/shim',
        replacement: '/src/lib/shims/useSyncExternalStore.ts',
      },
      { find: '@', replacement: '/src' },
    ],
  },
  css: external
    ? undefined
    : {
        postcss: {
          plugins: [scopeCss('.notion-editor-root')],
        },
      },
  build: {
    outDir: selected.outDir,
    emptyOutDir: external,
    lib: {
      entry: selected.entry,
      formats: ['es'],
      fileName: () => (external ? 'index.js' : selected.fileName),
      ...(external ? {} : { cssFileName: selected.cssFileName }),
    },
    rolldownOptions: {
      external: [
        /^react$/,
        /^react-dom$/,
        /^react\/jsx-runtime$/,
        /^react-dom\/client$/,
        ...(external ? [/^@tiptap\//, /^prosemirror-/] : []),
      ],
    },
  },
})
