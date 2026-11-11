/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { hostingHeaders } from './scripts/hosting.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'static-privacy-headers',
    apply: 'build',
    generateBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      // CodeMirror injects style sheets; the app also uses inline React styles.
      this.emitFile({ type: 'asset', fileName: '_headers', source: hostingHeaders(process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL) })
    },
  }],
  test: {
    include: [
      'supabase/functions/_shared/**/*.test.ts',
      'scripts/**/*.test.ts',
      'src/**/*.test.{ts,tsx}',
    ],
    exclude: ['tests/api/**', 'tests/e2e/**', 'node_modules/**'],
  },
}))
