import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from /<repository>/. The deploy
  // workflow sets VITE_BASE; local development stays at /.
  base: process.env.VITE_BASE ?? '/',
})
