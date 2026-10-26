import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/createUser': 'http://localhost:8000',
      '/getUser': 'http://localhost:8000',
      '/logout': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/exams': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
