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
   npx wrangler secret put SESSION_SECRET      # any long random text
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
