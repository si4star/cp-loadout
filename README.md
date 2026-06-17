# CP Loadout — deploy notes

## Repo layout
```
cp-loadout/
├─ index.html            ← shop (root)
├─ success.html          ← Stripe return page, served at /success
├─ admin.html            ← order management (Cloudflare Access)
├─ returns.html          ← /returns  — COMPLETE THE TEMPLATE
├─ privacy.html          ← /privacy  — COMPLETE THE TEMPLATE
├─ terms.html            ← /terms    — COMPLETE THE TEMPLATE
├─ favicon.svg           ← CP coin icon
├─ og.jpg                ← social share image (1200×630)
├─ _headers              ← security headers
├─ wrangler.toml         ← Pages config + D1 binding
├─ schema.sql            ← run once against the D1 database
├─ README.md
└─ functions/
   └─ api/
      ├─ _lib.js         ← shared helpers (auth, Stripe, Resend)
      ├─ checkout.js     ← /api/checkout   (creates the Stripe session)
      ├─ webhook.js      ← /api/webhook    (stores order, sends emails)
      ├─ orders.js       ← /api/orders     (admin: list)
      ├─ export.js       ← /api/export     (admin: CSV)
      ├─ refund.js       ← /api/refund     (admin: cancel & refund)
      ├─ dispatch.js     ← /api/dispatch   (admin: mark sent + email)
      └─ config.js       ← /api/config     (optional: publishable key)
```

## Before launch
- **Complete the legal templates** (returns/privacy/terms): fill every `[bracket]`
  and have them reviewed. Don't ship them with placeholders.
- Decide the **made-to-order returns** wording (see returns.html note).
- Put your `pk_…` into `CONFIG.STRIPE_PUBLISHABLE_KEY` in index.html.

## D1
Create a NEW database (don't share the Comic Stencils one):
```
wrangler d1 create cp-loadout-db
wrangler d1 execute cp-loadout-db --file=./schema.sql --remote
```
Bind it to the Pages project with the binding name **DB**.

## Environment variables (Pages → Settings → Variables)
| Name                   | What                                                        |
|------------------------|-------------------------------------------------------------|
| STRIPE_SECRET_KEY      | sk_live_… (or sk_test_… while testing)                      |
| STRIPE_WEBHOOK_SECRET  | whsec_… for the **cploadout.com** webhook endpoint (its own)|
| SITE_URL               | https://cploadout.com                                       |
| RESEND_API_KEY         | re_… (verify cploadout.com as a sender in Resend first)     |
| FROM_EMAIL             | orders@cploadout.com                                        |
| ADMIN_EMAIL            | where new-order alerts go (your inbox)                      |
| CF_ACCESS_TEAM_DOMAIN  | yourteam.cloudflareaccess.com (Zero Trust team domain)      |
| CF_ACCESS_AUD          | the Access application's Audience (AUD) tag                 |
| STRIPE_PUBLISHABLE_KEY | only if you use /api/config instead of hardcoding pk_       |

## Email (Resend)
1. Verify **cploadout.com** as a sending domain in Resend (add their DKIM/SPF
   records to the zone) — don't reuse the comicstencils.com verification, or
   "from" reads @comicstencils.com.
2. Set `RESEND_API_KEY` and send `FROM_EMAIL` on the verified domain
   (e.g. `orders@cploadout.com`).
Resend's free tier comfortably covers launch volume.

## Reconciling with Comic Stencils
This is built fresh, not copied, so check these match (or adjust):
- **Env var names** above — if stencils used different names, rename here or add duplicates.
- **D1 binding name** is `DB`. If stencils uses another name, change it in the bindings.
- **Webhook secret is per-endpoint** — the cploadout.com endpoint has its own `whsec_`, not the stencils one.
- **Resend sender** must be the cploadout.com domain, or "from" reads @comicstencils.com.

## Admin access (Cloudflare Access)
The admin page and its API are gated by Cloudflare Access — you log in with
your email, no password to manage. The functions also verify the Access login
token, so the endpoints stay protected even on the raw `*.pages.dev` URL.

Setup (Zero Trust → Access → Applications → Add a self-hosted application):
1. **App 1 — the page:** domain `cploadout.com`, path `/admin*`.
2. **App 2 — the API:** domain `cploadout.com`, path `/api/orders*` (repeat /
   add for `/api/export`, `/api/refund`, `/api/dispatch`). This blocks
   unauthenticated calls at the edge. Leave `/api/checkout`, `/api/webhook`,
   `/api/config` **unprotected** — those are public / hit by Stripe.
3. **Policy** (on each app): Action *Allow*, include *Emails* →
   `hello@cploadout.com` (login via one-time PIN, or add Google).
4. Copy each app's **Application Audience (AUD)** tag and your **team domain**
   (`yourteam.cloudflareaccess.com`); set `CF_ACCESS_AUD` and
   `CF_ACCESS_TEAM_DOMAIN`. (Use App 1's AUD — the cookie from logging in there
   is what the functions verify.)
5. Optionally also protect the project's `*.pages.dev` URL with the same policy
   so the preview domain can't be browsed.

There is no admin password or token to set — remove any `ADMIN_TOKEN` you had.
