# Bombtrack Knowledge & Advice (Partbase)

The Bombtrack knowledge app on Cloudflare Workers: chat with Claude, products, compare, bike knowledge, tools, customer requests and academy.

## How it fits together

| Part | What it does |
|---|---|
| `app/` | The app itself (one page). `template.html` + `academy.js` + `kb.json` (product data) + `fonts.css` |
| `app/build.py` | Builds `public/index.html` for Cloudflare (`--claude` builds the Claude artifact version) |
| `src/shim.js` | Gives the app the same `window.claude` interface it has in Claude, backed by this Worker |
| `src/worker.js` | Password login, Claude API proxy (`/api/chat`), document store on D1 (`/api/db/*`) |
| `schema.sql` | D1 tables |

The Claude API key only lives in Cloudflare as a secret. Browsers never see it.

**Roles:** team password = staff, dealers, distributors. Admin password = also Settings, Open questions, Statistics, New content, Archive.

## First setup (once)

1. **D1 database**
   ```
   npm install
   npx wrangler login
   npx wrangler d1 create partbase
   ```
   Paste the printed `database_id` into `wrangler.jsonc`, then:
   ```
   npm run db:init
   ```
2. **Secrets**
   ```
   npx wrangler secret put ANTHROPIC_API_KEY   # from platform.claude.com/settings/keys
   npx wrangler secret put TEAM_PASSWORD
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET      # any random text, at least 16 characters
   ```
3. **Deploy**: either `npm run deploy`, or connect the GitHub repo in Cloudflare
   (Workers & Pages › Create › Import a repository) with
   build command `python3 app/build.py` and deploy command `npx wrangler deploy`.
   Every push to `main` then deploys automatically.

## Day to day

- Change the app in `app/`, run `npm run build`, commit, push.
- Local test: create `.dev.vars` with the four secrets, then `npm run dev`.
- Spending: set a monthly limit in Claude Console (platform.claude.com/settings/limits).
  The Worker also caps chat calls per browser per hour (`CHAT_LIMIT_PER_HOUR`).

## Models

| Tier | Model | Used for |
|---|---|---|
| quick | claude-haiku-5-5 | Counter practice customer lines |
| default | claude-sonnet-5-5 | Chat, customer request drafts, feedback, monthly report |
| complex | claude-opus-5-5 | not used yet |

Override with `MODEL_QUICK`, `MODEL_DEFAULT`, `MODEL_COMPLEX` in `wrangler.jsonc` vars.

## Handing over to a client

The client creates its own Cloudflare account, Claude Console organisation and API key, and its own GitHub repo (copy of this one). Set its secrets and D1 id; nothing in the app changes.

## Security

- Passwords and the API key are Cloudflare secrets (encrypted, never in GitHub, never sent to the browser).
- Login cookie: HttpOnly, Secure, signed (HMAC), valid 30 days.
- Max 10 login attempts per IP per 15 minutes.
- Changing `TEAM_PASSWORD` or `ADMIN_PASSWORD` logs out everyone with that role; changing `SESSION_SECRET` logs out everyone.
- Admin-only data (settings, team answers, uploads) is enforced on the server, not just hidden in the UI.
- Pages are marked noindex and cannot be embedded in other sites.

## Updating product data (sync)

When the website data, catalogs or a new model year are synced into `app/kb.json`, everything in the app that is built from the data updates on the next build: products, compare, geometry, size finder, tyre check, chat and the **spoke calculator** presets.

The spoke calculator is a workshop tool: the right spoke length for replacing spokes or rebuilding a Bombtrack wheel. Its presets come from each bike's `Wheels` data (ERD per size group, spoke count, hub PCD, flange distance / offset, Bombtrack's published spoke lengths). New bikes, sizes and wheel groups appear automatically.

`python3 app/build.py` runs `app/checks.py` first. It recalculates every spoke preset and prints warnings for wheels with missing data, size groups without a published length, or more than 3 mm between calculation and Bombtrack's length. Read these after every sync. Known open points (Nov 2026): Beyond 1 / 2 / SUS front XS-S and Munroe Cargo front (20") differ by 3 to 5 mm from Bombtrack's published lengths, probably an ERD value to confirm with Bombtrack.

