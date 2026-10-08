import { useEffect, useRef, useState } from 'react'
import { Search, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { store } from '../services/store'
import { Dialog, ProductImage } from './UI'
import { money, defaultVariant } from '../lib/utils'
export default function SearchOverlay({ close }) {
  const { products, preview, prefix } = useStore(),
    navigate = useNavigate()
  const [query, setQuery] = useState(''),
    [results, setResults] = useState(products.slice(0, 3)),
    [active, setActive] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => {
    input.current?.focus()
  }, [])
  useEffect(() => {
    let alive = true
    const timer = setTimeout(async () => {
      setError('')
      setActive(0)
      if (!query.trim()) {
        setResults(products.slice(0, 3))
        setBusy(false)
        return
      }
      setBusy(true)
      try {
        const data = preview
          ? products.filter((p) =>
              `${p.name} ${p.category} ${p.brand} ${p.keywords}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
          : await store.search(query)
        if (alive) setResults(data)
      } catch (e) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setBusy(false)
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, products, preview])
  const select = (p) => {
    navigate(`${prefix}/products/${p.slug}`)
    close()
  }
  return (
    <Dialog title="Find your frequency" close={close} className="search-dialog">
      <div className="search-field">
        <Search />
        <input
          ref={input}
          type="search"
          value={query}
          placeholder="Search headphones, brands, or categories"
          aria-label="Search catalog"
          aria-controls="search-results"
          aria-activedescendant={results.length ? `result-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            setResults([])
            setBusy(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => (i + 1) % Math.max(results.length, 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1))
            }
            if (e.key === 'Enter' && results[active]) select(results[active])
          }}
        />
      </div>
      <div className="eyebrow search-label">
        {query ? 'SEARCH RESULTS' : 'THE COLLECTION'} {busy && ' · Searching…'}
      </div>
      {error && <p role="alert">{error}</p>}
      <div id="search-results" role="listbox" aria-label="Headphones">
        {results.map((p, i) => (
          <button
            key={p.id}
            id={`result-${i}`}
            role="option"
            aria-selected={i === active}
            className={`search-result ${i === active ? 'active' : ''}`}
            onClick={() => select(p)}
            onMouseEnter={() => setActive(i)}
          >
            <ProductImage name={p.name} variant={defaultVariant(p)} />
            <div>
              <strong>{p.name}</strong>
              <small>{p.category}</small>
            </div>
            <span>{money(defaultVariant(p)?.price)}</span>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      {!results.length && !busy && (
        <p className="empty-small">No matches. Try “wireless”, “gaming”, or “vintage”.</p>
      )}
      <p className="muted search-help">↑ ↓ to explore · Enter to open · Esc to close</p>
    </Dialog>
  )
}
