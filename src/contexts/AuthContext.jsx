import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { store } from '../services/store'
import { AuthContext as Context } from '../lib/contexts'
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [admin, setAdmin] = useState(false),
    [adminLoading, setAdminLoading] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session)
          setError(error?.message || '')
          setLoading(false)
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e.message)
          setLoading(false)
        }
      })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setError('')
      setLoading(false)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])
  useEffect(() => {
    setAdmin(false)
    setAdminLoading(Boolean(session))
    let alive = true
    if (session)
      store
        .isAdmin()
        .then((v) => {
          if (alive) setAdmin(Boolean(v))
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setAdminLoading(false)
        })
    return () => {
      alive = false
    }
  }, [session?.user?.id])
  return (
    <Context.Provider
      value={{
        session,
        user: session?.user,
        loading,
        admin,
        adminLoading,
        error,
        logout: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
