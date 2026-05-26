# toBayt — Local Experts Marketplace

A web app for booking vetted local experts in Doha, Qatar.
**Auth + file uploads run on Supabase.** A tiny Node/Express server stores domain data (providers, posts, bookings, threads) in a JSON file.

## Quick start

```bash
npm install
npm start
```

Visit **http://localhost:3000**.

## Supabase setup (one-time)

The frontend is already wired to this Supabase project:

```
URL:  https://kbqomjfotufnugdokefh.supabase.co
Key:  sb_publishable_MzeBgqZlMpkKdP_FirdFHg_qCHUPOtI
```

For things to work end-to-end you need:

### 1. Disable email confirmation (for the demo)
Dashboard → **Authentication → Providers → Email** → turn **off** "Confirm email".
(If you leave it on, users have to click an email link before they can log in — fine for prod, annoying for testing.)

### 2. Make storage buckets public
For each bucket — `provider-avatars`, `work-proof-posts`, `service-thumbnails`, `id-verification`, `chat-attachments`:
Dashboard → **Storage → bucket → Policies → New policy → Get started quickly → "Allow public read"**.

If you want stricter access, run this SQL in the Supabase SQL editor to allow authenticated uploads + public reads:

```sql
-- Public read on all buckets
create policy "Public read" on storage.objects for select using (true);

-- Authenticated users can upload to any bucket
create policy "Authenticated upload" on storage.objects for insert
  to authenticated with check (true);
```

### 3. (Optional) Switch to your own Supabase project
Edit `public/index.html` near the top of the `<script>` block:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_...';
```

## Accounts

### Admin shortcut (always works, no DB account needed)
- **Email:** `1234`
- **Password:** `1234`

Goes straight to the admin dashboard. This bypasses Supabase entirely — useful for testing without creating a real account.

### Real accounts
- Click **Sign up** in the navbar.
- Choose **Client** (simple form) or **Provider** (6-step wizard with optional avatar + ID upload).
- Provider applications land in admin's "Pending applications" queue and only appear in the explore feed once approved.

Real accounts persist in **Supabase Auth** — they survive server restarts, redeploys, anything.

## How storage works

| Bucket               | Used for                                          | Where in the UI |
|----------------------|---------------------------------------------------|-----------------|
| `provider-avatars`   | Provider profile photos                           | Provider signup (step 3), Provider profile (camera icon on avatar) |
| `id-verification`    | Qatari ID / CR documents for verification         | Provider signup compliance step |
| `work-proof-posts`   | Photos attached to feed posts                     | Provider dashboard → "New post" button |
| `service-thumbnails` | Service card images                               | _(bucket reserved, UI not wired yet)_ |
| `chat-attachments`   | Files shared in messages                          | _(bucket reserved, UI not wired yet)_ |

Files are uploaded directly from the browser to Supabase storage; only the resulting public URL is sent to the backend.

## Project layout

```
.
├── server.js         # Express API + JSON persistence (NO AUTH — Supabase handles that)
├── package.json
├── data.json         # auto-created, gitignored — provider/booking/post/thread data
└── public/
    └── index.html    # entire React app (no build step)
```

## Roles & flows

| Role     | Can                                                                                       |
|----------|-------------------------------------------------------------------------------------------|
| Guest    | Browse landing, feed, explore, view providers. Booking & messaging redirect to login.     |
| Client   | Book sessions, manage bookings, pay, reschedule, cancel, message providers.               |
| Provider | View dashboard, post work-proof photos, edit profile/bio/avatar. Account starts `pending`. |
| Admin    | Approve/reject pending providers. Can toggle into Client or Provider views via navbar.    |

## API endpoints (backend — no auth required)

- `GET /api/providers` — list approved (filters: cat, q, verified, maxPrice, sort, …)
- `GET /api/providers/pending` — applications queue (admin uses this)
- `POST /api/providers` — create/update provider record (called after Supabase signup)
- `PUT /api/providers/:id` — edit provider profile
- `PUT /api/providers/:id/status` — `{status: 'approved' | 'rejected'}`
- `GET /api/posts`, `POST /api/posts` — feed posts (with `imageUrl` from Supabase storage)
- `GET /api/bookings`, `POST /api/bookings`, `PUT /api/bookings/:id`
- `GET /api/threads/:bookingId`, `POST /api/threads/:bookingId`, `POST /api/threads/:bookingId/read`

Auth + file uploads happen client-side through `@supabase/supabase-js`.

## Deploying

Anywhere that runs Node — Render, Railway, Fly.io, etc.

```bash
PORT=8080 npm start
```

**Heads-up on free tiers (Render, etc.):** their filesystem is ephemeral, so `data.json` gets wiped when the dyno restarts. User accounts are safe (they live in Supabase) but provider profiles / bookings / posts will reset. For full persistence, move those tables into Supabase too (or any hosted DB).

## License

MIT
