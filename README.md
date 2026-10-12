# Outlet Lounge — homepage

Homepage for the Outlet Lounge sneaker shop in the **Flight Path** style: oversized type, the logo's gold arrow driving the motion (scroll-progress line, swoosh, add-to-cart arc), a sideways-scrolling New Drops section and velocity-reactive brand ribbons.

- Light and dark mode
- English / Русский / O‘zbek, prices in UZS
- Working cart drawer (front-end only)

Live: <https://outlet-lounge.vercel.app>

## Run locally

Plain HTML/CSS/JS, no build step. Serve the folder with any static server:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>. Without the API the page uses its built-in
placeholder catalog (`OL.STATIC_PRODUCTS` in `assets/js/data.js`).

## Structure

```
index.html               page shell (header, cart/wishlist drawers, search, loader, theme curtain)
api/catalog.js           GET /api/catalog — live products + public settings from Supabase
assets/css/base.css      theme tokens (light/dark), shared components, phone card layout
assets/css/home.css      homepage sections
assets/js/data.js        placeholder catalog + settings, EN/RU/UZ translations
assets/js/core.js        logo, theme/language, cart, wishlist, search, transitions, live catalog loader
assets/js/home.js        homepage markup + GSAP animations
assets/js/main.js        boot
supabase/                database: migrations, seed, tests, setup guide (see supabase/README.md)
scripts/build-seed.mjs   generates supabase/seed.sql from data.js
tests/                   API tests
docs/MASTER_PLAN.md      the full plan: storefront, admin panel, orders → Telegram, roadmap
```

## Tests

```bash
npm test          # API: shaping, caching, error handling
npm run test:db   # database: stock safety, pricing, promo rules, who can do what
```

## Environment variables

See `.env.example`. Real values live only in Vercel — never in git.

## Notes

- Product photos are temporary Unsplash images; swap the IDs in `OL.IMG` (`data.js`).
- Products, prices, reviews and counts are placeholders until the database is connected.
- When real products are live, set `OL.CONFIG.staticFallback = false` in `data.js` so placeholder prices are never shown if the API is down.
- Motion is reduced automatically when the visitor's system has "reduce motion" turned on.
- When you change CSS/JS, bump the `?v=` number in `index.html` so browsers don't serve old copies.
