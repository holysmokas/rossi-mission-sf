# Rossi Mission SF — Architecture

> A solo-maintained e-commerce site for Sahar's Mission District gallery.
> Migrated from Supabase to a fully Cloudflare-native stack in May 2026.

---

## TL;DR

- **Frontend**: React (Vite) → Cloudflare Pages
- **API**: Cloudflare Pages Functions (file-based routing under `functions/`)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Media**: Cloudflare R2 (proxied through Pages at `/media/*`)
- **Payments**: Square Hosted Checkout (Payment Links API + webhooks)
- **Admin auth**: Custom JWT + PBKDF2 password hashing (no Cloudflare Access)
- **DNS**: Wix-locked (nameservers cannot be migrated); apex uses GitHub Pages meta-refresh redirect to www

There is no Supabase, no Firebase, no Vercel, no Render. Everything runs on Cloudflare except DNS (Wix) and payments (Square).

---

## Why this stack

The previous Supabase setup hit a bandwidth wall on the free tier. Cloudflare's free quotas are dramatically more generous for static-heavy traffic, and the proximity of D1 + R2 + Pages Functions in a single deploy keeps latency low.

Wix nameservers are locked to `ns0/ns1.wixdns.net`, so a custom R2 domain is impractical. Instead, R2 objects are proxied through the Pages app at same-origin `/media/*` URLs. No CORS, edge-cached.

---

## Directory layout

```
rossi-mission-sf/
├── src/                          # React app (Vite)
│   ├── lib/supabase.js          # API shim — keeps old supabase.* call sites working
│   ├── admin/                    # Admin UI (auth-gated)
│   │   ├── AdminLogin.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminAccount.jsx
│   │   ├── AdminGallery.jsx
│   │   ├── AdminShowcase.jsx
│   │   ├── AdminOrders.jsx
│   │   ├── AdminRoute.jsx
│   │   ├── ProductForm.jsx
│   │   ├── BulkUpload.jsx
│   │   └── Admin.css
│   ├── components/CartDrawer.jsx
│   └── pages/                    # Public pages incl. OrderSuccess.jsx
│
├── functions/                    # Cloudflare Pages Functions
│   ├── _middleware.js           # Root: CORS for /api/*, error trap
│   ├── _lib/                    # Shared helpers (NOT exposed as routes)
│   │   ├── auth.js              # PBKDF2 + JWT
│   │   └── admin-tables.js      # Table metadata, encode/decode helpers
│   │
│   ├── media/
│   │   └── [[path]].js          # GET /media/* → proxies R2 (rossi-media bucket)
│   │
│   └── api/
│       ├── products.js
│       ├── gallery_images.js
│       ├── showcase_images.js
│       ├── newsletter.js
│       ├── contact_messages.js
│       ├── checkout.js          # Cart → Square Payment Link
│       ├── orders/[id].js       # Order status poll for /order/success
│       ├── webhooks/square.js   # Square webhook: atomic order claim, inventory decrement
│       └── admin/               # All routes here require JWT cookie (see _middleware.js)
│           ├── _middleware.js   # Verifies admin_session cookie
│           ├── login.js
│           ├── logout.js
│           ├── me.js
│           ├── account.js       # Profile / email / password updates
│           ├── upload.js        # R2 upload + delete
│           ├── [table].js       # CRUD: list (GET) + insert (POST)
│           └── [table]/[id].js  # CRUD: get/update/delete by id
│
├── wrangler.toml                 # Binding config: DB, MEDIA, vars
├── schema.sql                    # Initial D1 schema
└── admin_users.sql               # Admin auth table (added Phase 3a)
```

### Why some directories use underscore prefixes

Cloudflare Pages excludes files/directories beginning with `_` from routing. So `functions/_lib/` is importable from other functions but is NOT itself a route. Same for `_middleware.js` (which is special: it runs before sibling/descendant route handlers).

### Why bracket-named directories exist

