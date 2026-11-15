import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from /<repository>/. The deploy
  // workflow sets VITE_BASE; local development stays at /.
  base: process.env.VITE_BASE ?? '/',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        preview: fileURLToPath(
          new URL('./insights-preview/index.html', import.meta.url),
        ),
      },
    },
  },
  root: rootDir,
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/store/dataset.test.js',
      'src/store/dataset-records.test.js',
      'src/store/selection.test.js',
    ],
  },
})
