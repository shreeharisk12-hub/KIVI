import { useEffect, useState, useCallback, useRef } from 'react'
import { store } from '../services/store'
import { normalizeProduct } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { StoreContext as Context } from '../lib/contexts'
function localWishlist() {
  try {
    const ids = JSON.parse(localStorage.getItem('kivi-wishlist') || '[]')
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
export function StoreProvider({ preview, children }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([]),
    [cart, setCart] = useState([]),
    [cartLoading, setCartLoading] = useState(!preview),
    [cartError, setCartError] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [wishlist, setWishlist] = useState(preview ? localWishlist : []),
    [wishlistLoading, setWishlistLoading] = useState(!preview),
    [wishlistError, setWishlistError] = useState(''),
    [wishlistBusy, setWishlistBusy] = useState([])
  const generation = useRef(0),
    wishlistPending = useRef(new Set())
  useEffect(() => {
    generation.current++
    return () => {
      generation.current++
    }
  }, [user?.id, preview])
  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      const request = generation.current
      if (!quiet) setLoading(true)
      setError('')
      try {
        const data = preview
          ? await fetch('/preview-catalog.json')
              .then((r) => {
                if (!r.ok) throw new Error('Asset preview could not load.')
                return r.json()
              })
              .then((p) => p.map(normalizeProduct))
          : await store.products()
        if (request === generation.current) setProducts(data)
        return true
      } catch (e) {
        if (request === generation.current) setError(e.message)
        return false
      } finally {
        if (request === generation.current) setLoading(false)
      }
    },
    [preview],
  )
  const refreshCart = useCallback(async () => {
    const request = generation.current
    if (!user || preview) {
      setCart([])
      setCartLoading(false)
      setCartError('')
      return true
    }
    setCartLoading(true)
    setCartError('')
    try {
      const data = await store.cart()
      if (request === generation.current) setCart(data)
      return true
    } catch (e) {
      if (request === generation.current) setCartError(e.message)
      return false
    } finally {
      if (request === generation.current) setCartLoading(false)
    }
  }, [user?.id, preview])
  const refreshWishlist = useCallback(async () => {
    const request = generation.current
    if (preview) {
      setWishlist(localWishlist())
      setWishlistLoading(false)
      return
    }
    if (!user) {
      setWishlist([])
      setWishlistLoading(false)
      return
    }
    setWishlistLoading(true)
    setWishlistError('')
    try {
      const rows = await store.wishlist()
      if (request === generation.current) setWishlist(rows.map((x) => x.product_id))
    } catch (e) {
      if (request === generation.current) setWishlistError(e.message)
    } finally {
      if (request === generation.current) setWishlistLoading(false)
    }
  }, [user?.id, preview])
  useEffect(() => {
    setProducts([])
    setCart([])
    setWishlist(preview ? localWishlist() : [])
    refresh()
    refreshCart()
    refreshWishlist()
  }, [refresh, refreshCart, refreshWishlist, preview])
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 6000)
      return () => clearTimeout(t)
    }
  }, [toast])
  async function changeCart(variant, quantity, mode = 'set') {
    if (preview) throw new Error('Sign in to save headphones to your bag.')
    await store.mutateCart(variant, quantity, mode)
    const refreshed = await refreshCart()
    // Cart mutations do not replace the product page with a loading screen.
    await refresh({ quiet: true })
    if (!refreshed)
      throw new Error(
        'Your bag was saved, but could not be refreshed. Open your bag and use Try again before adding more.',
      )
  }
  async function toggleWishlist(productId) {
    if (wishlistPending.current.has(productId)) return
    wishlistPending.current.add(productId)
    setWishlistBusy([...wishlistPending.current])
    setWishlistError('')
    try {
      const saved = wishlist.includes(productId)
      if (preview) {
        const ids = saved ? wishlist.filter((x) => x !== productId) : [...wishlist, productId]
        localStorage.setItem('kivi-wishlist', JSON.stringify(ids))
        setWishlist(ids)
      } else {
        if (!user) throw new Error('Sign in to save your wishlist.')
        if (saved) await store.removeWishlist(productId)
        else await store.addWishlist(user.id, productId)
        setWishlist((ids) =>
          saved ? ids.filter((x) => x !== productId) : [...new Set([...ids, productId])],
        )
      }
      setToast(
        saved
          ? 'Removed from your wishlist.'
          : preview
            ? 'Saved to your preview wishlist on this device.'
            : 'Saved to your account wishlist.',
      )
    } catch (e) {
      setWishlistError(e.message)
      setToast(`Wishlist: ${e.message}`)
    } finally {
      wishlistPending.current.delete(productId)
      setWishlistBusy([...wishlistPending.current])
    }
  }
  return (
    <Context.Provider
      value={{
        preview,
        prefix: preview ? '/preview' : '',
        products,
        cart,
        cartLoading,
        cartError,
        loading,
        error,
        refresh,
        refreshCart,
        changeCart,
        toast,
        setToast,
        wishlist,
        wishlistLoading,
        wishlistError,
        wishlistBusy,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </Context.Provider>
  )
}
