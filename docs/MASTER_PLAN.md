# Outlet Lounge — Master Plan

> The full shop website and admin panel, from today's homepage to launch and beyond.
> Orders are saved in the database and alert managers in Telegram instantly.
> Status: **draft for review** · Owner: kattaboyevjahongir · Last updated: 2026-10-12

---

## 0. Where we are today

| Area | Status |
|---|---|
| Homepage ("Flight Path" design), light/dark, EN/RU/UZ, UZS prices | ✅ Done, live at https://outlet-lounge.vercel.app |
| Cart drawer (front-end only, stored in the browser) | ✅ Done |
| GitHub repo `kattaboyevjahongir/outlet-lounge` | ✅ Done |
| Vercel project (manual deploys) | ✅ Done; auto-deploy on push needs Vercel's GitHub access |
| Catalog, product pages, checkout, orders | ❌ Not built |
| Admin panel (products, stock, orders, reports, content, staff) | ❌ Planned (§5) |
| Database (Supabase) | ✅ Live: project `outlet-lounge` (Frankfurt), schema + security rules applied, placeholder products seeded, verified as a visitor (reads products only) |
| Storefront reads live data (`/api/catalog`), search, wishlist, intro once per visit | ✅ Live on https://outlet-lounge.vercel.app (source: database) |
| Real products/photos | ❌ Placeholders (Unsplash, made-up prices) |

---

## 1. Security first: the Telegram bot token

The bot token was pasted into a chat, so treat it as exposed.

