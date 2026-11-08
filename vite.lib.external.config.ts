import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * For hosts that already depend on Tiptap. Keep the whole Tiptap/ProseMirror
 * stack external so there is exactly one schema and one Selection identity.
 */
export default defineConfig({
  plugins: [react()],
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
    alias: [{ find: '@', replacement: '/src' }],
  },
  build: {
    outDir: 'dist-lib/external',
    emptyOutDir: true,
    lib: {
      entry: 'src/lib/external.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      external: [
        /^react$/,
        /^react-dom$/,
        /^react\/jsx-runtime$/,
        /^react-dom\/client$/,
        /^@tiptap\//,
        /^prosemirror-/,
      ],
    },
  },
})
