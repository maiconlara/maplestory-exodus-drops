import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works under any path (GitHub Pages project sub-path,
  // Vercel root, or opened directly). No leading-slash absolute asset URLs.
  base: './',
  plugins: [react()],
})
