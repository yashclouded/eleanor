import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY } from './helpers.ts'

export async function startTestApi(appOrigin: string, judge0Url = '') {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  await mkdir(join(root, 'test-results'), { recursive: true })
  const directory = await mkdtemp(join(root, 'test-results/api-'))
  const entry = join(directory, 'server.ts')
  const api = new URL('../../supabase/functions/api/index.ts', import.meta.url).href
  await writeFile(entry, `const serve = Deno.serve;
Deno.serve = handler => serve({ hostname: '127.0.0.1', port: 0,
  onListen({port}) { console.log('API_READY=' + port) } }, handler);
await import(${JSON.stringify(api)});\n`)
  const child = spawn('deno', ['run', '--allow-env', '--allow-net', '--allow-read', '--node-modules-dir=none', '--frozen', entry], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_DB_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      APP_ORIGIN: appOrigin, ELEANOR_TEST_CLOCK: '1', JUDGE0_URL: judge0Url, JUDGE0_AUTH_TOKEN: '', JUDGE0_AUTH_HEADER: '',
    },
  })
  child.stderr.resume()
  async function close() {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((done) => child.once('exit', () => done()))
      child.kill('SIGTERM'); await exited
    }
    await rm(directory, { recursive: true, force: true })
  }
  try {
    const port = await new Promise<string>((done, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test API startup timed out')), 20000)
      child.once('error', (error) => { clearTimeout(timeout); reject(error) })
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Test API exited with code ${code}`)) })
      let output = ''
      child.stdout.on('data', (chunk: Buffer) => {
        output = (output + chunk.toString()).slice(-4096)
        const match = output.match(/API_READY=(\d+)/)
        if (match) { clearTimeout(timeout); done(match[1]) }
      })
    })
    return { url: `http://127.0.0.1:${port}/functions/v1/api`, close }
  } catch (error) { await close(); throw error }
}
