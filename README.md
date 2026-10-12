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

Then open <http://localhost:5173>.

## Structure

```
index.html            page shell (header, cart drawer, loader, theme curtain)
assets/css/base.css   theme tokens (light/dark), shared components, phone card layout
assets/css/home.css   homepage sections
assets/js/data.js     products, placeholder images, EN/RU/UZ translations
assets/js/core.js     logo SVG, theme/language/cart, transitions, motion helpers
assets/js/home.js     homepage markup + GSAP animations
assets/js/main.js     boot
```

Libraries (CDN): GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Fonts: Cormorant Garamond, Jost, Inter.

## Notes

- Product photos are temporary Unsplash images; swap the IDs in `OL.IMG` (`data.js`).
- Products, prices, reviews and counts are placeholders.
- Motion is reduced automatically when the visitor's system has "reduce motion" turned on.
- When you change CSS/JS, bump the `?v=` number in `index.html` so browsers don't serve old copies.
