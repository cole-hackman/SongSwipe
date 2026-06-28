import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  test: {
    root: __dirname,
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['test/e2e/**', 'test/e2e.spec.ts'],
    passWithNoTests: true,
    testTimeout: 1000 * 29,
  },
})
