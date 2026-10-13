# Launch checklist

Everything the owner must do (or decide) before the shop goes public. Items marked 🤖 can be done by
the developer once you give the go-ahead; the rest need your own accounts or decisions.

## 1. Content (admin panel → /admin)

- [ ] **Settings → Contacts:** phone, working hours, manager's Telegram, bot, Instagram, address.
- [ ] **Settings → Company details:** company / sole-trader name, INN, legal address, e-mail, return period.
      These fill the public offer, the privacy policy and the footer.
- [ ] **Settings → Delivery:** prices for Tashkent and the regions, free-delivery threshold.
- [ ] **Products:** enter the real catalog (photos, prices, sizes with quantities). Then hide the
      18 placeholder products (select them in *Products* → **Hide**).
- [ ] **Read the information pages** (/delivery, /returns, /authenticity, /about, /faq) and the two legal
      pages (/offer, /privacy) — they are a working template. Have the offer and the privacy policy
      reviewed by a lawyer; tell the developer what to change (the texts live in `assets/js/info-content.js`).
- [ ] **Settings → Telegram:** press "Send a test message" — it must arrive in the managers' group.
- [ ] **Staff:** add every manager with their own username and password.

## 2. Accounts and money

- [ ] **Vercel Pro** (~$20/month). The free Hobby plan is for non-commercial use only.
- [ ] **Supabase Pro** (~$25/month): daily backups, no pausing after a quiet week.
- [ ] **Domain** — a `.uz` name from an accredited registrar (see §3).
- [ ] Revoke the bot token that was ever pasted in a chat (@BotFather → /mybots → API Token → Revoke),
      put the new one in Vercel (`TELEGRAM_BOT_TOKEN`), redeploy, run the Telegram `webhook` setup step
      (README → "Telegram order alerts").

## 3. Domain 🤖

1. Buy the domain (for example `outletlounge.uz`).
2. Vercel → Project → Settings → **Domains** → add it; at the registrar set the DNS records Vercel shows.
3. Vercel → Settings → Environment Variables → `SITE_URL=https://outletlounge.uz` → redeploy
   (canonical links, sitemap and robots.txt follow it).
4. Supabase → Authentication → URL configuration: set the **Site URL** and add `https://<domain>/admin`
   (or change `supabase/config.toml` and run `npx supabase config push`).
5. Re-run the Telegram `webhook` step so the bot calls the new address (set `SITE_URL` there too).

## 4. Search engines and analytics

- [ ] **Settings → Analytics:** the Yandex Metrica counter number and/or the Google Analytics 4 id.
      Events sent: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `search`, `click_telegram`.
- [ ] **Google Search Console** and **Yandex Webmaster:** add the site, verify it (DNS record is the
      easiest; or send the developer the verification file), submit `https://<domain>/sitemap.xml`.
- [ ] **Settings → Launch → "Let search engines index the shop"** — switch it on **on launch day**.
      While it is off the site is closed to Google and Yandex (noindex, robots.txt `Disallow: /`,
      empty sitemap), so test data never reaches search results.

## 5. Final QA

- [ ] Place a real order on a phone (iPhone Safari and Android Chrome), in RU and UZ: it appears in the
      admin panel **and** in Telegram; the totals match; the status buttons work both ways.
- [ ] Cancel that order: the stock returns.
- [ ] Open a product link in Telegram and Instagram: the preview shows the photo, name and price.
- [ ] Switch language and light/dark theme; check there is no sideways scrolling on a phone.
- [ ] Run PageSpeed Insights on the home page and a product page (targets: Performance ≥ 85,
      Accessibility ≥ 95, SEO ≥ 95).
- [ ] `https://<domain>/robots.txt` and `/sitemap.xml` look right after the indexing switch is on.
- [ ] Supabase backups are enabled (Pro plan).
