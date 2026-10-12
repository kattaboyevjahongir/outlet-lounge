# Outlet Lounge — homepage design concepts

Three switchable design directions for the sneaker shop homepage, each in light and dark mode, in English / Русский / O‘zbek, with prices in UZS.

| # | Direction | Feel |
|---|-----------|------|
| 1 | **Gilded Lounge** | Quiet luxury, serif editorial type, arched frames, gold dust, rotating seal |
| 2 | **Flight Path** | Energetic: huge type, the logo's arrow as a scroll-progress line, sideways-scrolling drops, add-to-cart arc trail |
| 3 | **The Vault** | Dark showroom: lights-on intro, cursor spotlight, display cases, exhibit pages, doors that open |

Switch with the **Design** dock at the bottom of the page, the keys **1 / 2 / 3**, or a URL hash (`#gilded`, `#flight`, `#vault`).

## Run

Plain HTML/CSS/JS, no build step. Serve the folder with any static server:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>.

## Structure

```
index.html                 page shell (header, cart drawer, dock, loader, curtain)
assets/css/base.css        theme tokens (light/dark), shared components
assets/css/{gilded,flight,vault}.css
assets/js/data.js          products, placeholder images, EN/RU/UZ translations
assets/js/core.js          logo SVG, theme/language/cart, transitions, motion helpers
assets/js/concept-*.js     each direction's markup + GSAP animations
assets/js/main.js          boot
```

Libraries (CDN): GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Fonts: Cormorant Garamond, Jost, Inter.

## Notes

- Product photos are temporary Unsplash images; swap the IDs in `OL.IMG` (`data.js`).
- Products, prices, reviews and counts are placeholders.
- Motion is reduced automatically when the visitor's system has "reduce motion" turned on.
- When you change CSS/JS, bump the `?v=` number in `index.html` so browsers don't serve old copies.
