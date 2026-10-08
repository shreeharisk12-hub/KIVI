import { useContext } from 'react'
import { ThemeContext } from '../lib/contexts'
export const useTheme = () => useContext(ThemeContext)
