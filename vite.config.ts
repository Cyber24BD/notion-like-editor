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
    // Mermaid is large and only needed when a diagram is opened. Keep it out
    // of the initial modulepreload list so the editor starts fast.
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !dep.includes('mermaid-vendor')),
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'katex-vendor',
              test: /node_modules[\/]katex[\/]/,
              priority: 50,
            },
            {
              name: 'mermaid-vendor',
              test: /node_modules[\/](mermaid|@mermaid-js|@braintree|@iconify|@upsetjs|cytoscape|cytoscape-cose-bilkent|cytoscape-fcose|d3|d3-sankey|dagre-d3-es|dayjs|dompurify|es-toolkit|fastdom|khroma|marked|roughjs|stylis|ts-dedent|uuid)[\/]/,
              priority: 40,
            },
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
