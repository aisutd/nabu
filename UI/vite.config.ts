import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backend = env.NABU_BACKEND_PROXY || 'http://127.0.0.1:8000'
  const paths = ['/speaking', '/practice', '/recordings', '/comparisons', '/models', '/media', '/ocr', '/asl-api']
  const proxy = Object.fromEntries(paths.map((path) => [path, backend]))
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
