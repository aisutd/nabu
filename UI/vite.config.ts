import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxy = {
    '/speaking': 'http://127.0.0.1:8000',
    '/practice': 'http://127.0.0.1:8000',
    '/recordings': 'http://127.0.0.1:8000',
    '/comparisons': 'http://127.0.0.1:8000',
    '/media': 'http://127.0.0.1:8000',
    '/ocr': env.NABU_HANDWRITING_PROXY || 'http://127.0.0.1:8001',
    '/asl-api': {
      target: env.NABU_ASL_PROXY || 'http://127.0.0.1:8002',
      rewrite: (path: string) => path.replace(/^\/asl-api(?=\/|$)/, ''),
    },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
