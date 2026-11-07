import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      '@tiptap/pm',
      'prosemirror-tables',
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
      'prosemirror-transform',
    ],
    alias: {
      '@': '/src',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\/](react|react-dom|scheduler)[\/]/,
              priority: 30,
            },
            {
              // Keep the whole editor stack in one cacheable chunk. Splitting
              // ProseMirror/Tiptap modules risks duplicate class identities.
              name: 'editor-vendor',
              test: /node_modules[\/](@tiptap|prosemirror-|orderedmap|rope-sequence|w3c-keyname|linkifyjs|@floating-ui)[\/]/,
              priority: 20,
            },
            {
              name: 'highlight-vendor',
              test: /node_modules[\/](lowlight|highlight\.js)[\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules[\/]/,
              priority: 1,
              minSize: 20000,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
