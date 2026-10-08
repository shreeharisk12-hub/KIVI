import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, ChevronDown, Headphones } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authPath, productPath } from '../lib/navigation'
import { useStore } from '../hooks/useStore'
import { defaultVariant, nextProduct, money } from '../lib/utils'
import { ProductImage, Swatches, IconButton, ProductCard, Busy, Notice } from '../components/UI'
export default function Home() {
  const {
    products: catalog,
    loading,
    error,
    prefix,
    preview,
    wishlist: saved,
    wishlistBusy,
    toggleWishlist,
    changeCart,
    setToast,
  } = useStore()
  const products = catalog.filter((p) => p.variants.length > 0)
  const [index, setIndex] = useState(0),
    [selectedVariant, setVariant] = useState(null),
    [direction, setDirection] = useState(1),
    [buying, setBuying] = useState(false)
  const navigate = useNavigate(),
    purchaseLock = useRef(false)
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, products.length - 1)))
  }, [products.length])
  const reduced = useReducedMotion()
  const product = products[Math.min(index, Math.max(0, products.length - 1))]
  const variant =
    product?.variants.find((v) => v.id === selectedVariant?.id) || defaultVariant(product)
  useEffect(() => {
    setVariant(defaultVariant(product))
  }, [product?.id])
  if (loading) return <Busy />
  if (error)
    return (
      <main className="page empty">
        <h1>Your collection is getting ready.</h1>
        <Notice>{error}</Notice>
        <p>Apply the supplied Supabase migrations and seed to load the live catalog.</p>
        <Link className="button" to="/preview">
          Open local asset preview <ArrowUpRight size={18} />
        </Link>
      </main>
    )
  if (!product || !variant)
    return (
      <main className="page empty">
        <Headphones />
        <h1>The collection is coming soon.</h1>
        <p>No active products are available.</p>
      </main>
    )
  function move(d) {
    setDirection(d)
    const i = nextProduct(index, d, products.length)
    setIndex(i)
    setVariant(defaultVariant(products[i]))
  }
  async function buy() {
    if (preview) {
      navigate(authPath(productPath(product, variant)))
      return
    }
    if (purchaseLock.current) return
    purchaseLock.current = true
    setBuying(true)
    try {
      await changeCart(variant.id, 1, 'add')
      navigate('/checkout')
    } catch (e) {
      setToast(e.message)
    } finally {
      purchaseLock.current = false
      setBuying(false)
    }
  }
  return (
    <>
      <motion.section
        className="hero"
        initial={{ '--product-background': product.background }}
        animate={{ '--product-background': product.background }}
        transition={{ duration: reduced ? 0 : 0.8 }}
        style={{ '--product-accent': product.accent }}
        aria-label="Featured headphone collection"
      >
        <div className="hero-grid" />
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-topline">
          <span>
            <i />
            THE ART OF LISTENING
          </span>
          <span>COLLECTION — 2026</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            className="hero-type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: reduced ? 0 : 0.35 }}
            aria-hidden="true"
          >
            <span>{product.brand === 'SONY' ? 'SONY' : product.name.split(' ')[0]}</span>
            <strong>
              {product.brand === 'SONY' ? 'XM6' : product.name.split(' ').slice(1).join(' ')}
            </strong>
          </motion.div>
        </AnimatePresence>
        <div className="hero-side-label">DESIGNED TO MOVE YOU</div>
        <div className="hero-colors">
          <span className="eyebrow">THE FINISH</span>
          <Swatches variants={product.variants} selected={variant} onSelect={setVariant} />
          <span className="color-caption">{variant.color_name}</span>
        </div>
        <div className="hero-product-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${product.id}-${variant.id}`}
              className="hero-product"
              initial={{ opacity: 0, x: reduced ? 0 : direction * 45, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduced ? 0 : direction * -35, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductImage variant={variant} name={product.name} cutout fetchPriority="high" />
              <div className="product-shadow" />
            </motion.div>
          </AnimatePresence>
        </div>
        <nav className="hero-thumbnails" aria-label="Choose a headphone">
          {products.map((p, i) => (
            <button
              key={p.id}
              className={index === i ? 'active' : ''}
              aria-label={`Show ${p.name}`}
              aria-current={index === i ? 'true' : undefined}
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                setIndex(i)
                setVariant(defaultVariant(p))
              }}
            >
              <span className="thumbnail-number">0{i + 1}</span>
              <ProductImage variant={defaultVariant(p)} name={p.name} cutout />
              <span className="thumbnail-name">{p.display_name}</span>
            </button>
          ))}
        </nav>
        <div className="hero-bottom">
          <div className="hero-purchase">
            <div className="eyebrow">{product.category}</div>
            <h1>{product.name}</h1>
            <div className="hero-actions">
              <button
                className="button button-white"
                onClick={buy}
                disabled={buying || (!preview && !variant.stock)}
              >
                {buying ? 'Updating bag…' : 'Buy now'}
                <ArrowUpRight size={18} />
              </button>
              <IconButton
                label={saved.includes(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                onClick={() => toggleWishlist(product.id)}
                disabled={wishlistBusy.includes(product.id)}
                aria-pressed={saved.includes(product.id)}
              >
                <Heart size={20} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
              </IconButton>
            </div>
          </div>
          <div className="hero-pagination">
            <div className="arrows">
              <IconButton label="Previous headphone" onClick={() => move(-1)}>
                <ArrowLeft size={20} />
              </IconButton>
              <span>
                0{index + 1}
                <span> / 0{products.length}</span>
              </span>
              <IconButton label="Next headphone" onClick={() => move(1)}>
                <ArrowRight size={20} />
              </IconButton>
            </div>
            <div className="pagination-lines">
              {products.map((p, i) => (
                <button
                  aria-label={`Go to ${p.name}`}
                  key={p.id}
                  className={i === index ? 'active' : ''}
                  onClick={() => {
                    setIndex(i)
                    setVariant(defaultVariant(p))
                  }}
                />
              ))}
            </div>
          </div>
          <div className="hero-description">
            <p>{product.headline}</p>
            <div className="hero-price">
              {money(variant.price)}
              <small>Demo catalog price · {variant.stock > 0 ? 'Available' : 'Sold out'}</small>
            </div>
          </div>
        </div>
        <div className="hero-foot">
          <span>FIND YOUR FREQUENCY.</span>
          <a href="#collection">
            SCROLL TO EXPLORE
            <ChevronDown size={13} />
          </a>
          <span>01 — 03</span>
        </div>
      </motion.section>
      <section className="collection-section" id="collection">
        <div className="section-intro">
          <div>
            <div className="eyebrow">THREE PERSPECTIVES. ONE OBSESSION.</div>
            <h2>
              Sound is personal.
              <br />
              <span>So is your choice.</span>
            </h2>
          </div>
          <p>
            For the daily escape. The next level.
            <br />
            The love of every little detail.
            <br />
            Meet the KIVI collection.
          </p>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="collection-note">
          <span>Project imagery · Demo catalog pricing</span>
          <Link to={`${prefix}/catalog`}>
            Explore the collection <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="manifesto">
        <div className="eyebrow">THE KIVI PHILOSOPHY</div>
        <h2>
          Less distraction.
          <br />
          More connection.
        </h2>
        <p>
          Three carefully chosen silhouettes.
          <br />
          Nine ways to make one your own.
        </p>
        <Link className="button" to={`${prefix}/catalog`}>
          Find your headphones <ArrowRight size={18} />
        </Link>
      </section>
    </>
  )
}
