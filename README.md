# Outlet Lounge — homepage

Homepage for the Outlet Lounge sneaker shop in the **Flight Path** style: oversized type, the logo's gold arrow driving the motion (scroll-progress line, swoosh, add-to-cart arc), a sideways-scrolling New Drops section and velocity-reactive brand ribbons.

- Light and dark mode
- English / Русский / O‘zbek, prices in UZS
- Working cart drawer (front-end only)

Live: <https://outlet-lounge.vercel.app>

## Run locally

Plain HTML/CSS/JS, no build step. The dev server behaves like production (clean URLs such as
`/shop` and `/product/<slug>` all serve the same shell; `/api/catalog` runs the real handler):

```bash
npm run dev          # http://localhost:5173
```

It reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` from a git-ignored `.env.local`; without them the
page uses its built-in placeholder catalog (`OL.STATIC_PRODUCTS` in `assets/js/data.js`).

## Pages

| URL | What |
|---|---|
| `/` | Home |
| `/shop` | All sneakers — filters, sort, search (`?q=`), URL-synced state |
| `/new` `/sale` `/men` `/women` `/kids` `/brands/<brand>` | Pre-filtered catalog |
| `/product/<slug>` | Product page: gallery + zoom, sizes (EU/US/cm), size guide, related, recently viewed |
| `/wishlist` | Saved items |
| `/cart` `/checkout` `/order/success` | Cart page, checkout (no account), thank-you page |
| `/delivery` `/returns` `/size-guide` `/authenticity` `/about` `/contacts` `/faq` `/offer` `/privacy` | Information and legal pages (RU / UZ / EN; prices and details come from the admin settings) |
| anything else | 404 |
| `/admin` … | Staff panel (not indexed): overview, orders, products, stock, promo codes, reports, settings, staff, activity — see "Admin panel" below |

All of them are one HTML shell (`index.html`); `vercel.json` rewrites every non-file path to it and
`assets/js/router.js` picks the page.

## Structure

```
index.html                 page shell (header + mega-menu, drawers, search, loader, theme curtain)
api/catalog.js             GET /api/catalog — live products + public settings from Supabase
api/quote.js               POST /api/quote — cart totals/promo from the database (never changes stock)
api/order.js               POST /api/order — checkout, quick order, notify-me → database + Telegram
api/telegram.js            POST /api/telegram — bot webhook (order status buttons, /id)
api/page.js                product / collection / brand / info pages with their own title, description, Open Graph and JSON-LD
api/sitemap.js, robots.js  /sitemap.xml and /robots.txt (follow SITE_URL and the "index the shop" switch)
api/admin-config.js        GET /api/admin-config — public Supabase URL + anon key for the admin panel
api/admin-order-status.js  POST — staff changes an order status; the Telegram message is updated too
api/admin-setup.js         first-run owner creation (code via the managers' Telegram group)
api/admin-staff.js         owner adds staff / resets passwords / changes roles (needs the service key)
api/admin-telegram.js      owner sends a test message to the managers' chat
api/_lib/                  validation, Telegram message format, Supabase/Telegram clients
assets/css/base.css        theme tokens, shared components, phone card layout
assets/css/home.css        homepage      shop.css  catalog + 404      product.css  product page
assets/js/data.js          placeholder catalog + settings, EN/RU/UZ translations
assets/js/catalog-logic.js collections, filters, sort, URL state (pure, unit-tested)
assets/js/core.js          logo, theme/language, cart, wishlist, search, mega-menu, live catalog loader
assets/js/router.js        URL → page, history, transitions, per-page meta
assets/js/home.js | shop.js | product.js | checkout.js | pages.js    the pages
assets/js/order-logic.js   phone mask, form validation, local totals (pure, unit-tested)
assets/js/info.js | info-content.js   information pages and their texts
assets/js/analytics.js     Yandex Metrica / GA4 loader and shop events (only when an id is set in the admin)
assets/js/main.js          boot
admin/index.html           admin panel shell (own CSP, noindex)
assets/admin/              admin panel: app.js (sign-in, layout, routing), pages/*.js, data.js (Supabase),
                           logic.js (pure, unit-tested), images.js (browser photo resize), mock.js (demo), i18n.js
supabase/                  database: migrations, seed, tests, setup guide (see supabase/README.md)
scripts/                   build-seed.mjs, dev-server.mjs
tests/                     API + catalog-logic + router tests
docs/MASTER_PLAN.md        the full plan: storefront, admin panel, orders → Telegram, roadmap
```

## Admin panel

Open **/admin** (RU / UZ / EN, light / dark, works on a phone). Staff sign in with a **username and
password** — no e-mail address is involved. What each role may do is enforced by the database, not by
hiding buttons:

| | Owner | Manager |
|---|---|---|
| Overview, orders (status, notes, tracking), products, photos, sizes, stock | ✅ | ✅ |
| Bulk hide / show / discount, delete a product | ✅ | hide / show / discount only |
| Promo codes, site settings, reports + Excel export, staff, activity log | ✅ | — |

**First run (creating the owner).** While the shop has no owner, the sign-in page shows
*“First run: create the owner”*. It sends an 8-digit code to the managers' Telegram group (only people
in that group can read it; valid 15 minutes, 5 attempts) and asks for a name, username and password.
After that the door is closed for good. Everyone else is added by the owner under **Staff**.

