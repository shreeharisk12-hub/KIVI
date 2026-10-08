import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useStore } from '../hooks/useStore'
import { store } from '../services/store'
import { Notice } from '../components/UI'
import { AddressFields } from './Checkout'
export default function Account() {
  const { user, logout, admin } = useAuth(),
    { preference, setPreference } = useTheme(),
    { preview, prefix, setToast } = useStore(),
    navigate = useNavigate()
  const [editingAddress, setEditingAddress] = useState(null)
  const [name, setName] = useState(user?.user_metadata?.display_name || ''),
    [addresses, setAddresses] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    if (preview) return
    store
      .profile(user.id)
      .then((p) => {
        setName(p.display_name)
        if (p.theme) setPreference(p.theme)
      })
      .catch((e) => setError(e.message))
    store
      .addresses()
      .then(setAddresses)
      .catch((e) => setError(e.message))
  }, [user?.id, preview])
  async function update(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await store.updateProfile(user.id, { display_name: name, theme: preference })
      setToast('Your profile has been saved.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function saveAddress(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = e.currentTarget
    try {
      const fields = Object.fromEntries(new FormData(form))
      if (editingAddress)
        await store.updateAddress(editingAddress.id, { ...fields, country: 'India' })
      else await store.saveAddress({ ...fields, user_id: user.id, country: 'India' })
      setEditingAddress(null)
      setAddresses(await store.addresses())
      form.reset()
      setToast('Address saved.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function remove(id) {
    setBusy(true)
    setError('')
    try {
      await store.deleteAddress(id)
      setAddresses((a) => a.filter((x) => x.id !== id))
      setToast('Address removed.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page">
      <div className="eyebrow">YOUR SPACE</div>
      <h1>A sound choice, {name || 'listener'}.</h1>
      {error && <Notice>{error}</Notice>}
      {preview && <Notice>Sign in to manage your profile, addresses, and demo orders.</Notice>}
      <div className="account-grid">
        <section className="panel">
          <h2>Your details.</h2>
          <p className="muted">{user?.email || 'Local asset preview'}</p>
          <form onSubmit={update}>
            <label>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </label>
            <label>
              Appearance
              <select value={preference} onChange={(e) => setPreference(e.target.value)}>
                <option value="system">Follow your device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button className="button" disabled={busy || preview}>
              Save preferences
            </button>
          </form>
          <Link className="account-link" to={`${prefix}/orders`}>
            Order history & tracking
            <ArrowUpRight size={18} />
          </Link>
          {admin && (
            <Link className="account-link" to="/admin">
              Manage KIVI
              <ArrowUpRight size={18} />
            </Link>
          )}
          <button
            className="text-button"
            onClick={async () => {
              try {
                await logout()
                navigate('/auth')
              } catch (e) {
                setError(e.message)
              }
            }}
            disabled={preview}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </section>
        <section className="panel">
          <h2>Your addresses.</h2>
          {addresses.map((a) => (
            <div className="saved-address" key={a.id}>
              <p>
                <strong>{a.full_name}</strong>
                <br />
                {a.line1}, {a.city}, {a.state} {a.postal_code}
              </p>
              <button className="text-button" disabled={busy} onClick={() => setEditingAddress(a)}>
                Edit
              </button>
              <button
                className="text-button"
                aria-label={`Delete address ${a.line1}`}
                disabled={busy}
                onClick={() => remove(a.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <details open={editingAddress ? true : undefined}>
            <summary>{editingAddress ? 'Edit saved address' : 'Add a new address'}</summary>
            <form onSubmit={saveAddress} key={editingAddress?.id || 'new'}>
              <AddressFields values={editingAddress || {}} />
              <button className="button" disabled={busy || preview}>
                Save address
              </button>
              {editingAddress && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditingAddress(null)}
                >
                  Cancel editing
                </button>
              )}
            </form>
          </details>
        </section>
      </div>
    </main>
  )
}