Pages Functions uses `[param]` for dynamic single-segment routes and `[[catchall]]` for multi-segment. The literal directory names `[table]` and `[id]` are intentional — they get matched against URL segments at request time. When using `cp` / `mv` / `git add` on these paths in zsh, single-quote them so the shell doesn't try to glob the brackets.

---

## Routing

### Public routes

| Path | Handler | Notes |
|---|---|---|
| `/` and SPA paths | static `dist/index.html` | React Router takes over client-side |
| `/media/<key>` | `functions/media/[[path]].js` | R2 proxy, edge-cached, immutable |
| `/api/products` | `functions/api/products.js` | Filtered to `active=true` by default |
| `/api/gallery_images` | `functions/api/gallery_images.js` | |
| `/api/showcase_images` | `functions/api/showcase_images.js` | |
| `/api/newsletter` | `functions/api/newsletter.js` | POST only |
| `/api/contact_messages` | `functions/api/contact_messages.js` | POST only |
| `/api/checkout` | `functions/api/checkout.js` | Cart → Square Payment Link |
| `/api/orders/<id>` | `functions/api/orders/[id].js` | Status poll for success page |
| `/api/webhooks/square` | `functions/api/webhooks/square.js` | Square calls this when a payment processes |
| `/order/success` | client-side React route | Polls `/api/orders/<id>` for status |

### Admin routes (JWT-gated)

The middleware at `functions/api/admin/_middleware.js` checks for a valid `admin_session` cookie on every `/api/admin/*` request except `/api/admin/login`. Without a valid JWT, returns 401 JSON.

| Path | Method | Purpose |
|---|---|---|
| `/api/admin/login` | POST | email + password → JWT cookie (24h) |
| `/api/admin/logout` | POST | clears the cookie |
| `/api/admin/me` | GET | current user + metadata (full_name, phone) |
| `/api/admin/account` | PUT | update email, password, or profile metadata |
| `/api/admin/upload` | POST / DELETE | multipart upload to R2 / remove from R2 |
| `/api/admin/<table>` | GET / POST | list rows / insert row |
| `/api/admin/<table>/<id>` | GET / PATCH / DELETE | single-row CRUD |

The dynamic `[table]` is whitelisted in `functions/_lib/admin-tables.js`:
```
products, gallery_images, showcase_images, inventory_log, orders
```

Anything outside this whitelist returns 404.

---

## The shim (`src/lib/supabase.js`)

This file is the bridge that lets old call-site code (`supabase.from(...)`, `supabase.auth.*`, `supabase.storage.from(...)`) keep working unchanged after dropping the Supabase client.

It detects admin context by inspecting `window.location.pathname`. If the calling page is under `/admin/*`, all `from()` calls route through `/api/admin/<table>` with `credentials: 'include'`. Otherwise they go to the public `/api/<table>` endpoints.

### Quirks worth knowing

