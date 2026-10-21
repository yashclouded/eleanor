/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      'supabase/functions/_shared/**/*.test.ts',
      'scripts/**/*.test.ts',
      'src/**/*.test.{ts,tsx}',
    ],
    exclude: ['tests/api/**', 'tests/e2e/**', 'node_modules/**'],
  },
})
