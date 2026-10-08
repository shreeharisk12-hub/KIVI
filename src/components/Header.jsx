import { authPath } from '../lib/navigation'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, Heart, ShoppingBag, UserRound, Sun, Moon, ArrowUpRight } from 'lucide-react'
import { useStore } from '../hooks/useStore'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { IconButton, Dialog } from './UI'
import SearchOverlay from './SearchOverlay'
export default function Header() {
  const { prefix, cart, preview } = useStore(),
    { dark, setPreference } = useTheme(),
    { admin } = useAuth(),
    location = useLocation()
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false)
  const hero =
    location.pathname === `${prefix}/` || location.pathname === prefix || location.pathname === '/'
  return (
    <>
      <header className={`site-header ${hero ? 'on-hero' : ''}`}>
        <div className="nav-left">
          <IconButton label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={21} />
          </IconButton>
          <span className="nav-caption">SOUND, CONSIDERED.</span>
        </div>
        <Link className="wordmark" to={`${prefix}/`} aria-label="KIVI home">
          kivi<span>®</span>
        </Link>
        <nav className="nav-right" aria-label="Quick navigation">
          <IconButton label="Search headphones" onClick={() => setSearch(true)}>
            <Search size={20} />
          </IconButton>
          <Link
            className="icon-button wishlist-nav"
            to={`${prefix}/wishlist`}
            aria-label="Wishlist"
          >
            <Heart size={20} />
          </Link>
          <Link className="icon-button cart-nav" to={`${prefix}/cart`} aria-label="Shopping bag">
            <ShoppingBag size={20} />
            {cart.length > 0 && <b>{cart.reduce((s, x) => s + x.quantity, 0)}</b>}
          </Link>
          <Link
            className="icon-button"
            to={preview ? authPath('/account') : `${prefix}/account`}
            aria-label="Your account"
          >
            <UserRound size={20} />
          </Link>
        </nav>
      </header>
      {menu && (
        <Dialog title="Explore KIVI" close={() => setMenu(false)} className="menu-dialog">
          <div className="menu-links">
            {[
              ['The collection', '/'],
              ['Explore headphones', '/catalog'],
              ['Your wishlist', '/wishlist'],
              ['Shopping bag', '/cart'],
              ['Your account', '/account'],
              ...(admin ? [['Manage KIVI', '/admin']] : []),
            ].map(([label, url], i) => (
              <Link
                key={url}
                to={
                  preview && ['/account', '/admin'].includes(url)
                    ? authPath(url)
                    : `${prefix}${url}`
                }
                onClick={() => setMenu(false)}
              >
                <small>0{i + 1}</small>
                {label}
                <ArrowUpRight />
              </Link>
            ))}
          </div>
          <button
            className="text-button theme-toggle"
            onClick={() => setPreference(dark ? 'light' : 'dark')}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}Switch to {dark ? 'light' : 'dark'} mode
          </button>
          <p className="muted">Find your frequency.</p>
        </Dialog>
      )}
      {search && <SearchOverlay close={() => setSearch(false)} />}
    </>
  )
}
