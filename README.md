# KAFEO POS

Point-of-sale for KAFEO Café, Shadman, Lahore. It runs in any browser (counter PC, tablet, phone), keeps every device in sync live, and only staff with a login can open it.

**Screens:** Dashboard · Order & billing · Kitchen display · Delivery & riders · Customers & loyalty · Reports & staff incentives · Menu & prices · Settings

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
- **Add order** = send to kitchen, customer pays after food. **Pay** = payment screen: choose Cash / Card / JazzCash / Easypaisa / Bank transfer — tax updates for the method — enter cash received and it shows the change to return. Receipt prints automatically (can be switched off).

**Orders (running bills)**
- Every order added with **Add order** waits here until it's paid — the red number on the **Orders** button shows how many.
- The **table map** shows which tables have a bill and how much; tap a free table to start its order, tap a busy one to jump to its bill.
- Each bill: **Take payment**, **Add items** (new items are flagged “+1 NEW” in the kitchen), **Print bill**. The owner can also cancel.
- **Paid today** lists finished bills for reprinting receipts.

**Kitchen** — new orders beep. *Start preparing → Mark ready → Served / Picked up.* Tickets turn red after 15 minutes. Filter by Kitchen or Bar & coffee. Tap the screen once after opening it so the browser allows the beep.

**Delivery** — assign a rider → *Out for delivery* → *Delivered + cash*. Shows cash each rider should hand in.

**Stock (inventory)**
- **Stock** tab: every ingredient and packaging item with quantity, alert level, cost price and value. **+ Stock in** records a purchase (and updates the cost price), **Waste** records spoilage with a reason, **Count** sets the real shelf count. Owner can add/edit items or tap **Add starter list** for 45 common café items (all at zero).
- **Recipes & food cost** tab (owner edits): for each menu item and size, list the ingredients and amounts. Shows food cost and margin per item.
- Stock goes down **automatically** when an order is added (only new items when a bill is edited) and comes back if the order is cancelled. Every change is in **History**.
- Items at or below their alert level show a red number on the **Stock** button.

**Dashboard (owner)** — first button in the side menu. Live **Right now** cards (website orders waiting, kitchen queue, late tickets, running bills, deliveries out, low stock — tap any to jump there), **Net sales** with the change vs yesterday at the same time, paid orders, average bill, website orders and their share, expenses, sales − expenses, discounts, a **sales by hour / by day** chart against the previous period (hover for numbers, or *View as table*), sales by order type, payment method, category, top 8 items, low stock and the latest orders. Periods: Today, Yesterday, Last 7 days, Last 30 days, This month, Last 3 months, or **Custom** (any From / To dates up to 2 years, with quick buttons for 3 / 6 / 12 months and this year). Long periods show sales by week or by month. Updates by itself when orders change.

**Reports (owner)** — **Reports center** with 18 reports, each with a **start date & time** and **end date & time** (quick buttons: Today, Yesterday, This week, Last 7 days, This month, Last month — “Today” runs 6 AM to 6 AM, changeable in Settings). Every report can be viewed, **downloaded as PDF**, printed on **A4**, printed on the **thermal** printer, or saved for **Excel (CSV)**:
Full Report · Order Report · Order Detail · Items · Category-wise Items · Hourly Sales · Payment Methods · Profit / Loss · Sales Tax (PRA) · Discounts · Expenses · Void / Cancelled · Unpaid Bills · Staff / Cashier · Inventory Consumption · Purchases · Stocks · Specific Stock Item.
The **Live dashboard** tab keeps the quick charts, staff incentives and the **Z-report** (now with expenses and expected cash in the drawer).

**Expenses** — **Add expense** on the Orders screen (any staff): amount, type, payment method, description. Expenses appear in the Full Report, Expense Report, Profit / Loss and Z-report.

**Menu & prices (owner)** — change a price, hide an item, add a new one, upload a photo for any item (shown on the order screen; items without a photo get a coloured category tile). Every counter updates instantly. Prices: `549` for one price, `S=999, M=1549, L=2399` for sizes.

**Settings (owner)** — GST/PRA tax for cash and for card/wallets, prices-include-tax option, PRA/NTN number for receipts, service charge %, delivery fee, rounding, tables, discount limit for cashiers, quick discount buttons, discount reasons, banks, loyalty rule, Buy More Save More, riders.

### Receipts & kitchen tickets
- **Kitchen ticket (KOT)** prints automatically when you press **Add order** or **Pay** on a new order — big text, no prices, table in large letters, item notes highlighted, separate slips for **Kitchen** and **Bar / Coffee**. When you add items to a running bill, only the **new items** print, marked **ADD-ON**. Reprint any time with the **KOT** button on a bill or the printer icon on a kitchen ticket.
- **Customer receipt** prints on payment: Qty / Item / Rate / Amount, discount with reason, service charge, tax, total, cash received and change, the customer's loyalty stamps, and your thank-you message. Reprints say **REPRINT**; unpaid bills say **BILL — PLEASE PAY AT COUNTER**.
- Switch these on/off and change the thank-you message in **Settings → Printing**; use **Test receipt / Test kitchen ticket** to check your printer.

