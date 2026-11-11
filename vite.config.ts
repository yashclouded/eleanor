/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { securityHeaders } from './scripts/security-headers.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  resolve: { dedupe: ['@codemirror/state', '@codemirror/view'] },
  plugins: [react(), {
    name: 'static-host-security',
    generateBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      this.emitFile({ type: 'asset', fileName: '_headers', source: securityHeaders(env.VITE_SUPABASE_URL) })
      this.emitFile({ type: 'asset', fileName: '_redirects', source: '/* /index.html 200\n' })
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
