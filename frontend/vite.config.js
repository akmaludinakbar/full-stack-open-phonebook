import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': process.env.VITE_BACKEND_URL || 'http://localhost:3001' } },
  test: { environment: 'jsdom' },
})
