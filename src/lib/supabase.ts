import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!publishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable')
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    detectSessionInUrl: true,
  },
})