1. **Revoke and regenerate it** in Telegram: open **@BotFather → /mybots → your bot → API Token → Revoke current token**. You get a new token; the old one stops working.
2. **The new token never goes into the website code or git.** The website is public, so anyone could read a token placed in it and take over the bot.
3. Store it only as a **Vercel environment variable** (encrypted, server-side). You add it yourself, either in the Vercel dashboard (Project → Settings → Environment Variables) or in your own terminal:
   ```bash
   vercel env add TELEGRAM_BOT_TOKEN production
   ```
   (It asks you to paste the value; it isn't echoed or saved in files.)
4. Only server functions read it. The browser never sees it. The same rule applies to the Supabase **service role key** (§6.2).

---

## 2. Goals and principles

- **Sell original sneakers at outlet prices**, mainly in Uzbekistan. Prices are in UZS.
- **Ordering must be dead simple:** no customer account, no online payment needed at launch. The customer leaves a phone number, a manager confirms by phone or Telegram.
- **One source of truth:** Supabase (database) holds products, stock, orders and settings. **Telegram = instant alerts + quick actions**; the **admin panel = full control**. Both stay in sync.
- **The owner runs the shop without a developer:** products, photos, prices, stock, orders, banners and staff are all managed in `/admin`.
- **Keep the current stack:** plain HTML/CSS/JS + GSAP on Vercel, small serverless functions, Supabase for data, logins and photos. No heavy framework unless a later phase needs it.
- **Mobile first:** most traffic will come from phones (Instagram/Telegram links), and managers will often use the admin panel on a phone.
- **Fast, accessible, bilingual-first:** Russian and Uzbek are the primary languages; English is secondary.
- **Never trust the browser** for prices, stock or promo codes. The server recalculates every order from the database.

---

## 3. Site map

**Storefront**
```
/                        Home (done)
/shop                    All products: filters, sort, search
/new                     New arrivals (catalog, pre-filtered)
/sale                    Outlet deals (catalog, pre-filtered)
/men  /women  /kids      Collections (catalog, pre-filtered)
/brands/<brand>          Brand page (catalog, pre-filtered)
/product/<slug>          Product page
/wishlist                Saved items
/cart                    Full cart page (the drawer also exists everywhere)
/checkout                Checkout form
/order/success           Thank-you page with order number
/delivery  /returns  /size-guide  /authenticity  /about  /contacts  /faq
/offer  /privacy         Legal pages
/404                     Not found
```

**Admin** (staff only; `noindex`, blocked in `robots.txt`)
```
/admin/login             Staff sign-in
/admin                   Dashboard
/admin/orders            Orders list            /admin/orders/<no>     Order detail
/admin/products          Products list          /admin/products/new | /admin/products/<id>   Edit
/admin/stock             Quick stock grid
/admin/content           Site content & settings
/admin/promo             Promo codes
/admin/staff             Staff accounts & roles (owner only)
/admin/reports           Sales reports & export
```

**Server functions**
```
/api/catalog             products for the storefront (cached)
/api/order               checkout, 1-click buy, "notify me" → database + Telegram
/api/telegram            bot webhook (status buttons, customer notifications)
/api/admin/*             admin actions that need the service key (e.g. invite staff)
```

---

## 4. Storefront: every part in detail

### 4.1 Global shell (all pages)

**Header**
- Logo → home; nav: New · Men · Women · Kids · Brands · **Outlet** (gold).
- Desktop **mega-menu** on hover for Men/Women/Kids: categories (Running, Lifestyle, Basketball), top brands, a featured product tile (chosen in admin).
- Icons: **search**, language (EN/RU/UZ pill), theme toggle, **wishlist** (count), **cart** (count).
- Hides on scroll down and shows on scroll up; glass background after scrolling (done).
- Mobile: hamburger → full-screen menu with big links, language and theme inside.

**Search overlay**
- Opens from the icon or the `/` key; instant results as you type (brand, name, colorway, tags).
- Understands Latin and Cyrillic and common spellings: "найк" → Nike, "jordan"/"джордан", "кроссовки".
- Shows recent searches and popular brands when empty, and a friendly "nothing found" with suggestions.

**Footer** (done): add real links to the info pages, plus phone, working hours, Telegram, Instagram and business details (company name / INN if required). The contact details are edited in admin.

**Cart drawer** (done): add a size change, a free-delivery progress bar ("Add 210 000 so'm for free delivery", threshold set in admin) and a "Checkout" button that goes to `/checkout`.

**Other global pieces**
- Toasts (done).
- Intro loader: show it **once per visit** only, not on every page.
- Theme curtain (done).
- **Floating Telegram button** on mobile ("Ask a manager") → manager link from admin settings.
- Breadcrumbs on catalog and product pages.
- Wishlist and recently viewed, both stored in the browser.

### 4.2 Home (done; finish wiring)
- Point every link to real pages: hero CTA → `/new`, category rows → collections, product cards → product pages, deals → `/sale`.
- "New drops" and "Best sellers" come from the database (`is_new` / `is_featured` flags set in admin).
- Hero texts, banners, deal texts and the **countdown deadline** are edited in **Admin → Content**.

### 4.3 Catalog `/shop` (and pre-filtered pages)
- **Filters:** category, gender, brand, **size (EU, only in-stock sizes)**, price range slider (UZS), color, discount ≥ X%, "in stock only".
- **Sort:** newest · price low→high · price high→low · biggest discount · popular.
- Filters are saved in the URL (`/shop?brand=nike&size=42`), so links can be shared and the Back button works.
- Result count, a removable chip for each active filter, "Clear all".
- Mobile: a "Filters" button opens a bottom sheet; the sort dropdown sits beside it.
- Grid: 4 per row on desktop, 3 on tablet, **2 on phones** (done style). "Load more" button (24 at a time).
- Empty state with a "Clear filters" button and suggestions.
- Cards: hover shows the second photo, quick-add with size, wishlist heart (all done).

### 4.4 Product page `/product/<slug>`
- **Gallery:** 4–8 photos, swipe on phones, thumbnails on desktop, tap/click to zoom (fullscreen).
- Brand, name, colorway, SKU.
- **Price block:** sale price, crossed-out old price, "−37%", "You save 800 000 so'm".
- **Size picker:** EU sizes with live stock from the database; sold-out sizes crossed out; "Only 1 left" when stock = 1; EU/US/cm toggle; **Size guide** modal.
- **Add to cart** + **Buy in 1 click** (quick form: name + phone → order saved + Telegram alert).
- Wishlist heart, "Share" (Telegram/copy link).
- Info tabs or accordions: Description (RU/UZ/EN) · Details (material, condition "new, original box") · Delivery & payment · Returns · Authenticity.
- Trust badges: 100% original · Delivery across Uzbekistan · Exchange within N days.
- "You may also like" (same category/brand) and "Recently viewed".
- **Sticky add-to-cart bar on phones** (price + button) once the main button scrolls away.
- Out-of-stock product or size: "Notify me" (phone/Telegram) → saved as a request in admin + Telegram alert.

### 4.5 Wishlist `/wishlist`
- Grid of saved items (stored in the browser), move to cart, remove, and the empty state.

### 4.6 Cart `/cart` (+ drawer)
- Line items: photo, name, size (changeable), quantity ±, price, remove.
- Summary: subtotal, savings, promo code, delivery (estimated / "calculated at checkout"), total.
- Free-delivery progress bar.
- Before checkout, re-check prices and stock against the database and flag changes ("Price updated", "Size 42 sold out").

### 4.7 Checkout `/checkout` (one page, no account)

| Section | Fields | Rules |
|---|---|---|
| Contact | Name*, Phone* (`+998 __ ___ __ __` mask), Telegram username (optional), preferred contact: call / Telegram | Uzbek mobile format check |
| Delivery | Method*: courier in Tashkent · regions via BTS/post · pickup from store; Region*, City/district*, Address* (street, house, apartment), landmark ("orientir") | Address hidden for pickup; methods and prices come from admin settings |
| Payment | Cash on delivery · Card on delivery (Uzcard/Humo terminal) · Transfer to card after the call (Click/Payme/Uzcard); **online payment = phase 7** | Shown as text options, no card data collected on the site |
| Promo code | Code field with an "Apply" button | Checked by the server (valid dates, minimum order, usage limit) |
| Comment | Free text (optional) | Max 500 characters |
| Summary | Items, sizes, quantities, subtotal, discount, delivery, **total** | Recalculated by the server |
| Consent | ☐ I agree with the public offer and privacy policy* | Required |

- Submit → loading state → `/order/success?no=OL-261012-4821`.
- If sending fails: keep the form filled in, show an error, and offer "Order via Telegram" as a backup link.
- Spam protection: a hidden honeypot field, a minimum fill time, phone check, limits on items/quantity, rate limit per IP.

### 4.8 Order success `/order/success`
- Big order number, summary, "A manager will call you within 15 minutes (working hours 10:00–21:00)" (hours from admin settings).
- Button: **"Follow your order in Telegram"** → `t.me/<bot>?start=OL-261012-4821` (phase 7 sends status updates).
- Clears the cart.

### 4.9 Info pages
- **Delivery:** zones table (Tashkent 1 day / regions 2–5 days), prices (from admin settings), free-delivery threshold, how pickup works.
- **Returns & exchange:** time limit, condition (unworn, with box and tags), how to request (Telegram/phone).
- **Size guide:** charts per brand (Nike/Jordan, adidas, New Balance, Converse, Vans, Puma), how to measure your foot.
- **Authenticity:** where stock comes from, how each pair is checked, guarantee.
- **About / Our story**, **Contacts** (map embed, address, hours, phone, Telegram, Instagram), **FAQ** (accordion).
- **Public offer** and **Privacy policy:** legal texts (owner to provide or approve).
- **404:** a playful page in the Flight style with search and links back.

---

## 5. Admin panel `/admin`

Our own panel in the Outlet Lounge style: Flight Path colours and type in a calmer dashboard layout, with a sidebar on desktop and a bottom tab bar on phones. It supports RU/UZ/EN and light/dark, and is built for fast daily use by managers on a phone.

### 5.1 Login & access
- **Supabase Auth**, email + password. **Invite-only:** public sign-up is switched off; the owner invites staff.
- Password reset by email; auto-logout after inactivity; "remember this device".
- **Roles**
  | Role | Can do |
  |---|---|
  | **Owner** | Everything, including staff, settings, promo codes, reports and deleting products |
  | **Manager** | Orders, products, photos, stock; no staff, settings or deletions |
- Access is enforced in the **database (Row Level Security)**, not just by hiding buttons.

### 5.2 Dashboard `/admin`
- KPI cards for today / this week / this month: orders, revenue, average order value, **new orders waiting**.
- Sales-per-day chart (last 30 days); orders by status.
- Top 5 products and top brands.
- **Low-stock alerts** (≤1 left per size) and "Notify me" requests waiting.
- Latest 10 orders with quick status buttons.

### 5.3 Orders `/admin/orders`
- Table: number, date, customer, phone, items count, total, delivery, payment, **status** (coloured badge).
- Search by order number, phone or name. Filters: status, date range, delivery method, payment, region.
- **Statuses:** `new → confirmed → shipped → delivered`, plus `cancelled` and `no answer`.
- **Order detail:**
  - Items with photo/size/qty/price, customer, delivery address + landmark, payment, comment, promo used, source (UTM).
  - **Status timeline**: who changed what and when.
  - Internal notes for staff; tracking number field for BTS/post.
  - Actions: change status, edit items/sizes before shipping (stock adjusts), **print / copy for courier**, call or open the customer's Telegram.
- Every status change:
  - is saved in `order_events`
  - **updates the Telegram message** for the managers
  - (phase 7) notifies the customer in the bot
- **Cancelling returns the stock.**
- New orders show a badge in the sidebar and play an optional sound while the panel is open.

### 5.4 Products `/admin/products`
- List with photo, name, brand, price, total stock, status (active / hidden / sold out). Search; filters by brand, category, active/hidden, sold out. Bulk actions: hide/show, set discount %.
- **Edit form:**
  - Brand (pick or add new), name, colorway, SKU, category, gender.
  - **Price** and **old price**, with the discount % calculated automatically.
  - Descriptions in **RU / UZ / EN** (tabs), tags for search (e.g. "джордан").
  - Flags: **new**, **featured** (home "best sellers"), **active**.
  - Slug (auto-made from the name, editable) and SEO title/description (optional).
  - **Photos:** drag-and-drop or phone camera upload, reorder by dragging, set the main photo, delete. Photos are **resized in the browser** to WebP (1600 / 800 / 400 px) before upload, so they're fast on the site.
  - **Sizes & stock table:** EU / US / cm + quantity per size; add/remove sizes; "copy sizes from another product".
- Duplicate a product (for a new colorway). Products are hidden rather than deleted when they have orders.

### 5.5 Stock `/admin/stock`
- One grid: **products × sizes**, each cell an editable quantity; changes save instantly.
- Highlights 0 (red) and 1 (amber); filter by brand/category; search.
- Made for quick restocking after a delivery from the supplier.

### 5.6 Content & settings `/admin/content` (owner)
- **Home:** hero texts (RU/UZ/EN), banners, deals section texts, **countdown deadline**, which products appear in "New drops".
- **Delivery:** methods, prices per region, delivery times, **free-delivery threshold**, pickup address on/off.
- **Payment methods** shown at checkout, and the card details for transfers.
- **Contacts:** phone(s), working hours, address, map link, Telegram, Instagram.
- **Telegram:** which chat receives orders, message language, a "send test message" button.
- **Notices:** a site-wide announcement bar (e.g. "Free delivery this weekend").

### 5.7 Promo codes `/admin/promo` (owner)
- Code, type (% or fixed UZS), value, minimum order, valid from/to, total usage limit, per-phone limit, active.
- Usage count and the revenue from orders that used the code.

### 5.8 Staff `/admin/staff` (owner)
- Invite by email (the person sets their own password), choose a role, deactivate, see last login.

### 5.9 Reports `/admin/reports`
- Sales by day / week / month, by brand, by product, by delivery region; cancelled-order rate.
- **Export** orders and products to **Excel (.xlsx)** and CSV for accounting.

### 5.10 Activity log
- Who changed what and when: product edits, price changes, stock changes, order status, settings. Owner can view and filter it.

---

## 6. Orders → database + Telegram

### 6.1 Flow
```
Customer (browser)                    Vercel function /api/order                       Supabase / Telegram
──────────────────                    ─────────────────────────                       ───────────────────
Checkout form ── POST JSON ──────────▶ 1. validate fields (phone, required, honeypot…)
                                      2. call DB function place_order() — in ONE transaction:
                                         • re-read prices & stock
                                         • check promo code
                                         • create order + items, number OL-YYMMDD-XXXX
                                         • decrease stock (two buyers can't get the last pair)
                                      3. sendMessage(chat_id, formatted order) ─────────▶ Managers' Telegram group
                                      4. save the Telegram message id on the order
◀── { ok: true, orderNo } ───────────  5. reply to browser
Success page

Manager taps a status button in Telegram  ──▶ /api/telegram ──▶ updates order + event in DB, edits the message
Manager changes status in /admin           ──▶ DB update      ──▶ /api/admin edits the Telegram message
```

### 6.2 Configuration (Vercel environment variables; never in code)
| Variable | What | Secret? | Who sets it |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **new** token from @BotFather | 🔒 yes | You |
| `TELEGRAM_CHAT_ID` | Managers' **group** (recommended) or a personal chat | no | You (also editable in admin) |
| `TELEGRAM_WEBHOOK_SECRET` | Random string so only Telegram can call `/api/telegram` | 🔒 yes | Me (generated) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Database address + public key (safe by design with RLS) | no | Me |
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access for server functions only | 🔒 yes | You |

**Getting the chat ID**
- Personal: message **@userinfobot** in Telegram; it replies with your numeric ID.
- Group (recommended, so several managers see orders): create a group, add your bot, send any message in the group, then open `https://api.telegram.org/bot<NEW_TOKEN>/getUpdates` **in your own browser** and copy `chat.id` (a negative number like `-100…`).
- Then press **Start** in a private chat with the bot, so it's allowed to message you.

### 6.3 Message the managers receive (Russian by default; configurable)
```
🛍 Новый заказ OL-261012-4821
🕒 12.10.2026 21:40 · сайт (RU)

👤 Азиз Р.
📞 +998 90 123 45 67   ✈️ @aziz_r
💬 Связь: звонок

📦 Доставка: курьер по Ташкенту
📍 Ташкент, Юнусабадский р-н, ул. …, д. 12, кв. 5
🧭 Ориентир: напротив Mega Planet

1) Air Jordan 1 Low “Shattered” — EU 42 × 1 — 1 490 000
2) Air Max 1 “Sunset” — EU 41 × 1 — 1 390 000

Сумма: 2 880 000 сум
Промокод LOUNGE10: −288 000 сум
Доставка: 30 000 сум
ИТОГО: 2 622 000 сум
💳 Оплата: наличными при получении
📝 Комментарий: позвонить после 18:00

[ ✅ Подтвердить ] [ 📞 Не дозвонились ] [ ❌ Отменить ]
[ 🔗 Открыть в админке ]
```
After a tap, the message updates, e.g. "✅ Подтверждён — Малика, 21:52", and the buttons change to the next step (📦 Отправлен → 🏁 Доставлен).

### 6.4 Server function rules
- `api/order.js` (Node runtime) accepts only POST with JSON, has a max body size and accepts same-site requests only.
- Uses the **service role key** to call `place_order`. Escapes all customer text for Telegram HTML.
- Never returns secrets or internal errors to the browser.
- If Telegram is down, the order is **still saved** (it appears in admin) and is retried when the managers' chat is reachable. The customer always gets their order number.
- The same function serves `type: order | quick | notify`.

### 6.5 Customer notifications (phase 7)
- The bot greets customers who open `t.me/<bot>?start=<orderNo>` and links their chat to the order.
- When the status changes (in Telegram or admin), the bot messages the customer: "Your order OL-… is confirmed / shipped (tracking …)".

---

## 7. Data: Supabase (Postgres)

### 7.1 Tables
| Table | Key columns |
|---|---|
| `brands` | id, name, slug, logo, sort |
| `products` | id, slug, brand_id, name, colorway, sku, category, gender, price, old_price, description_ru/uz/en, tags[], is_new, is_featured, is_active, seo_title, seo_description, created_at, updated_at |
| `product_images` | id, product_id, path, sort, is_main |
| `product_sizes` | id, product_id, eu, us, cm, **stock** |
| `orders` | id, number, status, customer_name, phone, telegram, contact_pref, delivery_method, region, city, address, landmark, payment_method, comment, subtotal, discount, delivery_fee, total, promo_code_id, lang, utm, tg_message_id, tracking_no, created_at |
| `order_items` | id, order_id, product_id, size_id, name_snapshot, size_snapshot, qty, unit_price |
| `order_events` | id, order_id, from_status, to_status, note, actor (staff or "telegram:<user>"), created_at |
| `promo_codes` | id, code, type, value, min_order, starts_at, ends_at, usage_limit, per_phone_limit, used_count, is_active |
| `settings` | key, value (JSON): home, delivery, payment, contacts, telegram, notice |
| `staff` | user_id (auth), name, role (owner/manager), is_active, last_login |
| `notify_requests` | id, product_id, size_id, phone, telegram, status, created_at |
| `activity_log` | id, actor, action, entity, entity_id, diff (JSON), created_at |

- Orders keep **snapshots** of names/sizes/prices, so old orders stay correct after product edits.
- `place_order(...)`: one Postgres function that validates, prices, applies the promo, inserts, and decreases stock atomically. `cancel_order(...)` returns the stock.

### 7.2 Row Level Security
| Who | Can read | Can write |
|---|---|---|
| Visitor (anon) | active products, images, sizes, brands, public settings | nothing (orders go through the server) |
| Manager | everything except staff and private settings | orders, order events, products, images, sizes, notify requests |
| Owner | everything | everything |
| Server functions | everything (service key) | place / cancel orders, Telegram sync |

### 7.3 Photos
- Storage bucket `product-images`: public read, staff upload/delete.
- Real photos: 1:1 or 4:5, at least 1600 px, same light background per series, 4–8 angles per product.
- Uploaded through admin, resized to WebP 1600/800/400 in the browser.
- The current placeholder products in `assets/js/data.js` are used **only as a one-time seed** for the first import.

---

## 8. Technical architecture

```
outlet-lounge/
├─ index.html  shop.html  product.html  cart.html  checkout.html  success.html  wishlist.html  404.html
├─ pages/                      delivery, returns, size-guide, authenticity, about, contacts, faq, offer, privacy
├─ admin/
│  ├─ index.html  login.html  orders.html  order.html  products.html  product.html
│  ├─ stock.html  content.html  promo.html  staff.html  reports.html
│  └─ assets/  admin.css  admin.js (auth guard, layout, i18n)  + one js per page
├─ assets/
│  ├─ css/ base.css  home.css  catalog.css  product.css  checkout.css  pages.css
│  └─ js/  core.js  data.js (i18n strings)  home.js  catalog.js  product.js  checkout.js  search.js
├─ api/
│  ├─ catalog.js               storefront data (edge-cached ~60 s)
│  ├─ order.js                 orders / 1-click / notify → place_order + Telegram
│  ├─ telegram.js              bot webhook (secret header)
│  └─ admin/                   service-key actions: invite staff, sync Telegram message
├─ supabase/
│  ├─ migrations/*.sql         tables, functions, RLS policies
│  └─ seed.sql                 first products from the current placeholders
├─ vercel.json                 clean URLs, rewrites (/product/:slug), headers, noindex for /admin
└─ package.json                minimal (Node ≥ 20, "type": "module", @supabase/supabase-js for server)
```
- **Storefront** reads `/api/catalog`. It is cached at the edge for about 60 s, so the site stays fast and the database stays quiet; admin changes show within a minute.
- **Admin** pages use **supabase-js v2** (pinned CDN version) with the public anon key, plus the logged-in staff session. RLS does the real protection.
- **Clean URLs** through `vercel.json` rewrites; each template reads the slug or filters from the URL.
- **Translations:** the existing `OL.t()` system. Every new string is added in RU/UZ/EN. The language is remembered and auto-detected on the first visit (RU or UZ by browser; EN fallback).
- **SEO upgrade (phase 6):** product and collection pages are rendered by a server function (cached), so Google and Yandex see full content, prices and structured data.
- **Database changes** go through migration files in git, applied with the Supabase CLI.

---

## 9. Security

- Secrets (`TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_WEBHOOK_SECRET`) live only in Vercel environment variables, never in code, git or chat.
- **RLS policies tested** for visitor, manager and owner before launch.
- Admin: invite-only, `noindex`, blocked in `robots.txt`, auto-logout, rate-limited login. Each staff member gets their own account; no shared passwords.
- Orders: server-side validation and pricing, honeypot, rate limit per IP, size limits.
- Telegram webhook accepts only requests with the secret header.
- **Daily database backups** (Supabase Pro) + the activity log for who changed what.
- Customer data (names, phones, addresses) is visible only to staff; covered by the privacy policy.

---

## 10. SEO, analytics, performance, accessibility

**SEO**
- Unique title and description per page and language (editable per product in admin); Open Graph and Telegram preview images.
- `sitemap.xml` (generated from the database), `robots.txt`, canonical URLs, `hreflang` (ru/uz/en).
- Structured data: Product + Offer (price, UZS, availability), BreadcrumbList, Organization, LocalBusiness (store).
- Register in **Google Search Console** and **Yandex Webmaster**.

**Analytics**
- **Yandex Metrica** (widely used in UZ, with session replay) + Vercel Analytics; GA4 optional.
- Events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (order saved), `search`, `click_telegram`.
- UTM tags from Instagram/Telegram campaigns are saved on the order (visible in admin reports).

**Performance targets** (Lighthouse, mobile): Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95.
- Optimized images (WebP sizes from admin upload), preloaded fonts, subset Cyrillic + Latin.
- Lighter animations on low-end phones; GSAP only where it's used.

**Accessibility**
- Keyboard navigation, visible focus, alt text on all product photos (auto-filled from brand + name).
- Contrast checked in both themes, `prefers-reduced-motion` respected (done), form labels and error messages read by screen readers.

---

## 11. Costs & accounts

| Service | What for | Plan | Approx. cost |
|---|---|---|---|
| **Vercel** | Hosting + server functions | Hobby (free) is for **non-commercial** use only → **Pro** for a live shop | ~$20 / month |
| **Supabase** | Database, staff logins, photo storage | Free while building. Free projects **pause after a week without traffic** and have no daily backups → **Pro** at launch | ~$25 / month |
| Telegram bot | Order alerts + buttons | Free | $0 |
| Domain (.uz) | e.g. `outletlounge.uz` | Yearly, via a .uz registrar | small yearly fee |
| Yandex Metrica / Search Console | Analytics, SEO | Free | $0 |

**Accounts the owner creates and signs in to:** Supabase (then I work through the Supabase CLI after you approve its login, like with Vercel), Yandex Metrica, Google Search Console, domain registrar.

---

## 12. Business and legal checklist (owner)
- [ ] Shop name, legal entity / sole trader, INN (for the footer and public offer)
- [ ] Phone number(s), working hours, store/pickup address (if any)
- [ ] Delivery partners and prices (Tashkent courier, BTS / Uzpost for regions), free-delivery threshold
- [ ] Payment methods at launch (cash, card terminal, transfer to card)
- [ ] Returns/exchange policy (days, conditions)
- [ ] Public offer and privacy policy texts
- [ ] Real product list, prices, stock per size, photos (entered in admin)
- [ ] Social links: Instagram, Telegram channel, manager account
- [ ] **Supabase account** created; **staff list** (emails + roles)
- [ ] **Budget** for Vercel Pro + Supabase Pro at launch
- [ ] Domain name (e.g. `outletlounge.uz`) → connect to Vercel

---

## 13. Roadmap

| Phase | What | Result |
|---|---|---|
| **0. Setup** | Revoke and replace the bot token; create the Supabase project; set environment variables; give Vercel GitHub access for auto-deploys; answer the open questions (§14) | Safe foundation |
| **1. Database** | Tables, `place_order`/`cancel_order`, RLS, storage bucket; seed from current placeholders; `/api/catalog`; storefront reads live data; shell, mega-menu, search overlay, wishlist, loader once per visit | Live data behind the site |
| **2. Catalog + product** | `/shop` with filters/sort/URL state, collection and brand pages, product page with gallery, sizes, size guide, related items | Full browsing |
| **3. Cart + checkout + orders** | Cart page, checkout form, promo field, `/api/order` → database + Telegram, success page, 1-click buy, "notify me", Telegram status buttons | **Orders saved + alerted (MVP)** |
| **4. Admin core** | Login + roles, products with photo upload and sizes, stock grid, orders list/detail with status sync to Telegram, cancel → stock returns | **Owner runs the shop** |
| **5. Admin extended** | Dashboard, reports + Excel export, content & settings, promo codes, staff management, activity log | Full control & insight |
| **6. Content + launch** | Info and legal pages, 404, SEO (server-rendered pages, sitemap, structured data), analytics, **real products entered in admin**, domain, Pro plans, QA | **Public launch** |
| **7. Growth** | Customer notifications in the bot, online payment (Click/Payme), reviews, Instagram feed, abandoned-cart reminders | Scale |

### Launch QA checklist
- [ ] Order end-to-end on iPhone Safari, Android Chrome, desktop Chrome/Edge/Firefox; RU/UZ/EN; light/dark
- [ ] Order is saved in admin **and** the Telegram message arrives; formatting correct, special characters escaped, totals match
- [ ] Server rejects tampered prices, unknown sizes, expired/over-used promo codes
- [ ] Two simultaneous orders for the last pair: only one succeeds
- [ ] Stock decreases on order and **returns on cancel**
- [ ] Status change in Telegram appears in admin, and vice versa
- [ ] Telegram outage → order still saved, customer gets the number, alert retried
- [ ] **A manager can't open staff/settings; a visitor can't read orders** (RLS tests)
- [ ] Photo upload from a phone works; images resized; product page loads fast
- [ ] Spam: honeypot + rate limit work; admin login rate-limited
- [ ] All links work, 404 page, no horizontal scroll on phones
- [ ] Lighthouse targets met; analytics events fire; sitemap submitted
- [ ] Legal pages published; contact details correct; backups enabled

---

## 14. Open questions (with the default I'll use unless you say otherwise)

| # | Question | Default |
|---|---|---|
| 1 | Where should orders go: your personal chat or a managers' group? | **Group** with you + managers |
| 2 | Language of the order messages for managers | **Russian** |
| 3 | Delivery methods, prices and free-delivery threshold | Tashkent courier 30 000; regions 50 000; free from 1 500 000 (editable in admin) |
| 4 | Payment methods at launch | Cash or card on delivery + transfer after the call |
| 5 | Default site language for new visitors | Browser language (RU/UZ), else **RU** |
| 6 | Keep English? | Yes, as a third option |
| 7 | Staff: who gets access, with which role? | You = **owner**; managers added later by you in admin |
| 8 | Reserve stock when the order is placed, or only when confirmed? | **On order**, returned automatically on cancel |
| 9 | Supabase region | **Frankfurt (EU)**, closest fast region for Uzbekistan |
| 10 | Is there a physical store / pickup point? | No pickup until you give an address |
| 11 | Working hours for "manager will call" | 10:00–21:00, every day (editable in admin) |
| 12 | Domain name | Use `outlet-lounge.vercel.app` until you buy one |
