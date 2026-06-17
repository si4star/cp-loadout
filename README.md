# CP Loadout — deploy notes

## Repo layout
```
cp-loadout/
├─ index.html            ← shop (root)
├─ success.html          ← Stripe return page, served at /success
├─ admin.html            ← order management (token-gated via the API)
├─ schema.sql            ← run once against the D1 database
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
| ADMIN_TOKEN            | a long random string — gates the admin endpoints            |
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

## Admin access
`admin.html` is a public page but every data call needs the `ADMIN_TOKEN`.
For belt-and-braces, put it behind **Cloudflare Access** (free, email-based) so
the page itself won't load for anyone but you.
