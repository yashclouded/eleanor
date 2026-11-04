import { startTestApi } from './runtime.ts'

export default async function setup() {
  if (process.env.API_TEST_URL) return
  const runtime = await startTestApi('http://localhost:5173')
  process.env.API_TEST_URL = runtime.url
  return async () => {
    delete process.env.API_TEST_URL
    await runtime.close()
  }
}
