import { createClient } from '@supabase/supabase-js'

async function makeAdmin(email: string) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Failed to list users:', error.message)
    process.exit(1)
  }

  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.error(`User with email "${email}" not found.`)
    process.exit(1)
  }

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: 'admin',
    },
  })

  if (updateError) {
    console.error('Failed to update user role:', updateError.message)
    process.exit(1)
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
