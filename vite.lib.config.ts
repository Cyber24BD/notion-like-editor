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
    alias: [
      // Replace the CommonJS use-sync-external-store shim with ESM. This keeps
      // React external without leaving require("react") in the bundle.
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
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    lib: {
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'notion-editor',
    },
    rolldownOptions: {
      // The editor stack is a normal dependency of the package, not bundled.
      // This keeps React/ProseMirror single-instance in the host app and avoids
      // CJS interop helpers for external React.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
})
