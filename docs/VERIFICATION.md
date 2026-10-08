# KIVI verification — 8 October 2026

## Deployed and verified

- Supabase project matches the existing frontend URL: skinwceyovjaipqvmvmi (KIVI).
- Five migrations applied; local migration filenames match hosted migration history.
- Three demo products, nine variants, ten public tables, private admin roles and AI quota counters.
- Supabase Auth settings and public catalog REST return HTTP 200. Public REST returns all three products/nine variants; database keyword search for gaming returns AETHER X1. Anonymous cart, checkout and admin mutation APIs return HTTP 401.
- Real hosted PostgreSQL rollback-only verification: profile/cart signup trigger, wishlist uniqueness, cart combining, address creation, authoritative checkout price, inventory reservation, idempotent repeat order submission, cart clearing, history insertion, admin-only tracking, cancellation, cross-account isolation. No test account or order remains; inventory total restored to 180.
- Supabase Storage bucket and admin-only write policies exist.
- shopping-assistant function deployed (version 2) with custom bearer validation via Auth.getUser; anonymous requests rejected.
- Local Gemini credential can list and invoke gemini-3.5-flash-lite. Hosted secret setup is a separate outstanding step.

## Local automated checks

19 tests cover database ownership, forbidden catalog edits, fake order rejection, invalid inventory/address rejection, checkout snapshots/totals, rollback on insufficient stock, cancellation restocking once, storage authorization, AI quotas, private wishlists, atomic default finish changes, anonymous RPC privileges, safe sign-in continuation, nine asset paths, product navigation and color resets, and persisted demo payment methods. Production build succeeds. Asset hashes match the originals.

## Latest audit

The latest user-requested audit reran all 18 automated tests, production build and asset-integrity check successfully. All nine browser images loaded. Home, catalog, details and authentication layouts have no horizontal overflow at 390, 768 and 1440 pixels. A nonexistent-account login reached real Supabase and displayed Invalid login credentials. Search empty results and Escape closing worked; no uncaught browser errors were recorded. See `docs/browser-checks.json`.

The hosted rollback test also verified profile display name/theme updates, address editing/deletion, atomic administrator default-color changes and exact inventory restoration after cancellation. All ten public tables have RLS enabled.

Latest demo verification: one confirmed demo Auth account (`demo-admin@kivi.example`) has a server-enforced administrator role. Real Supabase password sign-in and `is_admin()` both succeeded. The password is not included in source or this report. Three deliberately retained demo orders belong to this account; Storage images remain local. See `admin-demo-verification.json` for order IDs and database results.

The hosted payment migration adds `payment_method` and `payment_status`. Checkout offers demo card, UPI and cash on delivery; every order is explicitly `not_collected`. No card number, UPI identifier or payment credential is collected. Each method was exercised through a real authenticated Supabase client, then independently checked through the SQL connector. Authoritative prices, stock changes, selected color, cart clearing, idempotency, forbidden paid-state updates and invalid payment rejection passed. Card/COD examples were cancelled and restored stock. UPI order `2c809578-a74a-4080-a489-92316824427e` retains one AETHER X1 Crimson at ₹15,189 including shipping, with Placed → Confirmed → Packed → Shipped history. Skipping directly from Shipped to Delivered was rejected.

All 19 tests, production build, asset hashes and hosted rollback security/commerce verification passed after the payment migration. The signed-in localhost browser check was denied. The subsequent Vercel deployment now passes live browser password login, session persistence after refresh, administrator access and saved payment/tracking display. Checkout submission itself remains API-tested rather than browser-tested. Earlier public-preview browser checks below remain valid. The assistant is deployed, but a hosted Gemini response remains unverified. No secret-setting capability is exposed by the connector.

Performance advisors report uncached auth checks in RLS, duplicate catalog SELECT policies and a missing changed_by foreign-key index; these are production tuning items, not failed commerce assertions. [RLS performance guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).

## Browser checks

- All nine hero color buttons display the corresponding supplied PNG.
- Product arrows wrap and reset to the new product's default available finish.
- VINTAGE ONE / Vintage Copper / quantity 2 / Buy now navigates to real sign-in with that selection preserved in the return URL.
- Product details fit a 390 × 844 mobile viewport without horizontal overflow; purchase controls captured in `docs/screenshots/product-controls.jpg`.
- Card color selection travels to product details through variant query parameters.
- Preview wishlist hearts save/remove; wishlist cards offer removal and View details.
- Menu, appearance toggle, search overlay/closing, catalog filters, product details, account sign-in links and bag sign-in links checked locally.

## Buttons and their destinations

| Control                                       | Action                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Menu / close                                  | Opens/closes modal navigation                                                           |
| Search                                        | Debounced Supabase catalog search; explicit local filter only in preview                |
| Swatches / arrows / thumbnails                | Change finish/product and imagery                                                       |
| Hero Buy now                                  | Adds current variant through cart RPC and opens checkout; preview leads through sign-in |
| Product Add to bag / Buy now                  | Saves selected variant and quantity to Supabase; Buy now opens demo checkout            |
| Heart / wishlist                              | Owner-only database wishlist; explicit preview saves on device                          |
| Bag quantity / remove / retry                 | Stock-validated cart RPC / removal / database refresh                                   |
| Place demo order                              | Server transaction; no real payment or shipment                                         |
| Orders / refresh                              | Own account history and current tracking from database                                  |
| Account save / address edit / delete / logout | Supabase profile/address/Auth operations                                                |
| Admin product / variant / inventory / status  | Server-authorized catalog writes and order RPC                                          |
| Admin image upload                            | Authenticated Supabase Storage upload; no original file changes                         |
| Ask KIVI / send                               | Authenticated Edge Function; hosted Gemini key needed for recommendations               |

## Remaining external configuration

1. Set GEMINI_API_KEY in the KIVI Edge Function Secrets dashboard, using the existing server-only local value. Never put it in VITE variables or source. The connector has no secret-setting API. CLI alternative: `npx supabase secrets set --project-ref skinwceyovjaipqvmvmi --env-file supabase/.env.local` after Supabase CLI login.
2. Confirm hosted Auth Site URL and redirect allowlist: http://127.0.0.1:5173, /auth** and /reset-password. A local config file does not update remote Auth settings.
3. Replace the explicitly requested demo administrator with intended production administrators before a production launch. The demo address uses the reserved `.example` domain and cannot receive recovery email.
4. Use the admin upload button to move all nine existing PNG copies into the created Storage bucket. The app currently uses original local copies.
5. Verify signed-in browser shopping, email confirmation/recovery and end-to-end Gemini responses. Authenticated API and SQL checks validate login and database behavior but do not prove email delivery or browser interactions.
6. Vercel production deployment is complete at https://kivi-eight.vercel.app. Live browser password sign-in, administrator access and persisted order/payment tracking now pass. Production email redirects and the Edge Function origin/key still need owner-dashboard configuration; see `VERCEL_DEPLOYMENT.md`. Custom domains were not requested.

Security advisor notes: private role/quota tables intentionally have no client policies. Guarded SECURITY DEFINER mutation RPCs are intentionally callable by authenticated users. The read-only is_admin helper remains callable by anon for catalog RLS and returns false without an identity. Hosted default direct anon grants were explicitly revoked on all mutation RPCs. [Supabase function permission advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

The latest security advisor also reports hosted Auth leaked-password protection disabled. Enable this account-dependent Supabase setting before a production launch; the newly generated demo password is strong and stored by Supabase as a bcrypt hash.
