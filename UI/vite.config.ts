import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/speaking': 'http://127.0.0.1:8000',
      '/practice': 'http://127.0.0.1:8000',
      '/recordings': 'http://127.0.0.1:8000',
      '/comparisons': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
