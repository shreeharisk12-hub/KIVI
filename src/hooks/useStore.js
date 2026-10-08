import { useContext } from 'react'
import { StoreContext } from '../lib/contexts'
export const useStore = () => useContext(StoreContext)
