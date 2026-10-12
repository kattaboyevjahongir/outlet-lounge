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
| anything else | 404 |

All of them are one HTML shell (`index.html`); `vercel.json` rewrites every non-file path to it and
`assets/js/router.js` picks the page.

## Structure

```
index.html                 page shell (header + mega-menu, drawers, search, loader, theme curtain)
api/catalog.js             GET /api/catalog — live products + public settings from Supabase
api/quote.js               POST /api/quote — cart totals/promo from the database (never changes stock)
api/order.js               POST /api/order — checkout, quick order, notify-me → database + Telegram
api/telegram.js            POST /api/telegram — bot webhook (order status buttons, /id)
api/_lib/                  validation, Telegram message format, Supabase/Telegram clients
assets/css/base.css        theme tokens, shared components, phone card layout
assets/css/home.css        homepage      shop.css  catalog + 404      product.css  product page
assets/js/data.js          placeholder catalog + settings, EN/RU/UZ translations
assets/js/catalog-logic.js collections, filters, sort, URL state (pure, unit-tested)
assets/js/core.js          logo, theme/language, cart, wishlist, search, mega-menu, live catalog loader
assets/js/router.js        URL → page, history, transitions, per-page meta
assets/js/home.js | shop.js | product.js | checkout.js | pages.js    the pages
assets/js/order-logic.js   phone mask, form validation, local totals (pure, unit-tested)
assets/js/main.js          boot
supabase/                  database: migrations, seed, tests, setup guide (see supabase/README.md)
scripts/                   build-seed.mjs, dev-server.mjs
tests/                     API + catalog-logic + router tests
docs/MASTER_PLAN.md        the full plan: storefront, admin panel, orders → Telegram, roadmap
```

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
