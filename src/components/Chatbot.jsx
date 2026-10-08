import { Link } from 'react-router-dom'
import { authPath } from '../lib/navigation'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../hooks/useStore'
import { store } from '../services/store'
import { IconButton } from './UI'
export default function Chatbot() {
  const { preview } = useStore()
  const [open, setOpen] = useState(false),
    [text, setText] = useState(''),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const end = useRef(null),
    requestLock = useRef(false)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, busy])
  async function request(next) {
    if (requestLock.current) return
    requestLock.current = true
    setBusy(true)
    setError('')
    try {
      const reply = await store.chat(next.slice(-12))
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      requestLock.current = false
      setBusy(false)
    }
  }
  async function send(e) {
    e.preventDefault()
    if (!text.trim() || requestLock.current || preview) return
    const next = [...messages, { role: 'user', content: text.trim() }]
    setMessages(next)
    setText('')
    await request(next)
  }
  return (
    <div className="chat-container">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="KIVI shopping assistant"
            className="chat-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
          >
            <header>
              <div>
                <Sparkles size={18} />
                <strong>Your sound concierge</strong>
              </div>
              <IconButton label="Close assistant" onClick={() => setOpen(false)}>
                <X size={18} />
              </IconButton>
            </header>
            <div className="chat-messages" aria-live="polite">
              <p className="chat-welcome">A little guidance for your next great listen.</p>
              {preview ? (
                <p>
                  Sign in for recommendations from the live catalog and updates on your own demo
                  orders. <Link to={authPath('/')}>Sign in to ask KIVI →</Link>
                </p>
              ) : (
                !messages.length && (
                  <p>Ask about the collection, your budget, or one of your demo orders.</p>
                )
              )}
              {messages.map((m, i) => (
                <p key={i} className={`chat-message ${m.role}`}>
                  {m.content}
                </p>
              ))}
              {busy && <p className="muted">Finding the details…</p>}
              {error && (
                <p className="notice" role="alert">
                  {error}
                  <button className="text-button" disabled={busy} onClick={() => request(messages)}>
                    Try again
                  </button>
                </p>
              )}
              <div ref={end} />
            </div>
            <form onSubmit={send}>
              <input
                aria-label="Message the shopping assistant"
                maxLength={1500}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What are you listening for?"
                disabled={preview || busy}
              />
              <IconButton
                label="Send message"
                type="submit"
                disabled={preview || busy || !text.trim()}
              >
                <Send size={18} />
              </IconButton>
            </form>
            <small>AI guidance · Demo catalog & order tracking</small>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        className="chat-launcher"
        aria-label={open ? 'Close shopping assistant' : 'Open shopping assistant'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={19} /> : <Sparkles size={19} />}
        <span>Ask KIVI</span>
      </button>
    </div>
  )
}
