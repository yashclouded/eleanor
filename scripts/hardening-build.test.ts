import { beforeAll, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { securityHeaders } from './security-headers.ts'

let main: string
let assets: string[]
beforeAll(async () => {
  await promisify(execFile)(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test-project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' },
  })
  const html = await readFile('dist/index.html', 'utf8')
  const script = html.match(/<script[^>]+src="([^"]+\.js)"/)
  if (!script) throw new Error('Production entry script missing')
  main = await readFile(join('dist', script[1]), 'utf8')
  assets = await readdir('dist/assets')
}, 30000)

it('keeps the main chunk below 250 KB gzip and loads CodeMirror and Admin separately', () => {
  expect(gzipSync(main).byteLength).toBeLessThan(250000)
  expect(assets.some((name) => /^CodeEditor-.*\.js$/.test(name))).toBe(true)
  expect(assets.some((name) => /^Admin-.*\.js$/.test(name))).toBe(true)
})

it('ships exact-origin CSP, denied browser permissions, and an SPA fallback', async () => {
  const headers = await readFile('dist/_headers', 'utf8')
  expect(headers).toContain("default-src 'self'")
  expect(headers).toContain("script-src 'self'")
  expect(headers).toContain("connect-src 'self' https://test-project.supabase.co;")
  expect(headers).toContain("img-src 'self' data:")
  expect(headers).toContain("frame-ancestors 'none'")
  expect(headers).toContain('Referrer-Policy: no-referrer')
  expect(headers).toContain('camera=()')
  expect(headers).toContain('clipboard-read=()')
  expect(headers).toContain('clipboard-write=(self)')
  expect(headers).toContain('web-share=(self)')
  expect(headers).not.toContain('unsafe-eval')
  expect(await readFile('dist/_redirects', 'utf8')).toBe('/* /index.html 200\n')
})

it('rejects insecure production URLs and URL credentials before emitting headers', () => {
  for (const url of ['http://external.example', 'javascript:alert(1)', 'https://user:secret@example.com']) {
    expect(() => securityHeaders(url)).toThrow()
  }
  expect(securityHeaders('http://127.0.0.1:54321')).toContain("connect-src 'self' http://127.0.0.1:54321;")
})

it('does not ship service credentials or Judge0 endpoint credentials in any client chunk', async () => {
  for (const name of assets.filter((file) => file.endsWith('.js'))) {
    const code = await readFile(join('dist/assets', name), 'utf8')
    expect(/sb_secret_[A-Za-z0-9_-]+/.test(code), `Secret key in ${name}`).toBe(false)
    for (const key of ['JUDGE0_URL', 'JUDGE0_AUTH_TOKEN']) {
      const value = process.env[key]
      if (value) expect(code.includes(value), `${key} in ${name}`).toBe(false)
    }
  }
})
