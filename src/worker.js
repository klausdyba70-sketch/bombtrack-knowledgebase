/* Partbase Worker: serves the app behind a password and provides the API the shim talks to.
   Secrets (wrangler secret put …): ANTHROPIC_API_KEY, TEAM_PASSWORD, ADMIN_PASSWORD, SESSION_SECRET
   Bindings: ASSETS (public/), DB (D1) */

const MODELS = { quick: "claude-haiku-5-5", default: "claude-sonnet-5-5", complex: "claude-opus-5-5" };
const ADMIN_WRITE = new Set(["team", "settings", "kbcontent", "kbchunks"]);
const SESSION_DAYS = 30;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      await ensureSchema(env);
      if (url.pathname === "/login" && req.method === "POST") return login(req, env);
      if (url.pathname === "/logout") return new Response(null, { status: 302, headers: { location: "/", "set-cookie": cookie("", 0) } });

      const s = await session(req, env);
      if (!s) {
        if (url.pathname.startsWith("/api/")) return json({ code: "session_expired", message: "Not logged in" }, 401);
        return secure(new Response(loginPage(url.searchParams.get("e")), { headers: { "content-type": "text/html; charset=utf-8" } }));
      }
      if (url.pathname === "/api/me") return json({ role: s.role, uid: s.uid });
      if (url.pathname === "/api/chat" && req.method === "POST") return chat(req, env, s);
      if (url.pathname.startsWith("/api/db/")) return dbApi(req, env, s, url);
      if (url.pathname.startsWith("/api/")) return json({ code: "not_found" }, 404);
      return secure(await env.ASSETS.fetch(req));
    } catch (e) {
      return json({ code: "error", message: String(e && e.message || e) }, 500);
    }
  }
};

/* ---------------- schema (created on first request if missing) ---------------- */
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (col, id))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS docs_col_updated ON docs(col, updated)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS usage (uid TEXT NOT NULL, hour INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (uid, hour))"),
  ]);
  schemaReady = true;
}

