import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase.ts'

export interface Profile {
  id: string
  handle: string
  age_confirmed_at: string
  terms_accepted_at: string
  pledge_accepted_at: string
  leaderboard_visible: boolean
  intensity: 'steady' | 'balanced' | 'stretch'
  set_size: number
  rating_reveal: 'immediate' | 'end_of_set'
  reduced_motion: boolean
  theme: 'system' | 'light' | 'dark'
  weekly_goal: number
  tracks: string[]
  created_at: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        setProfile(data as Profile)
        // Set root theme / reduced motion attributes if profile exists
        if (data.theme) {
          document.documentElement.setAttribute('data-theme', data.theme)
        }
        if (data.reduced_motion) {
          document.documentElement.setAttribute('data-reduced-motion', 'true')
        }
      } else {
        setProfile(null)
      }
    } catch {
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) {
      await fetchProfile(session.user.id)
    }
  }, [session?.user.id, fetchProfile])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user) {
        await fetchProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
