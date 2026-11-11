import { createClient, type User } from '@supabase/supabase-js'

async function makeAdmin(email: string) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(supabaseUrl).hostname)
      ? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz' : '')
  if (!serviceKey) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for a remote project')

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let user: User | undefined
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Failed to list users: ${error.message}`)
    user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
    if (user || data.users.length < 200) break
  }
  if (!user) {
    throw new Error(`User with email "${email}" not found.`)
  }

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: 'admin',
    },
  })

  if (updateError) {
    throw new Error(`Failed to update user role: ${updateError.message}`)
  }

  console.log(`Success: user ${updated.user.email} (${updated.user.id}) has been granted admin role.`)
  console.log('WARNING: A fresh sign-in is needed for the admin role to take effect in JWT claims.')
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: tsx scripts/make-admin.ts <email>')
  process.exit(1)
}

makeAdmin(email).catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
