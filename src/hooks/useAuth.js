import { useContext } from 'react'
import { AuthContext } from '../lib/contexts'
export const useAuth = () => useContext(AuthContext)