/* ---------------- auth ---------------- */
const LOGIN_TRIES = 10, LOGIN_WINDOW_MIN = 15;
const configured = (env) => String(env.SESSION_SECRET || "").length >= 16 && (env.TEAM_PASSWORD || env.ADMIN_PASSWORD);
async function login(req, env) {
  if (!configured(env)) return new Response(null, { status: 303, headers: { location: "/?e=cfg" } });
  // Brute-force protection: max LOGIN_TRIES attempts per IP per window.
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const win = Math.floor(Date.now() / (LOGIN_WINDOW_MIN * 6e4));
  const row = await env.DB.prepare("INSERT INTO usage(uid,hour,n) VALUES(?1,?2,1) ON CONFLICT(uid,hour) DO UPDATE SET n=n+1 RETURNING n").bind("login:" + ip, win).first();
  if (row && row.n > LOGIN_TRIES) return new Response(null, { status: 303, headers: { location: "/?e=wait" } });

  const f = await req.formData();
  const pw = String(f.get("password") || "");
  const role = env.ADMIN_PASSWORD && await same(pw, env.ADMIN_PASSWORD, env) ? "admin"
             : env.TEAM_PASSWORD && await same(pw, env.TEAM_PASSWORD, env) ? "team" : null;
  if (!role) return new Response(null, { status: 303, headers: { location: "/?e=1" } });
  const old = await session(req, env, true);
  const uid = old && old.uid || crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${role}.${uid}.${exp}`;
  const token = `${payload}.${await sign(payload, env, role)}`;
  return new Response(null, { status: 303, headers: { location: "/", "set-cookie": cookie(token, SESSION_DAYS * 86400) } });
}
async function session(req, env, ignoreExpiry = false) {
  if (!configured(env)) return null;
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)pb=([^;]+)/);
  if (!m) return null;
  const [role, uid, exp, sig] = decodeURIComponent(m[1]).split(".");
  if (role !== "admin" && role !== "team") return null;
  if (!sig || !await same(sig, await sign(`${role}.${uid}.${exp}`, env, role), env)) return null;
  if (!ignoreExpiry && Date.now() > Number(exp)) return null;
  return { role, uid };
}
const cookie = (v, maxAge) => `pb=${encodeURIComponent(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
// The signing key includes the role's password, so changing a password logs out everyone with that role.
async function sign(s, env, role) {
  const secret = String(env.SESSION_SECRET) + "|" + String(role === "admin" ? env.ADMIN_PASSWORD : env.TEAM_PASSWORD);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c]));
}
// Constant-time comparison (compares HMACs of both strings).
async function same(a, b, env) {
  const [x, y] = await Promise.all([sign("cmp:" + a, env, "cmp"), sign("cmp:" + b, env, "cmp")]);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

/* ---------------- Claude ---------------- */
async function chat(req, env, s) {
  if (!env.ANTHROPIC_API_KEY) return json({ code: "sampling_disabled", message: "No API key configured" }, 503);
  const limit = Number(env.CHAT_LIMIT_PER_HOUR || 120);
  const hour = Math.floor(Date.now() / 36e5);
  const row = await env.DB.prepare("INSERT INTO usage(uid,hour,n) VALUES(?1,?2,1) ON CONFLICT(uid,hour) DO UPDATE SET n=n+1 RETURNING n").bind(s.uid, hour).first();
  if (row && row.n > limit) return json({ code: "rate_limited", message: "Too many questions this hour" }, 429);

  const b = await req.json();
  const model = (env["MODEL_" + String(b.tier || "default").toUpperCase()]) || MODELS[b.tier] || MODELS.default;
  const body = { model, max_tokens: Number(env.MAX_TOKENS || 2048), messages: b.messages };
  if (Array.isArray(b.tools) && b.tools.length) body.tools = b.tools;
  const r = await fetch((env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) {
    const code = r.status === 429 ? "rate_limited" : r.status === 413 ? "prompt_too_large" : "error";
    return json({ code, message: j.error && j.error.message || "Claude API error" }, r.status === 429 ? 429 : 502);
  }
  return json({ content: j.content, stop_reason: j.stop_reason, usage: j.usage, model: j.model });
}

/* ---------------- db (documents in D1) ---------------- */
function canRead(col, s) {
  if (col.startsWith("data/users/")) return col.split("/")[2] === s.uid;
  return true;
}
function canWrite(col, id, s) {
  if (col.startsWith("data/users/")) return col.split("/")[2] === s.uid;
  if (s.role === "admin") return true;
  if (ADMIN_WRITE.has(col)) return false;
  if (col === "learners") return id === s.uid;
  return true;
}
const split = (path) => { const p = String(path || "").split("/"); return [p.slice(0, -1).join("/"), p[p.length - 1]]; };
const okName = (x) => /^[\w\-./]{1,200}$/.test(x) && !x.includes("..");

async function dbApi(req, env, s, url) {
  const op = url.pathname.slice(8);
  if (op === "list") {
    const col = url.searchParams.get("col") || "";
    if (!okName(col) || !canRead(col, s)) return json({ code: "not_granted" }, 403);
    const order = url.searchParams.get("order"), dir = url.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
    const limit = Math.min(Number(url.searchParams.get("limit") || 1000), 2000);
    const field = order && /^\w+$/.test(order) ? order : null;
    const sql = `SELECT id,data FROM docs WHERE col=?1 ${field ? `ORDER BY json_extract(data,'$.${field}') ${dir}` : "ORDER BY updated DESC"} LIMIT ?2`;
    const r = await env.DB.prepare(sql).bind(col, limit).all();
    return json({ docs: r.results.map(x => ({ id: x.id, data: JSON.parse(x.data) })) });
  }
  if (op === "get") {
    const [col, id] = split(url.searchParams.get("path"));
    if (!okName(col) || !canRead(col, s)) return json({ code: "not_granted" }, 403);
    const x = await env.DB.prepare("SELECT data FROM docs WHERE col=?1 AND id=?2").bind(col, id).first();
    return json({ data: x ? JSON.parse(x.data) : null });
  }
  if (req.method !== "POST") return json({ code: "bad_request" }, 400);
  const b = await req.json();
  if (op === "add") {
    const col = String(b.col || ""), id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    if (!okName(col) || !canWrite(col, id, s)) return json({ code: "not_granted" }, 403);
    await put(env, col, id, b.data);
    return json({ id });
  }
  const [col, id] = split(b.path);
  if (!okName(col) || !id || !canWrite(col, id, s)) return json({ code: "not_granted" }, 403);
  if (op === "set") {
    let data = b.data || {};
    if (b.merge) {
      const x = await env.DB.prepare("SELECT data FROM docs WHERE col=?1 AND id=?2").bind(col, id).first();
      if (!x && b.mustExist) return json({ code: "not_found", message: "Document does not exist" }, 404);
      data = { ...(x ? JSON.parse(x.data) : {}), ...data };
    }
    await put(env, col, id, data);
    return json({ ok: true });
  }
  if (op === "delete") {
    await env.DB.prepare("DELETE FROM docs WHERE col=?1 AND id=?2").bind(col, id).run();
    return json({ ok: true });
  }
  return json({ code: "bad_request" }, 400);
}
const put = (env, col, id, data) => {
  const txt = JSON.stringify(data || {});
  if (txt.length > 900000) throw new Error("Document too large");
  return env.DB.prepare("INSERT INTO docs(col,id,data,updated) VALUES(?1,?2,?3,?4) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data, updated=excluded.updated").bind(col, id, txt, Date.now()).run();
};

/* ---------------- helpers ---------------- */
const json = (o, status = 200) => secure(new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }));
function secure(r) {
  const h = new Headers(r.headers);
  h.set("x-frame-options", "DENY");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "same-origin");
  h.set("x-robots-tag", "noindex, nofollow");
  h.set("strict-transport-security", "max-age=31536000");
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
const loginPage = (err) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bombtrack Knowledge & Advice</title><style>
:root{--page:#f8f7f3;--card:#fff;--ink:#1c1f22;--muted:#6b6f73;--line:#e4e3dc;--acc:#8aa3bc}
@media (prefers-color-scheme:dark){:root{--page:#141618;--card:#1d2023;--ink:#ecebe6;--muted:#9aa0a6;--line:#2e3236}}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--page);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif;padding:16px;box-sizing:border-box}
form{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;width:min(360px,100%);display:grid;gap:14px}
b{letter-spacing:.3em;font-size:15px}p{margin:0;color:var(--muted);font-size:14px}
input{font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;background:var(--page);color:var(--ink)}
button{font:inherit;font-weight:600;padding:11px;border:0;border-radius:999px;background:var(--acc);color:#141c25;cursor:pointer}
.e{color:#c0392b}</style></head><body><form method="post" action="/login">
<b>BOMBTRACK</b><p>Knowledge &amp; Advice. Bitte Passwort eingeben.</p>
<input type="password" name="password" placeholder="Passwort" autofocus required autocomplete="current-password">
${err === "cfg" ? '<p class="e">Noch nicht eingerichtet: Passwörter und SESSION_SECRET (mind. 16 Zeichen) in Cloudflare setzen.</p>'
  : err === "wait" ? '<p class="e">Zu viele Versuche. Bitte 15 Minuten warten.</p>'
  : err ? '<p class="e">Falsches Passwort.</p>' : ""}<button>Anmelden</button></form></body></html>`;
