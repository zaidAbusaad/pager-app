# Deploying Pagerly (Vercel + managed Postgres + pagerlyjo.app)

Everything below is done once. Takes about 30 minutes.

## 1. Database (Neon, free tier is enough to start)

1. Create an account at neon.tech and a project. Pick the region closest to
   Jordan (for example Frankfurt).
2. Copy the **connection string** (it ends with `?sslmode=require`).
3. Keep it secret: it is the password to all your data.

## 2. Hosting (Vercel)

1. Push the repository to GitHub (private repo is fine).
2. At vercel.com choose **Add New > Project** and import the repository.
3. Under **Environment Variables** add:
   - `DATABASE_URL` = the Neon connection string
4. Deploy. The script `vercel-build` runs `prisma migrate deploy` first, so the
   tables are created automatically on every deploy, then `next build`.

If the build fails with a database error, check that `DATABASE_URL` is set for
the **Production** environment and that the string is the direct (not
"pooled") one: migrations need a direct connection. Neon shows both; the
direct one has no `-pooler` in the host name.

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

## 5. Backups

Turn on point-in-time recovery / daily backups in the Neon dashboard (paid
plan) or schedule `pg_dump` yourself. Do this before the first paying customer.

## What is NOT set up yet

- Email (password reset, receipts). Password help goes through WhatsApp for now.
- Online payments.
- Error monitoring (Sentry). Add it when you have real traffic.
- Rate limits live in the database, so they work across all server instances.
  Limits and numbers are in `src/domain/rate-limit.ts`.
