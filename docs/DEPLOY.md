# Deploying Pagerly (Vercel + managed Postgres + pagerlyjo.app)

Everything below is done once. Takes about 30 minutes.

## 1. Database (Neon, free tier is enough to start)

1. Create an account at neon.tech and a project. Pick the region closest to
   Jordan (for example Frankfurt).
2. Copy **two** connection strings from the Connect dialog (both end with
   `?sslmode=require`):
   - the **pooled** one: the host contains `-pooler` (the "Connection pooling"
     switch is on). The running app uses it.
   - the **direct** one: no `-pooler` in the host (switch off). Only database
     migrations use it.
3. Keep both secret: they are the password to all your data.
4. Before the first real shop, move the project to a paid plan (no auto-sleep,
   backups). The free plan is fine for your own testing.

## 2. Hosting (Vercel)

1. Push the repository to GitHub (private repo is fine).
2. At vercel.com choose **Add New > Project** and import the repository.
3. Under **Environment Variables** add:
   - `DATABASE_URL` = the Neon **pooled** connection string
   - `DIRECT_URL` = the Neon **direct** connection string
4. Deploy. The script `vercel-build` runs `prisma migrate deploy` first, so the
   tables are created automatically on every deploy, then `next build`.

If the build fails with a database error, check that both variables are set
for the **Production** environment, and that `DIRECT_URL` is the string
*without* `-pooler`: migrations need a direct connection.

Note: Vercel's free Hobby plan is for non-commercial use only. A paid product
needs the Pro plan.

## 3. Your domain (pagerlyjo.app)

1. In Vercel: **Project > Settings > Domains > Add** `pagerlyjo.app`.
2. Vercel shows DNS records. Add them where you bought the domain.
3. Wait a few minutes. HTTPS is automatic (`.app` domains require it).

## 4. After the first deploy

- Open `https://pagerlyjo.app/ar` and `/en`.
- Open `https://pagerlyjo.app/api/health`: it must answer `{"ok":true}`.
- Create your owner account, add a branch, open the cashier link on a phone,
  scan the customer QR with another phone. Test sound and vibration on iPhone
  and Android.
- Add `https://pagerlyjo.app/api/health` to a free uptime monitor
  (UptimeRobot, Better Stack) so you get a message when the site is down.

## Managing accounts (activation and renewals)

New owners can sign up, but their account stays **pending** until you activate
it: the cashier screen refuses to work. Payment is arranged on WhatsApp, then
you run one command on your own PC (there is no admin web page).

```powershell
npm run admin -- list                          # every account and its status
npm run admin -- activate owner@cafe.jo 1      # +1 month (first activation too)
npm run admin -- activate owner@cafe.jo 12     # a yearly payment
npm run admin -- deactivate owner@cafe.jo      # stop the cashier right now
npm run admin -- reset-password owner@cafe.jo  # forgot password (see below)
```

**Forgot password.** The login page links to WhatsApp. First check it is really
the owner (their WhatsApp number should match the phone shown by `list`). Then
use the Neon SQL Editor (no PowerShell needed). Paste this, put the owner's
email in the one place marked, and run it:

```sql
WITH pw AS (
  SELECT substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) AS pw,
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) AS salt
),
upd AS (
  UPDATE "Owner"
  SET "passwordHash" = 'sha256$' || (SELECT salt FROM pw) || '$' ||
        encode(sha256(convert_to((SELECT salt FROM pw) || (SELECT pw FROM pw), 'UTF8')), 'hex'),
      "mustChangePassword" = true
  WHERE "email" = lower('owner@cafe.jo')   -- <-- the owner's email
  RETURNING "id"
),
gone AS (
  DELETE FROM "OwnerSession" WHERE "ownerId" IN (SELECT "id" FROM upd)
)
SELECT pw AS temporary_password, (SELECT count(*) FROM upd) AS accounts_changed FROM pw;
```

It shows the temporary password once, and `accounts_changed` must be 1 (0 means
the email does not exist). It also ends every login of that account. Send the
password on WhatsApp: the owner is forced to choose their own at the next login,
and the temporary password stops working then. (`npm run admin -- reset-password`
does the same from your PC if you ever prefer it.)

Renewing adds to the current end date, so paying early loses no days. When an
account ends there is a 3-day grace period, then the cashier screen stops.
Nothing is ever deleted: the owner can still log in and see their data, and it
all works again after the next `activate`.

The command changes whichever database `.env` points to, and prints it first.
For the real (Neon) database, set the direct string for this one PowerShell
window only, then remove it:

```powershell
$env:DIRECT_URL = "<paste the Neon DIRECT string>"
npm run admin -- list
Remove-Item Env:DIRECT_URL
```

## 5. Backups

Turn on point-in-time recovery / daily backups in the Neon dashboard (paid
plan) or schedule `pg_dump` yourself. Do this before the first paying customer.

## What is NOT set up yet

- Email (password reset, receipts). Password help goes through WhatsApp for now.
- Online payments.
- Error monitoring (Sentry). Add it when you have real traffic.
- Rate limits live in the database, so they work across all server instances.
  Limits and numbers are in `src/domain/rate-limit.ts`.
