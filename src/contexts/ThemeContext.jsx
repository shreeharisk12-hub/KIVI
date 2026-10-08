import { useEffect, useState } from 'react'
import { ThemeContext as Context } from '../lib/contexts'
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(
      () => localStorage.getItem('kivi-theme') || 'system',
    ),
    [system, setSystem] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const q = matchMedia('(prefers-color-scheme: dark)'),
      fn = (e) => setSystem(e.matches)
    q.addEventListener('change', fn)
    return () => q.removeEventListener('change', fn)
  }, [])
  const dark = preference === 'dark' || (preference === 'system' && system)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('kivi-theme', preference)
  }, [preference, dark])
  return <Context.Provider value={{ preference, setPreference, dark }}>{children}</Context.Provider>
}
