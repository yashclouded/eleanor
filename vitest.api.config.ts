/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'

Object.assign(process.env, loadEnv('test', process.cwd(), ''))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^npm:(.*)@[^/]+$/, replacement: '$1' },
      { find: /^npm:(.*)@[^/]+\/(.*)$/, replacement: '$1/$2' },
    ],
  },
  test: {
    include: ['tests/api/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
