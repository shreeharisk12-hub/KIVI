# KIVI implementation plan

## Inspection (before implementation)
The repository initially contains only nine supplied product PNGs and two environment files. There is no existing application, package manifest, or AGENTS.md. All images are 2048 × 2048 RGBA with alpha 255 throughout: white backgrounds, no actual transparency. Detailed per-image inventory and SHA-256 hashes are in assets.json. Original folders will stay untouched. Byte-identical copies live under public/products/{product}/{variant}.png. Consistent object-fit and a display-only SVG white-background filter integrate the assets into dark hero scenes; light product cards use the unchanged originals.

## Architecture
- React + JavaScript/JSX, Vite, Tailwind 4, Motion, React Router, Lucide.
- Contexts: auth (Supabase session subscription), theme (system/local/profile preference), catalog, cart (database-backed). Services contain database operations; page components contain UI.
- Product records, variant pricing, inventory, specifications, categories, and hero presentation metadata load from Supabase. A separate explicitly labelled local asset-preview manifest supports visual QA before database setup; purchasing is disabled in preview. It is never substituted for an unavailable configured live catalog.
- Supabase Auth owns passwords; profiles contain display name/theme. Admin authorization comes from a private role table and SQL is_admin(), never editable profile metadata.
- PostgreSQL relational UUID tables, RLS, ownership checks, unique cart/variant pairs, fixed-precision INR prices, constrained inventory. Cart mutation RPC locks inventory. Demo checkout RPC locks cart/variants, computes prices server-side, uses idempotency UUID, inserts order/items/history, decrements stock, and clears cart in one transaction. Status changes use an admin-only RPC and cancellation restocks once.
- Storage public product-images bucket; administrator-only mutation. Local paths supported until asset upload.
- Gemini shopping-assistant Edge Function validates auth via getUser, uses caller-scoped queries/RLS, constrained catalog and own-order context, database rate-limit counters, request/time/output limits, and server-only API key. Model selection verified against the configured account rather than guessed.
- Vercel static frontend with SPA rewrites; Supabase migrations, Storage and Edge Function deploy separately.

## Milestones and acceptance checks
1. Foundation: package setup, routing, theme, asset inventory, shared buttons/dialogs, error boundaries. Acceptance: production build.
2. Cinematic storefront: oversized typography/imagery, grid, three product backgrounds, vertical swatches, thumbnails, directional transitions, responsive arrangement, reduced motion. Acceptance: all nine variants, product reset, desktop/mobile, no console failures.
3. Backend: migrations/seed/storage, auth/login/signup/reset, RLS. Acceptance: reachable Auth/API; apply migrations only with real authorized project credentials; verify catalog and policies. If management access is unavailable, deliver runnable migration and explicit setup instructions.
4. Shopping: catalog/detail/search, persistent cart, transaction checkout, addresses/profile, order history/timeline. Acceptance: frontend build and database integration/security checks when project access is available.
5. Assistant: secure function/chat, live catalog and own orders, quotas/timeouts. Acceptance: verify available Gemini model and inference separately from deployment; deployed function end-to-end verification requires Supabase deployment access.
6. Admin and release: product/variant editing, stock/order controls, tests of important pure interactions and SQL transactions/RLS, mobile/browser QA, production build and deployment guide. Do not claim production readiness or deployment without these checks.

## External configuration
Existing .env.local uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Vite configuration will expose only these two explicit legacy public aliases, alongside preferred VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY. Never use a broad NEXT_PUBLIC or secret env prefix. Existing supabase/.env.local contains GEMINI_API_KEY; never copy it into frontend files.
Required: Supabase project management access (CLI access token or database connection) to apply migrations, seed and deploy the function; public URL/key for frontend; Auth site/redirect URLs, email confirmation and production SMTP; first admin UUID assigned by an owner; storage upload by service credential or admin session; server-side GEMINI_API_KEY, optional GEMINI_MODEL and ALLOWED_ORIGIN; Vercel project and frontend public environment values. Real payments and courier integration are outside the requested demo scope.
