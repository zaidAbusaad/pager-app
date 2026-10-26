# pager-app

QR-code pager for restaurants and cafes: the customer scans a code and their
phone alerts them when the order is ready, instead of a hardware buzzer.

Stack: Next.js (App Router) + TypeScript, PostgreSQL, Prisma, Zod, Vitest.

## First-time setup (Windows PowerShell)

```powershell
npm install                  # also runs `prisma generate` automatically
copy .env.example .env       # database connection string
docker compose up -d         # starts Postgres (needs Docker Desktop running)
npm run db:migrate           # creates/updates tables (it asks for a migration name)
npm run db:seed              # creates the demo shop and prints its CASHIER LINK
npm run dev                  # http://localhost:3000
```

No Docker? Use any hosted Postgres (for example Neon) and paste its connection
string into `.env` as `DATABASE_URL`.

After you change `prisma/schema.prisma`: run `npm run db:migrate`, then
`npm run db:generate` (Prisma 7 no longer regenerates the client by itself).

## Scripts

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the app in development                       |
| `npm test`           | Run the unit tests                                 |
| `npm run typecheck`  | Check types without building                       |
| `npm run db:migrate` | Create/apply database migrations                   |
| `npm run db:generate`| Regenerate the typed Prisma client                 |
| `npm run db:seed`    | Demo shop + a NEW cashier link (old link stops working) |
| `npm run db:studio`  | Browse the database in the browser                 |

## Cashier access (step 2)

Each shop has a secret cashier link: `http://localhost:3000/c/<secret>`.
Opening it on any phone turns that phone into the cashier screen. The database
stores only a SHA-256 hash of the secret. Anyone with the link can use the
cashier screen, so treat it like a password; generating a new one invalidates
the old one.

## API

Cashier routes need the header `Authorization: Bearer <secret>`.

| Method | Path                           | Result                                            |
| ------ | ------------------------------ | ------------------------------------------------- |
| GET    | `/api/cashier/orders`          | `{ shop, orders }`: unfinished orders + recently collected |
| POST   | `/api/cashier/orders`          | 201, creates an order. Optional body `{ "number": 27 }`, otherwise the next free number |
| PATCH  | `/api/cashier/orders/:orderId` | body `{ "status": "READY" \| "DONE" \| "PREPARING" }` |

Customer routes (no login, this is what the QR codes open):

| Method | Path                                   | Result                                              |
| ------ | -------------------------------------- | --------------------------------------------------- |
| GET    | `/api/public/shops/:slug`              | `{ name }`                                          |
| POST   | `/api/public/shops/:slug/claim`        | links the phone to the newest waiting order; body `{ "number": 27 }` links that open order instead |
| GET    | `/api/public/orders/:token`            | number + live status (opening it also links the phone) |
| POST   | `/api/public/orders/:token/release`    | "Not my order": cuts this phone off, 204             |

Cashier extra: `POST /api/cashier/orders/:orderId/reset-claim` gives the order a
new secret link and unlinks any phone.

## How customers get linked to an order

Customers never create orders. The cashier creates the order (with the number
they say out loud); the customer's phone then **links** to it.

1. **Counter QR** (printed once): `http://<your-domain>/s/<slug>`. A scan links
   the phone to the newest order created in the last 2 minutes that no phone
   has linked yet. Each order can be linked once.
2. **Typed number**: if nothing is waiting, the page asks for the order number.
3. **Per-order QR**: on the cashier board tap "Phone linked" / "No phone" under
   an order to show its private QR. It always works, however old the order.
   "Reset link" cuts off the current phone and issues a new QR.

The phone remembers its order (browser storage), so scanning the counter QR
again reopens it instead of taking someone else's. "Not my order?" on the
tracking page releases a wrongly linked order.

The cashier board shows who is linked: green "Phone linked" or grey
"No phone" (call those customers out loud as with a normal buzzer).

> When testing with a phone, open the cashier board through your PC's network
> address (e.g. `http://192.168.1.20:3000/c/<token>`), not `localhost`:
> the QR codes contain the address you opened the board with.

Numbers: no two unfinished orders in a shop share a number, but a number can be
reused once its order is collected. The automatic counter skips taken numbers.

Errors: 401 bad/missing secret, 400 invalid input, 404 unknown order (also for
other shops' orders), 409 number already in use, forbidden status change or
concurrent edit.

## Code layout

```
src/domain/        pure business rules (statuses, tokens, errors), no framework
src/repositories/  database contracts (interfaces) + Prisma implementations
src/services/      use cases, depend only on the repository interfaces
src/server/        wiring of real implementations + cashier auth helper
src/validation/    Zod schemas for incoming requests
src/lib/           small shared helpers (db client, HTTP errors, DTOs)
src/app/api/       thin HTTP routes: authenticate -> validate -> call service
src/app/c/[token]/ the cashier screen
```
