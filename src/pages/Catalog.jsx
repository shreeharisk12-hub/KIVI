import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { ProductCard, Busy, Notice } from '../components/UI'
export default function Catalog({ wishlist = false }) {
  const {
    products,
    loading,
    error,
    wishlist: saved,
    wishlistLoading,
    wishlistError,
    preview,
    refreshWishlist,
  } = useStore()
  const [category, setCategory] = useState('All headphones'),
    [query, setQuery] = useState('')
  const categories = ['All headphones', ...new Set(products.map((p) => p.category))]
  const filtered = products.filter(
    (p) =>
      (!wishlist || saved.includes(p.id)) &&
      (category === 'All headphones' || p.category === category) &&
      `${p.name} ${p.brand} ${p.category} ${p.keywords}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <main className="page catalog-page">
      <div className="eyebrow">{wishlist ? 'YOUR SAVED COLLECTION' : 'THE KIVI COLLECTION'}</div>
      <h1>{wishlist ? 'A few favorites.' : 'A sound for every side of you.'}</h1>
      <p className="muted">
        {wishlist
          ? preview
            ? 'Saved on this device for the asset preview.'
            : 'Saved to your KIVI account, across devices.'
          : 'Three distinct perspectives. Discover yours.'}
      </p>
      <div className="catalog-tools">
        <div className="tabs">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          aria-label="Filter collection"
          placeholder="Filter the collection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <Notice>{error}</Notice>}
      {wishlist && wishlistError && (
        <Notice>
          {wishlistError}{' '}
          <button className="text-button" onClick={refreshWishlist}>
            Try again
          </button>
        </Notice>
      )}
      {loading || (wishlist && wishlistLoading) ? (
        <Busy />
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {!loading && !wishlistLoading && !filtered.length && (
        <div className="empty">
          {wishlist
            ? 'Your wishlist is waiting. Tap a heart on the landing page to save a headphone.'
            : 'No headphones match these filters.'}
        </div>
      )}
    </main>
  )
}
