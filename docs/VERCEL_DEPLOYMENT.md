# KIVI on Vercel

Production: https://kivi-eight.vercel.app

Admin: https://kivi-eight.vercel.app/admin

Public asset preview: https://kivi-eight.vercel.app/preview

Vercel dashboard: https://vercel.com/shreeharisk12-6561s-projects/kivi

Deployed to the signed-in account's `kivi` project on 8 October 2026. This is an account-owned production deployment, not a temporary deployment. The existing demo administrator credentials still work; passwords are not stored in this guide.

## Verified

- Vercel's remote install and production build succeeded.
- Local verification under Node 24.21.0: 19 tests and production build passed.
- Seven direct application routes return the SPA, including `/products/aether-x1`, `/admin` and order tracking.
- All nine hosted PNGs return HTTP 200 and match the original image hashes.
- Real browser sign-in to Supabase succeeded from the production website; administrator catalog and all three saved orders loaded.
- UPI tracking shows Placed, Confirmed, Packed and Shipped, with the saved method and ₹15,189 total.
- Vercel stores only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in production, preview and development. No Gemini or Supabase service credential was uploaded.
- The upload plan excluded `.env.local`, server secrets, backend files, reports and duplicate original image folders. Byte-identical public copies are included.

Evidence: `vercel-verification.json`, `screenshots/vercel-live.jpg`, `screenshots/vercel-tracking.jpg`.

## Complete production Supabase settings

The database and password login are working. Owner-dashboard settings below are still pending; the connected database tools do not provide Auth configuration or Edge Function secret editing, and the dashboard requires owner sign-in.

1. Open [Auth URL Configuration](https://supabase.com/dashboard/project/skinwceyovjaipqvmvmi/auth/url-configuration). Set Site URL to `https://kivi-eight.vercel.app`. Preserve existing local-development redirect entries and add these exact production entries:

   - `https://kivi-eight.vercel.app/`
   - `https://kivi-eight.vercel.app/auth**`
   - `https://kivi-eight.vercel.app/reset-password`

   Then verify confirmation and recovery using an email address that can receive mail. The dummy `.example` admin email cannot receive email. A local `supabase/config.toml` does not update the hosted configuration. [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls).

2. In the KIVI project's Edge Function Secrets, set the existing server-only `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, and `ALLOWED_ORIGIN=https://kivi-eight.vercel.app`. Never put the Gemini key in Vercel's frontend variables. Verify a signed-in assistant reply after configuration. The current function accepts the configured origin; hosting the frontend alone does not update this setting.

3. Image Storage upload remains optional for this deployed demo: the nine provided local copies are already hosted on Vercel. The existing admin upload button can copy them to the restricted Supabase Storage bucket without changing the originals.

## Publish later changes

Run from the KIVI directory with this Vercel account signed in:

```sh
npx vercel deploy --prod
```

The local `.vercel/project.json` links this directory to the deployed project. Vercel rebuilds using its saved public Supabase variables. A Git repository is not required for this deployment; automatic deployments on Git pushes require connecting a repository separately.

Build configuration: Vite, Node 24.x, `npm ci`, `npm run build`, output `dist`. Product and account deep links use Vercel's documented SPA rewrite. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
