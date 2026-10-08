import { readFileSync } from 'node:fs'
function env(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((x) => x.trim() && !x.startsWith('#') && x.includes('='))
        .map((x) => {
          const i = x.indexOf('=')
          return [
            x.slice(0, i).trim(),
            x
              .slice(i + 1)
              .trim()
              .replace(/^["']|["']$/g, ''),
          ]
        }),
    )
  } catch {
    return {}
  }
}
const frontend = { ...env('.env.local'), ...process.env },
  backend = { ...env('supabase/.env.local'), ...process.env }
const url = frontend.VITE_SUPABASE_URL || frontend.NEXT_PUBLIC_SUPABASE_URL,
  key =
    frontend.VITE_SUPABASE_PUBLISHABLE_KEY ||
    frontend.VITE_SUPABASE_ANON_KEY ||
    frontend.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
for (const path of ['/auth/v1/settings', '/rest/v1/products?select=id&limit=1']) {
  if (!url || !key) {
    console.log('Supabase: missing public configuration')
    break
  }
  try {
    const r = await fetch(`${url}${path}`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    })
    console.log(`Supabase ${path}: HTTP ${r.status}`)
  } catch {
    console.log(`Supabase ${path}: network verification failed`)
  }
}
if (backend.GEMINI_API_KEY) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': backend.GEMINI_API_KEY },
    signal: AbortSignal.timeout(15000),
  })
  console.log(`Gemini model list: HTTP ${r.status}`)
  if (r.ok) {
    const { models } = await r.json()
    const requested = backend.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const model = models.find(
      (x) =>
        x.name === `models/${requested}` &&
        x.supportedGenerationMethods?.includes('generateContent'),
    )
    console.log(
      `Requested model ${requested}: ${model ? 'available' : 'not available to this key'}`,
    )
    if (model) {
      const inference = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${requested}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': backend.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with the word OK.' }] }],
            generationConfig: { maxOutputTokens: 32 },
          }),
          signal: AbortSignal.timeout(20000),
        },
      )
      console.log(`Gemini inference: HTTP ${inference.status}`)
    }
  }
} else console.log('Gemini: missing server-side key')
