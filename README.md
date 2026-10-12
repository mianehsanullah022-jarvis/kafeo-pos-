# KAFEO POS

Point-of-sale for KAFEO Café, Shadman, Lahore. It runs in any browser (counter PC, tablet, phone), keeps every device in sync live, and only staff with a login can open it.

**Screens:** Order & billing · Kitchen display · Delivery & riders · Customers & loyalty · Reports & staff incentives · Menu & prices · Settings

This repo is the POS only. The KAFEO website lives in its own repo and is not touched by this one.

---

## How it fits together

| Part | What it does | Cost |
|---|---|---|
| **GitHub Pages** (this repo) | Hosts the app at `https://<your-github-name>.github.io/kafeo-pos/` | Free |
| **Supabase** | Staff logins (email + password), the database, live sync between devices | Free plan is enough to start |

Until Supabase is connected, the app runs in **demo mode**: everything works, but data stays in that one browser. Use it to train staff.

---

## Step 1 — Put the app on GitHub (5 min)

1. On GitHub, create a **new repository** named `kafeo-pos` (keep it separate from the website repo). Public or private both work — see note below.
2. Upload all the files from this folder (keep the folder structure: `index.html`, `css/`, `js/`, `supabase/`, …).
3. Repo **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. After a minute, open `https://<your-github-name>.github.io/kafeo-pos/`. You'll see the login screen in demo mode.
   Demo logins: `owner@demo`, `cashier@demo`, `kitchen@demo`, `rider@demo` — password `kafeo123`.

> **Public vs private repo:** the code being visible doesn't expose your data — sales, customers and orders live in Supabase behind staff logins. GitHub Pages on a *private* repo needs a paid GitHub plan.

---

## Step 2 — Create the database (10 min)

1. Sign up at **supabase.com** → **New project**. Name it `kafeo-pos`, choose a strong database password (save it somewhere safe), and pick the region closest to Lahore that's offered.
2. When the project is ready, open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and press **Run**. This creates the tables, the security rules and your full current menu.
3. **Turn off public sign-ups** (important): **Authentication → Sign In / Providers** (or *Auth settings*) → switch **off** “Allow new users to sign up”. Only you will create logins.

---

## Step 3 — Add staff logins (1 min each)

1. **Authentication → Users → Add user → Create new user.** Enter an email and password, tick **Auto Confirm User**, save.
   Staff don't need real email inboxes — `counter1@kafeo.pk` works fine as a login name.
2. Give that login a name and role. In **SQL Editor**, run (change the email, name and role):

```sql
insert into public.profiles (id, name, role)
select id, 'Ehsanullah', 'owner' from auth.users where email = 'you@example.com';
```

Roles:

| Role | Can use |
|---|---|
| `owner` | Everything, including Reports, Menu & prices, Settings, cancelling orders, editing loyalty stamps |
| `cashier` | Order & billing, Kitchen, Delivery, Customers |
| `kitchen` | Kitchen display only |
| `rider` | Delivery list only |

**Block someone straight away** (e.g. staff leaves):

```sql
update public.profiles set active = false
where id = (select id from auth.users where email = 'counter1@kafeo.pk');
```

A login without an active profile can't see or change anything, even if it signs in.

**Reset a password:** Authentication → Users → open the user → set a new password. Staff can also change their own from the **Me** button in the app.

---

## Step 4 — Connect the app to the database (2 min)

1. In Supabase: **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. In this repo, edit [`js/config.js`](js/config.js) and paste them in:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

3. Commit. A minute later the app at your GitHub Pages address shows a normal login (no demo banner). Sign in with the owner login.

> The *anon public* key is meant to be in website code. **Never** paste the `service_role` key anywhere in this repo — that one bypasses all security.

---

## Daily use

**Counter (Order screen)**
- Categories on the left, items in the middle, the **order summary** on the right. The **Save order** and **Pay** buttons are always at the bottom of the summary.
- Tap an item to add it (pizzas: tap S / M / L). A green number shows how many are already in the order.
- Pick **Dine-in / Takeaway / Delivery**. Tap **Pick table**, **Customer** or **Note** to open the order details (tables with an open bill are marked).
- Tap an item in the summary to change quantity or add a note for the kitchen (*no onions, extra spicy…*).
- **Discount** opens the discount section: whole bill or item-wise, percentage or fixed rupees, quick buttons, a reason (bank/card offer with bank name, friend & family, staff meal…), and a live preview of the new total. Cashiers are limited to the % set in Settings; the owner has no limit. Loyalty rewards apply with one tap when a customer's card is full.
- **Service charge** (dine-in) can be switched on/off per order. **Delivery fee** can be changed per order.
- **Save order** = send to kitchen, pay later. **Pay** = payment screen: choose Cash / Card / JazzCash / Easypaisa / Bank transfer — tax updates for the method — enter cash received and it shows the change to return. Receipt prints automatically (can be switched off).
- **Open bills** — take payment, print a bill, or **Add items / edit** an existing bill (new items are flagged “+1 NEW” in the kitchen).

**Kitchen** — new orders beep. *Start preparing → Mark ready → Served / Picked up.* Tickets turn red after 15 minutes. Filter by Kitchen or Bar & coffee. Tap the screen once after opening it so the browser allows the beep.

**Delivery** — assign a rider → *Out for delivery* → *Delivered + cash*. Shows cash each rider should hand in.

**Reports (owner)** — today / 7 days / 30 days, sales by hour, payments, top sellers, staff incentives worked out from your policy tiers, **Print Z-report** at closing, and **Download orders (CSV)** for Excel.

**Menu & prices (owner)** — change a price, hide an item, add a new one. Every counter updates instantly. Prices: `549` for one price, `S=999, M=1549, L=2399` for sizes.

**Settings (owner)** — GST/PRA tax for cash and for card/wallets, prices-include-tax option, PRA/NTN number for receipts, service charge %, delivery fee, rounding, tables, discount limit for cashiers, quick discount buttons, discount reasons, banks, loyalty rule, Buy More Save More, riders.

### Printing receipts
Any printer works through the browser's print dialog. For an 80mm thermal printer: install its driver, set it as the default printer, and in Chrome's print dialog choose *Margins: None* once — Chrome remembers it.

---

## Updating an existing database

If your database was set up before the discount/tax update, run [`supabase/migrations/002_billing.sql`](supabase/migrations/002_billing.sql) once in the Supabase SQL Editor. (Already applied to the KAFEO project.)

## Good to know

- **Internet is needed.** If the connection drops, the dot at the bottom of the side menu turns *Offline*; it reconnects by itself.
- **Supabase free plan** pauses a project after a week with no use at all. Daily café use keeps it awake; if it ever pauses, press *Restore* in Supabase.
- **Backups:** download the orders CSV from Reports regularly (weekly is a good habit).
- **Not included yet:** FBR/PRA e-invoicing, automatic Foodpanda import (enter those orders by hand), stock/inventory.
- **Order numbers** start at 1001 and always go up. Occasionally a number is skipped — that's normal for the database and doesn't mean a missing order.
- **Changing the starting menu file:** prices are managed in the app after setup. `js/menu-seed.js` is only the first-time seed; if you edit it, run `node tools/build-sql.mjs` to rebuild `supabase/schema.sql`.

## Try it on your own computer

ES modules don't load from a double-clicked file, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
