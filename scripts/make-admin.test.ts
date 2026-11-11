import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ listUsers: vi.fn(), updateUserById: vi.fn(), createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
const argv = process.argv

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  process.argv = ['node', 'scripts/make-admin.ts', 'owner@example.com']
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  vi.stubEnv('SUPABASE_SECRET_KEY', '')
  mocks.createClient.mockReturnValue({ auth: { admin: mocks } })
  mocks.updateUserById.mockResolvedValue({ data: { user: { id: 'owner', email: 'owner@example.com' } }, error: null })
})

afterEach(() => {
  process.argv = argv
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('make-admin command', () => {
  it('finds an owner after the first page and preserves existing app metadata', async () => {
    mocks.listUsers.mockResolvedValueOnce({ data: { users: Array.from({ length: 200 }, () => ({ id: 'other', email: 'other@example.com' })) }, error: null })
    mocks.listUsers.mockResolvedValueOnce({ data: { users: [{ id: 'owner', email: 'OWNER@example.com', app_metadata: { provider: 'email' } }] }, error: null })
    await import('./make-admin.ts')
    await vi.waitFor(() => expect(mocks.updateUserById).toHaveBeenCalledWith('owner', { app_metadata: { provider: 'email', role: 'admin' } }))
    expect(mocks.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 })
  })

  it('requires an explicit service credential for a remote origin', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    await import('./make-admin.ts')
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(1))
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
