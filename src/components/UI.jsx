import { Component, useEffect, useRef } from 'react'
import { X, ArrowUpRight, LoaderCircle, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { productPath } from '../lib/navigation'
import { imageUrl, defaultVariant, money } from '../lib/utils'
import { useStore } from '../hooks/useStore'
export function IconButton({ label, children, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}
export function Busy({ text = 'Finding your frequency…' }) {
  return (
    <div className="empty">
      <LoaderCircle className="spin" />
      <p>{text}</p>
    </div>
  )
}
export function Notice({ children }) {
  return (
    <div className="notice" role="alert">
      {children}
    </div>
  )
}
export function Dialog({ title, close, children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current.showModal()
    const fn = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', fn)
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = old
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <header>
        <h2>{title}</h2>
        <IconButton label="Close" onClick={close}>
          <X />
        </IconButton>
      </header>
      {children}
    </dialog>
  )
}
export function ProductImage({ variant, name, className = '', cutout = false, ...props }) {
  const [failed, setFailed] = useImageState(variant?.image_path)
  return failed ? (
    <div className={`image-missing ${className}`}>Image unavailable</div>
  ) : (
    <img
      className={`${className} ${cutout ? 'cutout' : ''}`}
      src={imageUrl(variant)}
      alt={`${name} in ${variant?.color_name || ''}`}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}
import { useState } from 'react'
function useImageState(key) {
  const state = useState(false)
  useEffect(() => state[1](false), [key])
  return state
}
export function Swatches({ variants, selected, onSelect }) {
  return (
    <div className="swatches" role="group" aria-label="Choose a color">
      {variants.map((v) => (
        <button
          key={v.id}
          className={`swatch ${selected?.id === v.id ? 'selected' : ''}`}
          aria-label={v.color_name}
          title={`${v.color_name}${v.stock === 0 ? ' — sold out' : ''}`}
          aria-pressed={selected?.id === v.id}
          onClick={() => onSelect(v)}
          style={{ '--swatch': v.color_hex }}
        >
          <span />
        </button>
      ))}
    </div>
  )
}
export function ProductCard({ product }) {
  const { prefix, wishlist, wishlistBusy, toggleWishlist } = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const variant = product.variants.find((v) => v.id === selectedId) || defaultVariant(product)
  const destination = variant
    ? productPath(product, variant, 1, prefix)
    : `${prefix}/products/${product.slug}`
  return (
    <article className="product-card">
      <Link to={destination} className="card-image">
        {variant ? (
          <ProductImage variant={variant} name={product.name} loading="lazy" />
        ) : (
          <span>Finishes coming soon</span>
        )}
        <ArrowUpRight />
      </Link>
      <div className="card-content">
        <div className="eyebrow">{product.category}</div>
        <h3>
          <Link to={destination}>{product.name}</Link>
        </h3>
        <div className="card-bottom">
          <span>{variant ? money(variant.price) : 'Coming soon'}</span>
          <Swatches
            variants={product.variants}
            selected={variant}
            onSelect={(v) => setSelectedId(v.id)}
          />
        </div>
        <div className="card-bottom">
          <Link className="text-button" to={destination}>
            View details <ArrowUpRight size={16} />
          </Link>
          <IconButton
            label={
              wishlist.includes(product.id)
                ? `Remove ${product.name} from wishlist`
                : `Save ${product.name} to wishlist`
            }
            aria-pressed={wishlist.includes(product.id)}
            disabled={wishlistBusy.includes(product.id)}
            onClick={() => toggleWishlist(product.id)}
          >
            <Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
          </IconButton>
        </div>
        <small>Demo catalog pricing</small>
      </div>
    </article>
  )
}
export class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return (
        <main className="empty">
          <h1>We hit a quiet moment.</h1>
          <p>{this.state.error.message}</p>
          <button className="button" onClick={() => location.reload()}>
            Reload KIVI
          </button>
        </main>
      )
    return this.props.children
  }
}
export function ImageFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="filter-defs">
      <defs>
        <filter id="white-cutout" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -7 -7 -7 0 20" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  )
}
