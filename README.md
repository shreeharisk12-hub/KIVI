# KIVI — Find your frequency

React/JavaScript headphone storefront with a cinematic, responsive hero and a real Supabase commerce architecture. No real payments or courier shipments.

## Live Demo

**[Open the KIVI Vercel demo](https://kivi-eight.vercel.app)**

[Browse the public preview without signing in](https://kivi-eight.vercel.app/preview). The main storefront uses Supabase sign-in for account, cart, checkout, and order features. Payments and shipping are demonstrations; no real money is collected.

## Steps to Run / Install the Project

### 1. Install the prerequisites

- [Node.js](https://nodejs.org/) **24.x**, with npm included.
- [Git](https://git-scm.com/) to clone the repository, or download and extract its ZIP from GitHub.
- A Supabase project URL and public publishable key for authenticated store features. A new backend also needs the migrations and catalog setup described below.

### 2. Clone the project

```sh
git clone https://github.com/shreeharisk12-hub/KIVI.git
cd KIVI
```

If you downloaded the ZIP, open a terminal in the extracted project folder instead.

### 3. Install dependencies

```sh
npm ci
```

This installs the dependencies recorded in `package-lock.json`.

### 4. Configure the environment

Copy `.env.example` to `.env.local`:

```sh
# macOS / Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Replace the placeholder values with your Supabase project's public configuration:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

The asset preview at `/preview` works without a configured backend; sign-in, cart, checkout, orders, and administration need a configured Supabase project. For a new project, follow [Set up the real Supabase backend](#set-up-the-real-supabase-backend) before using those features. Keep `.env.local` private; it is excluded from Git. Restart the development server after changing environment values.

### 5. Start the development server

```sh
npm run dev
```

Open **[http://127.0.0.1:5173/preview](http://127.0.0.1:5173/preview)** for the public asset preview, or **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** for the authenticated store. Unauthenticated store visitors are redirected to `/auth`. Password recovery links open `/reset-password`.

### 6. Build and preview the production version

```sh
npm run build
npm run preview
```

The build is written to `dist/`. Open the local URL printed by the preview command (normally `http://127.0.0.1:4173`).

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 5173. |
| `npm run build` | Generate the production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the existing transaction, security, assistant, and interaction tests. |
| `npm run verify:assets` | Verify the supplied product images and their hashes. |
| `npm run backend:check` | Check configured backend connectivity; includes one small Gemini request and requires server-side configuration. |
| `npm run assets:upload` | Upload product images to Supabase Storage using a server-only service credential. |

## Current verified status

The connected KIVI project (`skinwceyovjaipqvmvmi`) now has all five migrations, three products, nine variants, RLS policies, transactional checkout with saved demo payment methods, account wishlists, and the `product-images` bucket. Public Auth and catalog APIs return HTTP 200. The `shopping-assistant` Edge Function is deployed. Hosted SQL verification passed cart, wishlist, address, checkout, inventory, idempotency, tracking, administrator authorization, and account isolation; temporary security-test changes were rolled back. A requested demo admin account has verified real password login and server-enforced admin access. Three authenticated demo orders are retained to demonstrate persisted payment choices and tracking; see `docs/admin-demo-verification.json`. Demo UPI tracking reaches Shipped; card and cash-on-delivery examples are Cancelled. No money was collected.

The existing local Gemini key lists models and successfully generates text with `gemini-3.5-flash-lite` (HTTP 200). **The plugin cannot configure Edge Function secrets**, so `GEMINI_API_KEY` still needs to be set in the hosted function environment. Auth email delivery/redirects, browser checkout submission, and image Storage uploads remain unverified. The earlier localhost browser check was denied; the deployed Vercel site now passes browser password login, session persistence, administrator access and saved tracking/payment display. Do not interpret deployment as a verified end-to-end Gemini connection. Supplied image copies are hosted on Vercel until an administrator uploads them to Storage.

The app uses existing NEXT_PUBLIC Supabase public configuration via two explicit Vite aliases. Prefer the VITE variables below for new environments. Existing environment files and original assets are preserved.

## Configuration

Frontend `.env.local` (see `.env.example`):

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

A legacy `VITE_SUPABASE_ANON_KEY` is also accepted. Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are recognized explicitly. Only these public values enter the browser bundle. Restart Vite after environment changes. Never put Gemini, database passwords, service-role, or secret keys in a VITE variable.

## Set up the real Supabase backend

Use your actual project owner/developer CLI login and database password. A publishable key can read APIs and authenticate; it cannot install schema migrations or deploy Edge Functions.

The migrations listed in `supabase/migrations` match the versions applied through the Supabase plugin. The following commands support future deployments or a fresh environment; do not reinitialize or reset the hosted KIVI project.

1. Authenticate and select your existing project:

```sh
npx supabase login
npx supabase link
npx supabase db push --dry-run
```

2. For this fresh demo/development project, apply migrations and its demo catalog:

```sh
npx supabase db push --include-seed
```

The five migrations create ten public tables, a private administrator-role table and AI quota counters, constraints, RLS, RPCs, signup triggers, saved demo payment methods, and the public `product-images` bucket. `supabase/seed.sql` inserts three products and nine variants idempotently without overwriting existing catalog records. Do not reset an existing remote database. For an established production project, review/apply migrations normally and deliberately insert the initial catalog rather than reseeding production.

3. Configure Supabase Auth site URL and redirect allowlist. Set the Site URL to `http://127.0.0.1:5173`. Allow `http://127.0.0.1:5173/`, `http://127.0.0.1:5173/auth**` (including sign-in continuation queries), and `http://127.0.0.1:5173/reset-password`. Add the equivalent exact production URLs after Vercel deployment. Enable email confirmation and configure production SMTP. Registration, password recovery, session persistence, and logout use Supabase Auth directly.

4. Register/confirm the intended administrator account. In an owner-authorized SQL session, assign its **actual auth.users UUID**:

```sql
insert into app_private.user_roles(user_id, role)
values ('ACTUAL-ADMIN-USER-UUID'::uuid, 'admin')
on conflict(user_id) do nothing;
```

No frontend field, signup metadata, or editable profile property grants admin access. Users cannot read or mutate private role assignments. SQL `is_admin()` governs catalog edits, storage writes, and status updates.

5. Upload the assets using a server-only Supabase service credential in your shell environment. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` securely, then run:

```sh
npm run assets:upload
```

The script uploads **byte-identical copies** to `product-images/{product}/{variant}.png` and updates each variant's `image_source` to `storage`. Local images work until this step. Avoid placing the service credential in frontend `.env.local`; remove it from your shell after use. A signed-in administrator can use **Upload the nine project images** in `/admin`; this uploads the existing copies under Storage RLS and changes the corresponding database image sources. Individual variant forms also support an optional file upload.

6. Create server-only function secrets in `supabase/.env.local` (the existing Gemini key is already there):

```dotenv
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.5-flash-lite
ALLOWED_ORIGIN=http://127.0.0.1:5173
```

Set `ALLOWED_ORIGIN` to the exact frontend origin in production. Keep the key server-side. Deploy:

```sh
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy shopping-assistant
```

`verify_jwt=false` is intentional: the handler explicitly validates the bearer JWT using Supabase Auth `getUser()` before touching catalog, orders, quotas, or Gemini. All database queries use that authenticated user's RLS context, and order queries additionally filter the user's ID. The function does not use a service-role key. CORS only allows the configured origin. Limits: 1,500 characters/message, 12 messages, 16 KB request, 10 requests/minute/user, 200/day/user, 20-second Gemini timeout, bounded output. Model access was verified for this key; free-tier quota remains account-dependent.

7. Verify integration with two separate accounts: confirm signup/login/recovery, cart persistence, address CRUD, price/stock revalidation, double-submit behavior, own order visibility, and admin status progression. Verify direct API attempts cannot access another user's data or modify catalog/order totals. The embedded PostgreSQL tests cover these database properties locally, and a rollback-only hosted SQL verification also passed. Signed-in browser and email lifecycle checks still require a confirmed account.

## Architecture and decisions

- `src/pages`: home, auth, catalog, detail, cart, checkout, orders/tracking, account, admin.
- `src/components`: navigation, shared UI/dialogs, search, chatbot. Dialogs use native modal focus trapping and Escape handling.
- `src/contexts`, `src/hooks`, `src/lib`: auth/theme/store providers, shared hooks, Supabase client, utilities. Preferences follow the system by default and persist on this device; account preferences save to the profile.
- `src/services/store.js`: live Supabase queries and mutations. No fake backend or successful frontend-only checkout.
- `supabase/migrations`: PostgreSQL/RLS and storage policies. `supabase/seed`: the catalog source; `scripts/generate-seed.mjs` regenerates `seed.sql` after deliberate catalog-source changes.
- `supabase/functions/shopping-assistant`: Gemini routing and catalog selection, strict ID validation, database-fact response rendering, deterministic own-order tracking. Gemini cannot author prices, stock, specifications, or order statuses. No unrestricted SQL tools are provided.
- Cart mutations and checkout share a user-scoped transaction lock. Checkout locks variant rows in stable order, computes all INR prices and shipping on the server (₹199 below ₹20,000; otherwise ₹0), snapshots order facts, reserves stock, clears the purchased cart, and inserts status history atomically. Per-user idempotency keys protect retries. Cart reservation begins only at checkout.
- Admin tracking advances one status at a time; cancellation restocks exactly once. Delivered/cancelled orders are final.
- Account wishlists use Supabase with owner-only access and one row per product. Only the explicitly labeled preview wishlist is device-local. Authentication, cart, addresses, orders and profiles use Supabase.

## Asset inspection

All nine PNGs are 2048 × 2048 RGBA, but **none has a transparent background**: alpha is 255 throughout. `docs/assets.json` records paths, dimensions, transparency, and original SHA-256 hashes. The original folders are untouched. Application copies preserve their hashes. A display-only SVG filter removes near-white backgrounds in hero scenes. Light cards/detail views show the supplied imagery unchanged; no replacement images were generated. Filter treatment can leave subtle bright edges and affect near-white highlights; original imagery remains available in product detail views.

| Product         | Exact original images                                      | Size (each) | Transparency |
| --------------- | ---------------------------------------------------------- | ----------- | ------------ |
| Sony WH-1000XM6 | Matte Black.png, Midnight Blue.png, Pearl White.png        | 2048 × 2048 | Fully opaque |
| AETHER X1       | Arctic.png, Crimson.png, Obsidian.png                      | 2048 × 2048 | Fully opaque |
| VINTAGE ONE     | Heritage Gold.png, Midnight Silver.png, Vintage Copper.png | 2048 × 2048 | Fully opaque |

All prices are explicitly demo catalog prices. AETHER X1/VINTAGE ONE specifications are fictional demo data. Sony records make no invented manufacturer specification or official-asset claim.

## Vercel deployment

Live production site: **[KIVI demo](https://kivi-eight.vercel.app)**. The project is linked to `shreeharisk12-6561s-projects/kivi` and deployed with Vite, Node 24.x, `npm ci`, `npm run build`, and output `dist`. Only the public Supabase URL/key are saved in Vercel. The SPA rewrite supports direct product, admin and order links. All nine supplied images are included unchanged. Live password login, administrator access and order tracking passed browser checks. See [the deployment guide](docs/VERCEL_DEPLOYMENT.md) for pending Supabase email redirect and AI settings, evidence and future deployments.

## Validation and remaining work

See `docs/VERIFICATION.md` for checks and limitations, and `docs/IMPLEMENTATION_PLAN.md` for the preimplementation plan. Before production use, complete hosted integration tests, verify email delivery and redirects, load/concurrency tests, backups/monitoring, and a deployment-domain review. Real payments and courier integrations were intentionally excluded from the requested demo version.

References: [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Supabase auth in Edge Functions](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [Gemini models](https://ai.google.dev/gemini-api/docs/models), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).
