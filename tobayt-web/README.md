# toBayt — Local Experts Marketplace

A web app for booking vetted local experts in Doha, Qatar. Express + plain-React (CDN, no build step) + JSON-file persistence.

## Quick start

```bash
npm install
npm start
```

Visit **http://localhost:3000**.

## Accounts

### Admin shortcut (built in — always works)
- **Email:** `1234`
- **Password:** `1234`

Goes straight to the admin dashboard. From there an admin can also toggle to client/provider views via the navbar role switcher.

### Regular users
- Click **Sign up** in the navbar.
- Choose **Client** (simple form) or **Provider** (5-step onboarding wizard).
- Provider applications land in admin's "Pending applications" queue and only appear in the explore feed once approved.

All real accounts are persisted to `data.json` (auto-created on first run, gitignored).

## How persistence works

- `data.json` in the project root stores users, providers, bookings, posts, threads.
- Passwords are hashed with **bcrypt** (10 rounds).
- Sessions use **JWT** stored in `localStorage` under `tobayt_token`.
- The JWT secret comes from `process.env.JWT_SECRET` and falls back to a dev default — **change it for production**.

## Project layout

```
.
├── server.js         # Express API + auth + JSON persistence
├── package.json
├── data.json         # auto-created, gitignored — your live data
└── public/
    └── index.html    # entire React app (no build step)
```

## Roles & flows

| Role     | Can                                                                                                       |
|----------|-----------------------------------------------------------------------------------------------------------|
| Guest    | Browse landing, feed, explore, view providers. Booking & messaging redirect to login.                     |
| Client   | Book sessions, manage bookings, pay, reschedule, cancel, message providers.                               |
| Provider | View dashboard, see bookings TO them, edit profile/bio/rate. Account starts `pending` — admin must approve. |
| Admin    | Approve/reject pending providers, view all users. Can toggle into Client or Provider views via navbar.    |

## API endpoints

- `POST /api/auth/signup` — `{email, password, name, role, providerData?}`
- `POST /api/auth/login` — `{email, password}` → `{token, user}`
- `GET /api/auth/me` — verify token, return user
- `GET /api/providers` — list approved (filters: cat, q, verified, maxPrice, sort, …)
- `GET /api/providers/pending` (admin) — applications queue
- `PUT /api/providers/:id/status` (admin) — `{status: 'approved' | 'rejected'}`
- `PUT /api/providers/:id` — provider edits their own profile
- `GET /api/posts`, `POST /api/posts` (provider)
- `GET /api/bookings`, `POST /api/bookings`, `PUT /api/bookings/:id`
- `GET /api/threads/:bookingId`, `POST /api/threads/:bookingId`, `POST /api/threads/:bookingId/read`
- `GET /api/users` (admin)

## Deploying

Anywhere that runs Node + has a writable disk. Set `JWT_SECRET` and optionally `PORT`:

```bash
JWT_SECRET="long-random-string" PORT=8080 npm start
```

For platforms with ephemeral filesystems (Vercel, Netlify Functions, Heroku free) replace the `data.json` layer with a real DB — the API surface is small enough that swapping the persistence is straightforward.

## License

MIT
