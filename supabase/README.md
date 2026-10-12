# Supabase — database for Outlet Lounge

Everything the shop stores lives here: products, sizes & stock, photos, orders, promo
codes, settings and staff. The storefront reads it through `/api/catalog`.

```
supabase/
├─ config.toml                          CLI config (public sign-up is OFF)
├─ migrations/20261012000000_init.sql   tables, row level security, place_order(), set_order_status(), storage bucket
├─ seed.sql                             placeholder catalog (generated: `npm run seed`)
└─ tests/                               database tests (in-memory Postgres): `npm run test:db`
```

## Current project

- Project: `outlet-lounge`, ref `wtuzvultdyyviohxsbez`, region eu-central-1 (Frankfurt)
- Applied: `20261012000000_init.sql` + `seed.sql`
- Vercel (production) has `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The `service_role` key is added in phase 3 (orders), not before.
- The generated database password is in the git-ignored `.env.local` (`SUPABASE_DB_PASSWORD`); it can be reset in Dashboard → Project Settings → Database.

## Setting up from scratch (for a new project)

1. **Create the project** at <https://supabase.com> → New project.
   Name `outlet-lounge`, region **Frankfurt (eu-central-1)**, a strong database password
   (store it in a password manager — it is not needed on the website).
2. **Turn off public sign-up:** Authentication → Sign In / Providers → switch off
   "Allow new users to sign up". Staff are invited by the owner.
3. **Sign the Supabase CLI in** (opens a browser window to approve):
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```
   The *project ref* is the part before `.supabase.co` in the project URL.
4. **Create the tables and load the placeholder products:**
   ```bash
   npx supabase db push --include-seed
   ```
5. **Add the environment variables in Vercel** (Project → Settings → Environment Variables, *Production* and *Preview*):

   | Name | Where to find it | Secret? |
   |---|---|---|
   | `SUPABASE_URL` | Project Settings → API → Project URL | no |
   | `SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key | **yes** (phase 3+) |

   The `service_role` key bypasses all security rules — never put it in code, git or chat.
6. **Redeploy** (`vercel --prod`). The site now shows live data; open
   `https://<your-site>/api/catalog` to see the JSON.

## Make yourself the owner

After you have created your own login (Authentication → Users → Add user → *Create new user*,
tick "Auto Confirm User"), run this once in **SQL Editor** — replace the email:

```sql
insert into public.staff (user_id, name, role)
select id, 'Owner', 'owner' from auth.users where email = 'you@example.com';
```

Managers are added the same way with `'manager'` (the admin panel will do this for you in phase 4).

## Shop contact details

The footer, the “Ask a manager” button, the thank-you page and the checkout fallback read the public
`contacts` setting. Until it exists those buttons stay hidden (only the default working hours show).
Fill in the real values in **SQL Editor** (the admin panel will edit this later):

```sql
insert into public.settings (key, value, is_public) values ('contacts', jsonb_build_object(
  'phone', '+998 90 123 45 67',        -- shown in the footer, tap to call
  'hours', '10:00–21:00',              -- "a manager will call within … (daily 10:00–21:00)"
  'call_minutes', 15,
  'telegram', 'manager_username',      -- the managers' Telegram account (without @)
  'telegram_bot', 'shop_bot_username', -- the order bot (for "Track in Telegram")
  'instagram', 'shop_instagram'
), true)
on conflict (key) do update set value = excluded.value, updated_at = now();
```

## Changing the database

Never edit tables by hand in production. Add a new file
`supabase/migrations/<timestamp>_<what>.sql`, test it (`npm run test:db`), then
`npx supabase db push`.

## What the rules guarantee (tested in `tests/run.mjs`)

- Visitors can read **active** products, sizes, images and public settings — nothing else.
- Orders can only be created through `place_order()` (server only). Prices and stock always
  come from the database; the browser's numbers are ignored.
- The last pair can't be sold twice; one unavailable line cancels the whole order.
- Cancelling an order returns the stock and the promo-code use.
- Managers work with orders, products and stock; only owners touch staff, promo codes,
  private settings and deletions.
