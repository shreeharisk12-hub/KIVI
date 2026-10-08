import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { authPath } from './lib/navigation'
import { useAuth } from './hooks/useAuth'
import { StoreProvider } from './contexts/StoreContext'
import { useStore } from './hooks/useStore'
import Header from './components/Header'
import Chatbot from './components/Chatbot'
import { Busy, ImageFilter } from './components/UI'
import Home from './pages/Home'
import Auth from './pages/Auth'
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Orders = lazy(() => import('./pages/Orders'))
const Account = lazy(() => import('./pages/Account'))
const Admin = lazy(() => import('./pages/Admin'))
function Guard({ children }) {
  const { loading, user, error } = useAuth()
  const location = useLocation()
  if (loading) return <Busy />
  if (error)
    return (
      <main className="empty">
        <h1>Unable to restore your session.</h1>
        <p role="alert">{error}</p>
        <Link className="button" to="/auth">
          Sign in
        </Link>
      </main>
    )
  if (!user) return <Navigate to={authPath(location.pathname + location.search)} replace />
  return children
}
function Workspace({ preview = false }) {
  return (
    <StoreProvider preview={preview}>
      <Shell />
    </StoreProvider>
  )
}
function Shell() {
  const { preview, toast, setToast } = useStore(),
    location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {preview && (
        <div className="preview-banner">
          LOCAL ASSET PREVIEW · Demo prices & inventory ·{' '}
          <Link to="/auth">Sign in to the live store ↗</Link>
        </div>
      )}
      <Header />
      <div id="main-content">
        <Suspense fallback={<Busy />}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="wishlist" element={<Catalog wishlist />} />
            <Route path="products/:slug" element={<Product />} />
            <Route path="cart" element={<Cart />} />
            <Route
              path="checkout"
              element={preview ? <Navigate to={authPath('/checkout')} replace /> : <Checkout />}
            />
            <Route
              path="orders"
              element={preview ? <Navigate to={authPath('/orders')} replace /> : <Orders />}
            />
            <Route
              path="orders/:id"
              element={preview ? <Navigate to={authPath('/orders')} replace /> : <Orders />}
            />
            <Route
              path="account"
              element={preview ? <Navigate to={authPath('/account')} replace /> : <Account />}
            />
            <Route
              path="admin"
              element={preview ? <Navigate to={authPath('/admin')} replace /> : <Admin />}
            />
            <Route
              path="*"
              element={
                <main className="page empty">
                  <h1>This frequency is unavailable.</h1>
                  <Link to={preview ? '/preview' : '/'}>Return to KIVI</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      <footer className="site-footer">
        <Link className="wordmark" to={preview ? '/preview' : '/'}>
          kivi<span>®</span>
        </Link>
        <span>SOUND, CONSIDERED.</span>
        <small>© 2026 KIVI · Demo commerce & tracking</small>
      </footer>
      <Chatbot />
      {toast && (
        <button role="status" className="toast" onClick={() => setToast('')}>
          {toast}
        </button>
      )}
    </>
  )
}
export default function App() {
  return (
    <>
      <ImageFilter />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<Auth />} />
        <Route path="/preview/*" element={<Workspace preview />} />
        <Route
          path="/*"
          element={
            <Guard>
              <Workspace />
            </Guard>
          }
        />
      </Routes>
    </>
  )
}