- Changing an order's status in the panel also edits its Telegram message, and the other way round.
- Staff photos are resized in the browser to WebP 1600 / 800 / 400 px before upload.
- Reports export to `.xlsx` (written in the browser, no library) and CSV.
- **Lost owner password:** Supabase dashboard → Authentication → Users → the user
  `<username>@staff.outlet-lounge.invalid` → set a new password.

Try it locally without an account or database: `npm run dev`, then open
`http://localhost:5173/admin?demo` (in-memory demo data; add `&role=manager` for the manager view,
`&login` to see the sign-in page — password `demo` — or `&setup` for the first-run flow — code `12345678`).

## SEO, analytics and launch

- **Server-rendered meta.** Public addresses are rewritten to `api/page.js`, which returns the shop shell with
  the page's own title, description, canonical link, Open Graph / Twitter tags and JSON-LD
  (Product + Offer in UZS, BreadcrumbList, Store). Link previews in Telegram / Instagram and search
  engines see real content; unknown products answer a real 404.
- **Closed until launch.** The public setting `site.indexing` (admin → Settings → Launch) is off by default:
  pages are `noindex`, `robots.txt` disallows everything and the sitemap is empty. Switch it on on launch day.
- **Analytics** load only when an id is entered under Settings → Analytics.
- **Domain:** set `SITE_URL` in Vercel after connecting one. The full checklist is in `docs/LAUNCH.md`.

## Tests

```bash
npm test          # API shaping, filters/sort/URL state, router, order API, Telegram webhook, order helpers
npm run test:db   # database: stock safety, pricing, promo rules, who can do what
```

## Environment variables

See `.env.example`. Real values live only in Vercel — never in git.

### Telegram order alerts

**Connected:** bot **@outlet_lounge_bot** → managers' group **Outlet_requests**; webhook
`https://outlet-lounge.vercel.app/api/telegram` (status buttons + `/start <order no>` for customers).

- The token lives only in Vercel (`TELEGRAM_BOT_TOKEN`, sensitive, so it can't be pulled to a laptop).
- The managers' chat is the private `telegram` setting (`{"chat_id": …}`); `TELEGRAM_CHAT_ID` overrides it if set.
- Setup steps run **on the server**: write the step into the private `telegram_setup` setting, open
  `https://outlet-lounge.vercel.app/api/telegram` once, then read the result back from the same setting.
  Steps: `status`, `discover` (chats the bot can see — send `/id@outlet_lounge_bot` in a group first;
  only works while no webhook is set), `webhook`, `test`.
  ```bash
  npx supabase db query --linked "update public.settings set value = '{\"action\":\"status\"}' where key = 'telegram_setup'"
  curl https://outlet-lounge.vercel.app/api/telegram
  npx supabase db query --linked "select value from public.settings where key = 'telegram_setup'"
  ```
- New token (after a revoke): replace it in Vercel → redeploy → run the `webhook` step.
- Different group: add the bot, send `/id@outlet_lounge_bot` there (the bot replies with the id), update
  `chat_id` in the `telegram` setting.

## Notes

- Product photos are temporary Unsplash images; swap the IDs in `OL.IMG` (`data.js`).
- Products, prices, reviews and counts are placeholders until the database is connected.
- When real products are live, set `OL.CONFIG.staticFallback = false` in `data.js` so placeholder prices are never shown if the API is down.
- Motion is reduced automatically when the visitor's system has "reduce motion" turned on.
- When you change CSS/JS, bump the `?v=` number in `index.html` so browsers don't serve old copies.
- Pushing to `main` deploys to production automatically (Vercel ↔ GitHub).
- Uzbek text uses `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for the tutuq belgisi — never `‘ ’ '`. Jost has no glyph for them; the font stack falls back to Inter, which does.