- `supabase.from(t).update(x).eq('id', y)` → `PATCH /api/admin/<t>/<y>` with body `x`. The shim requires an `id` filter for update/delete.
- `supabase.from(t).insert(x).select()` — the `.select()` chain is ignored; inserted row always comes back in `data`.
- `supabase.storage.from(b).getPublicUrl(p)` returns `${window.location.origin}/media/<b>/<p>` — an **absolute** URL. (Was relative initially; broke HTML5 `<input type="url">` validation in product form. Don't change this back.)
- `supabase.auth.onAuthStateChange(cb)` is implemented with an in-memory listener set, not real polling. It fires on login/logout from any tab on the same window, but won't fire if the cookie expires server-side between actions.

---

## Database (D1)

D1 is SQLite at the edge. The schema mirrors the original Postgres tables 1:1 with three conventions:

1. **Booleans → INTEGER** (0 or 1). The shim's `encodeRow` / `decodeRow` handle conversion automatically.
2. **Arrays → TEXT** holding a JSON-encoded array. Same shim handles conversion. The `images`, `tags`, and `sizes` columns on `products` use this.
3. **Timestamps → INTEGER** holding a Unix epoch in seconds (not milliseconds). Defaults use `unixepoch()`.

### Tables

| Table | PK | Notes |
|---|---|---|
| `products` | TEXT (slug) | `images` / `tags` / `sizes` are JSON arrays. `active` / `featured` are 0/1. |
| `orders` | TEXT (uuid) | `items` and `shipping_address` are JSON. `notified` is the atomic-claim flag for webhook dedup. |
| `inventory_log` | INTEGER auto | Audit trail for stock changes (sale, restock, adjustment, initial). |
| `gallery_images` | INTEGER auto | `sort_order` controls display order. |
| `showcase_images` | INTEGER auto | Same shape as gallery_images. |
| `contact_messages` | INTEGER auto | Public contact form submissions. |
| `newsletter` | INTEGER auto | Email + source. UNIQUE constraint on email. |
| `admin_users` | TEXT (uuid) | `password_hash` is `pbkdf2$iterations$salt$hash`. |

### Common D1 commands

```bash
npx wrangler d1 execute rossi --remote --command="SELECT * FROM products LIMIT 5"
npx wrangler d1 execute rossi --remote --file=migration.sql
```

D1 rejects `BEGIN` / `COMMIT` statements in `.sql` files — strip them before applying:
```bash
sed -i '' -E '/^(BEGIN|COMMIT);$/d' migration.sql
```

---

## Storage (R2)

The `rossi-media` bucket is bound as `env.MEDIA` in `wrangler.toml`. It has three top-level folders:

- `product-images/<category>/<filename>` — uploaded via admin product form
- `gallery/<filename>` — uploaded via admin gallery page
- `showcase/<filename>` — uploaded via admin showcase page

The media handler at `functions/media/[[path]].js` proxies R2 objects with:
- `Cache-Control: public, max-age=31536000, immutable` (file content is addressed by random filename, so safe to cache forever)
- Conditional `If-None-Match` support → returns 304 when client cache is fresh
- Returns 404 when the object doesn't exist

**Important**: the handler only exports `onRequestGet`. HEAD requests fall through to the SPA fallback (returning 200 + `text/html`). When debugging from curl, always use `-i` (GET) not `-I` (HEAD) on `/media/*` paths.

---

## Authentication

Single admin user, JWT-based session, PBKDF2 password hashing. No password reset flow — if Sahar gets locked out, regenerate the hash and update the row directly.

### Generate a new password hash

```bash
cd /tmp && cat > hash.mjs <<'EOF'
const crypto = await import('node:crypto')
const password = process.argv[2] || 'changeme'
const salt = crypto.randomBytes(16)
const key = await crypto.webcrypto.subtle.importKey(
  'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
)
const bits = await crypto.webcrypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256
)
console.log(`pbkdf2$100000$${Buffer.from(salt).toString('base64')}$${Buffer.from(bits).toString('base64')}`)
EOF
node hash.mjs 'newPasswordHere'
```

Then:
```bash
npx wrangler d1 execute rossi --remote --command="UPDATE admin_users SET password_hash='<hash>' WHERE email='sahar@rossimissionsf.com'"
```

### JWT signing

`ADMIN_JWT_SECRET` is a Cloudflare Pages **encrypted** env var. HS256 over `{sub, email, iat, exp}`. 24-hour expiry. Cookie is `HttpOnly; Secure; SameSite=Lax; Path=/`.

Rotating the secret invalidates all existing sessions — anyone logged in will get 401 on next admin request and have to log in again.

---

## Checkout flow

```
Cart in localStorage
  └─ user clicks Checkout
      └─ POST /api/checkout { items, customer }
           └─ inserts orders row (status=pending, notified=0)
           └─ Square: creates Order + Payment Link
           └─ returns { url } → CartDrawer redirects to Square
              └─ user pays on Square Hosted Checkout
                 └─ Square sends webhook to /api/webhooks/square
                      └─ HMAC-SHA256 signature verify
                      └─ UPDATE orders SET notified=1 WHERE notified=0 ... RETURNING *
                           (atomic claim — handles 3s retry pattern)
                      └─ multi-source customer enrichment (payment.shipping → Order.fulfillments → Customer record)
                      └─ decrement products.quantity, write inventory_log
                      └─ returns 200 to Square
                 └─ user redirected to /order/success?order_id=<id>
                      └─ React page polls /api/orders/<id> until status=paid
```

### Square environment

The webhook subscription is **edited in place** — URL points at `https://www.rossimissionsf.com/api/webhooks/square`, signature key preserved from the original. Events: `payment.created` and `payment.updated`. If you rotate the signature key, update `SQUARE_WEBHOOK_SIGNATURE_KEY` in Pages env first, then the Square dashboard.

Emails are handled natively by Square (customer receipt + admin alert). Sahar enables these in Square Dashboard → Settings → Notifications. We do not send custom emails — Wix DNS made domain verification on Resend impractical.

---

## DNS topology

Wix nameservers are locked, so DNS records live in the Wix dashboard:

```
www.rossimissionsf.com   CNAME   rossi-mission-sf.pages.dev
rossimissionsf.com       A       185.199.108.153
rossimissionsf.com       A       185.199.109.153
rossimissionsf.com       A       185.199.110.153
rossimissionsf.com       A       185.199.111.153
```

The apex A records point at GitHub Pages, which serves an orphan branch named `apex-redirect`. That branch contains:
- `index.html` — meta-refresh + JS redirect to `https://www.rossimissionsf.com`
- `404.html` — same redirect but preserves the path
- `CNAME` — contains `rossimissionsf.com`

The orphan branch is decoupled from `main`; redeploying the Cloudflare site doesn't touch it.

---

## Environment variables

Set in Cloudflare Pages → Settings → Environment Variables (Production env).

### Plaintext

| Var | Value |
|---|---|
| `PUBLIC_MEDIA_BASE` | `/media` |
| `SQUARE_ENVIRONMENT` | `production` |

### Secrets (encrypted)

| Var | Source |
|---|---|
| `ADMIN_JWT_SECRET` | `openssl rand -hex 32` |
| `SQUARE_ACCESS_TOKEN` | Square Developer Dashboard |
| `SQUARE_LOCATION_ID` | Square Dashboard → Locations |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square Dashboard → Webhook Subscriptions |
| `ADMIN_EMAIL` | (currently unused — kept for future) |
| `FROM_EMAIL` | (currently unused) |
| `RESEND_API_KEY` | (currently unused — abandoned email path) |

### Bindings (in `wrangler.toml`)

```toml
[[d1_databases]]
binding = "DB"
database_name = "rossi"
database_id = "ee5bab58-2326-49e7-a5b6-4ff34884fb86"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "rossi-media"
```

---

## Common tasks

### Deploy

`git push origin main` triggers a Cloudflare Pages build. Watch progress at the Pages dashboard. Static assets land first, then Pages Functions compile. Typical end-to-end: 90–120 seconds.

If a push doesn't trigger a deploy (rare but happens), force one with:
```bash
git commit --allow-empty -m "Trigger redeploy" && git push origin main
```

### Roll back a deploy

Pages Dashboard → Deployments → click an older successful one → "Rollback to this deployment". Instant.

### Local development

```bash
npm install
npm run dev    # Vite dev server, but APIs proxy to production
```

For full local stack (Functions + D1 + R2 bindings):
```bash
npx wrangler pages dev . --d1=DB=<id> --r2=MEDIA=rossi-media
```

(Local D1 starts empty unless you replay migrations.)

### Add a product manually via SQL

Avoid — use the admin UI. But if you must:
```sql
INSERT INTO products (id, name, price, category, quantity, active, images, tags, sizes)
VALUES (
  'my-product-slug',
  'Product Name',
  29.99,
  'clothing',
  10,
  1,
  '["https://www.rossimissionsf.com/media/product-images/clothing/foo.jpg"]',
  '[]',
  '[]'
);
```

### Bulk D1 export (manual backup)

```bash
for t in products orders gallery_images showcase_images contact_messages newsletter inventory_log admin_users; do
  npx wrangler d1 execute rossi --remote --json --command="SELECT * FROM $t" > "backup-$t-$(date +%Y%m%d).json"
done
```

### R2 backup

There's no native bucket-copy CLI for R2 in wrangler 4.x. Use the Cloudflare dashboard's "Migrate from S3" inverse approach, or write a one-off Worker that lists + reads all objects and pushes to another bucket.

---

## Pitfalls / gotchas

These were all hit during the migration. Documented so future-you can recognize them quickly.

1. **sed surgery aftermath**. Multi-block `sed` deletions can leave files with unmatched braces. After any sed pass, `node --check <file>` everything you touched.

2. **Pages Functions silent build failures**. If any single function file has a syntax error, the **entire** Functions deploy fails and all `/api/*` and `/media/*` paths fall through to SPA fallback. Symptom: every API returns 200 with `content-type: text/html`. Check the deploy log for "Build failed with N errors".

3. **`_lib/` import paths**. Sub-routed functions importing from `../../_lib/` need the relative path to be exactly right. When in doubt, `grep -rn "_lib" functions/` to audit.

4. **HEAD vs GET on `/media/*`**. The media handler only handles GET. `curl -I` (HEAD) returns the SPA fallback (200 + text/html), which looks like the handler is broken. Always use `-i` (GET) for debugging.

5. **zsh history expansion**. `!` is special in interactive zsh — `node -e "console.log('hi!')"` will fail. Either escape it, use single quotes around the entire arg, or write a `.mjs` file.

6. **BSD sed quirks**. macOS sed (`/usr/bin/sed`) requires an empty argument after `-i`: `sed -i '' 's/foo/bar/' file`. GNU sed (Linux) doesn't.

7. **D1 and transactions**. D1 doesn't accept `BEGIN` / `COMMIT` in batch SQL files. Strip them before piping in.

8. **Wrangler R2 list isn't a thing**. `wrangler r2 object` only supports get/put/delete in v4. To list a bucket, use the dashboard.

9. **`<input type="url">` rejects relative paths**. If you ever revert `getPublicUrl` to return relative `/media/...`, the product form will silently block submissions before they fire.

10. **Bracket directories and zsh globbing**. `cp foo functions/api/admin/[table].js` will fail unless you quote: `cp foo 'functions/api/admin/[table].js'`.

11. **CSV-style sizes / tags input**. The product form takes comma-separated input and splits client-side. Trailing whitespace in tags can create silent duplicates ("`hoodies, hoodies `" becomes `["hoodies", "hoodies "]`).

12. **Admin context detection**. The shim decides between public and admin endpoints by checking `window.location.pathname.startsWith('/admin')`. If you ever add an admin page outside `/admin/*`, its DB calls will hit the public endpoints and 401 on writes. (You almost certainly won't, but if you do — that's why.)

---

## Things deliberately not done

- **No SSR**. Storefront is a SPA. Product pages are rendered client-side. SEO is acceptable for this scale; revisit only if Sahar grows or wants product pages indexed individually.
- **No CMS**. Admin UI is the CMS. Sahar is the only editor.
- **No email pipeline**. Square handles transactional emails. Wix DNS makes domain verification on Resend impractical. Don't try to bring this back without first migrating off Wix.
- **No multi-user admin**. Single shared account. The schema supports more users; the UI does not. Add a simple user management page if a second editor ever joins.
- **No image transforms**. R2 serves the original upload at whatever resolution the user uploaded. If page-weight ever matters, Cloudflare Images is the natural drop-in.

---

## Credits

Built by Babak "Dick" Milani at Milani Labs, May 2026.
Site design and content: Sahar Milani / Rossi Mission SF.