### Printing receipts
Any printer works through the browser's print dialog. For an 80mm thermal printer: install its driver, set it as the default printer, and in Chrome's print dialog choose *Margins: None* once — Chrome remembers it.

---

## Website orders (KAFEO website → POS)

Every order placed on the KAFEO website lands on the POS straight away, and the customer's WhatsApp message to 0304 2077720 still opens as a second copy (plus the email copy).

- On the counter, the **Website** button in the side menu shows a green badge with the number of waiting website orders, a green **🔔 New website order** bar appears on every screen, the page title shows the count, and a chime repeats every 20 seconds until someone handles it. (Tap the screen once after opening the POS so the browser allows sound.)
- **Pop-up notifications:** every new website order also shows a Windows / Mac / Android pop-up, even while the POS tab is open in front. The first time, tap **Turn on notifications** in the yellow bar and choose **Allow** (once per device / browser). The pop-up stays until you handle it; tapping it brings the POS forward and opens the order. If it says *blocked*, click the 🔒 lock next to the web address → Notifications → Allow, then refresh. On Windows, also make sure Chrome notifications are on in Windows Settings → System → Notifications, and Focus / Do not disturb is off.
- Tap **Review & accept**: you see the customer, phone (tap to call or WhatsApp), address with map pin, how they'll pay, items with their choices (spice, add-ons) and any **⚠ Check before accepting** warnings (price didn't match the menu, unknown item…). For delivery, type the delivery fee if any.
- **Accept & send to kitchen** → it becomes a normal order: kitchen ticket prints, it shows on Kitchen / Orders / Delivery, stock goes down, the customer card is saved. **Reject** cancels it (tell the customer).
- Until accepted, website orders never reach the kitchen screen.
- How it works: the website calls the Supabase Edge Function [`supabase/functions/web-order`](supabase/functions/web-order/index.ts), which checks every field and re-checks prices against the website menu in [`catalog.js`](supabase/functions/web-order/catalog.js). **If you change a price on the website, change it in `catalog.js` too** and run `node tools/test-web-order.mjs ../kafeo-website/index.html` (orders still arrive if you forget — just with a price warning).
- Spam protection: max 4 website orders per phone and 10 per connection in 15 minutes; repeats of the same order are ignored.
- **Optional WhatsApp alert straight to your phone** (works even if the customer never presses Send): message `I allow callmebot to send me messages` to the CallMeBot WhatsApp number (see callmebot.com → WhatsApp), it replies with an API key. Then in Supabase → Edge Functions → Secrets add `CALLMEBOT_PHONE` = `923042077720` and `CALLMEBOT_APIKEY` = your key. Done — no code change.

## Updating an existing database

If your database was set up before the discount/tax update, run [`supabase/migrations/002_billing.sql`](supabase/migrations/002_billing.sql) once in the Supabase SQL Editor. (Already applied to the KAFEO project.) For item photos, also run [`supabase/migrations/003_menu_photos.sql`](supabase/migrations/003_menu_photos.sql) once, for inventory [`supabase/migrations/004_inventory.sql`](supabase/migrations/004_inventory.sql), and for expenses [`supabase/migrations/005_expenses.sql`](supabase/migrations/005_expenses.sql), and for website orders [`supabase/migrations/006_website_orders.sql`](supabase/migrations/006_website_orders.sql) (already applied).

## Good to know

- **Internet is needed.** If the connection drops, the dot at the bottom of the side menu turns *Offline*; it reconnects by itself.
- **Supabase free plan** pauses a project after a week with no use at all. Daily café use keeps it awake; if it ever pauses, press *Restore* in Supabase.
- **Backups:** download the orders CSV from Reports regularly (weekly is a good habit).
- **Not included yet:** FBR/PRA e-invoicing, automatic Foodpanda import (enter those orders by hand), stock/inventory.
- **Order numbers** start at 1001 and always go up. Occasionally a number is skipped — that's normal for the database and doesn't mean a missing order.
- **Changing the starting menu file:** prices are managed in the app after setup. `js/menu-seed.js` is only the first-time seed; if you edit it, run `node tools/build-sql.mjs` to rebuild `supabase/schema.sql`.

## Releasing an update

Run `node tools/stamp-version.mjs` before committing. It stamps a new version on every file link so counters load the new code straight away (otherwise browsers can keep old files for ~10 minutes). The version shows under **Me** in the app.

## Try it on your own computer

ES modules don't load from a double-clicked file, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
