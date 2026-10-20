import postgres from 'npm:postgres@3.4.5'

const dbUrl =
  Deno.env.get('SUPABASE_DB_URL') ??
  Deno.env.get('DATABASE_URL') ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

export const sql: postgres.Sql = postgres(dbUrl, { prepare: false, max: 3 })
