export const intents = [
  'recommend',
  'compare',
  'specifications',
  'availability',
  'budget',
  'clarify',
]
const openings = {
  recommend: 'Based on the current KIVI catalog, these are the closest matches:',
  compare: 'Here is a comparison using the current catalog details:',
  specifications: 'Here are the specifications recorded in the KIVI catalog:',
  availability: 'Here is the current catalog availability:',
  budget: 'Here are the selected options and their demo catalog prices:',
}
/** Render only database facts. Gemini selects intent and existing product IDs; it cannot author stock, specs or prices. */
export function groundResponse(selection, catalog) {
  if (
    !intents.includes(selection?.intent) ||
    !Array.isArray(selection?.product_ids) ||
    selection.product_ids.length > 3 ||
    selection.product_ids.some((id) => typeof id !== 'string' || !catalog.some((p) => p.id === id))
  )
    throw new Error('The answer could not be grounded in the catalog.')
  if (selection.intent === 'clarify' || !selection.product_ids.length)
    return 'Would you prefer wireless headphones, a gaming concept, or a wired audiophile concept? Share your budget in INR and how you plan to listen. I can only recommend products and details in the current KIVI catalog.'
  const products = [...new Set(selection.product_ids)].map((id) => catalog.find((p) => p.id === id))
  const sections = products.map((p) => {
    const variants = p.product_variants || []
    const prices = variants
      .map(
        (v) =>
          `${v.color_name}: ₹${Number(v.price).toLocaleString('en-IN')} · ${v.stock > 0 ? `${v.stock} available` : 'out of stock'}`,
      )
      .join('\n')
    const specs = ['compare', 'specifications'].includes(selection.intent)
      ? '\n' +
        Object.entries(p.specifications || {})
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join('\n')
      : ''
    return `${p.name} — ${p.category}\n${p.description}\n${prices}${specs}`
  })
  return `${openings[selection.intent]}\n\n${sections.join('\n\n')}\n\nDemo catalog pricing. Fictional product specifications are illustrative; Sony imagery is supplied project imagery. Availability is rechecked at checkout.`
}
