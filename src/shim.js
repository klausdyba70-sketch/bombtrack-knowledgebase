/* Partbase Cloudflare shim.
   The app was built against Claude's artifact runtime (window.claude.use("sample" | "db" | "user")).
   This file provides the same interface on Cloudflare, backed by the Worker API:
     sample -> /api/chat   (Claude API, key stays on the server)
     db     -> /api/db/*   (Cloudflare D1)
     user   -> /api/me     (password login: team or admin)
   Keep the shapes in sync with how the app calls them; nothing else in the app needs to change. */
(function () {
  "use strict";
  /* Show script errors in a small bar so problems on the live site are visible and can be reported. */
  const showErr = (msg) => {
    const add = () => {
      let el = document.getElementById("pbErr");
      if (!el) { el = document.createElement("div"); el.id = "pbErr"; el.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:9999;max-width:min(560px,calc(100vw - 16px));background:#b3261e;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:6px 10px;border-radius:8px;opacity:.92;cursor:pointer"; el.title = "Click to hide"; el.onclick = () => el.remove(); document.body.appendChild(el); }
      el.textContent = "Fehler: " + String(msg).slice(0, 300);
    };
    document.body ? add() : addEventListener("DOMContentLoaded", add);
  };
  addEventListener("error", e => showErr(e.message || e.error));
  addEventListener("unhandledrejection", e => { const r = e.reason || {}; if (r.code !== "cancelled") showErr(r.message || r.code || r); });
  const api = async (path, body) => {
    const r = await fetch(path, body === undefined ? { credentials: "same-origin" } : {
      method: "POST", credentials: "same-origin",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (r.status === 401) { location.reload(); throw { code: "session_expired", message: "Please log in again." }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: j.code || "error", message: j.message || ("HTTP " + r.status) };
    return j;
  };

  /* ---------------- user ---------------- */
  let mePromise = null;
  const getMe = () => (mePromise = mePromise || api("/api/me"));
  const user = {
    id: async () => (await getMe()).uid,
    me: async () => { const m = await getMe(); return { id: m.uid, name: m.role === "admin" ? "Admin" : "Team" }; },
    canEdit: async () => (await getMe()).role === "admin",
    isOwner: async () => (await getMe()).role === "admin",
    can: async () => null,
    profiles: async (ids) => Object.fromEntries((ids || []).map(id => [id, { id, name: "" }])),
  };

  /* ---------------- db (Firestore-like subset over D1) ---------------- */
  const listeners = new Set();
  const POLL_MS = 20000;
  const colOf = (path) => path.split("/").slice(0, -1).join("/");
  const notify = (col) => { for (const l of listeners) if (l.col === col) l.run(); };
  const snapDoc = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : data) });

  function query(col, order, limit) {
    const q = {
      orderBy: (field, dir) => query(col, [field, dir === "desc" ? "desc" : "asc"], limit),
      limit: (n) => query(col, order, n),
      doc: (id) => docRef(col + "/" + id),
      add: async (data) => { const r = await api("/api/db/add", { col, data }); notify(col); return docRef(col + "/" + r.id); },
      get: async () => {
        const p = new URLSearchParams({ col });
        if (order) { p.set("order", order[0]); p.set("dir", order[1]); }
        if (limit) p.set("limit", String(limit));
        const r = await api("/api/db/list?" + p);
        const docs = r.docs.map(d => snapDoc(d.id, d.data));
        return { docs, size: docs.length, empty: !docs.length };
      },
      onSnapshot: (next, err) => watch(col, () => q.get(), next, err),
    };
    return q;
  }
  function docRef(path) {
    const col = colOf(path), id = path.split("/").pop();
    const ref = {
      id, path,
      get: async () => { const r = await api("/api/db/get?" + new URLSearchParams({ path })); return snapDoc(id, r.data); },
      set: async (data, opts) => { await api("/api/db/set", { path, data, merge: !!(opts && opts.merge) }); notify(col); },
      update: async (data) => { await api("/api/db/set", { path, data, merge: true, mustExist: true }); notify(col); },
      delete: async () => { await api("/api/db/delete", { path }); notify(col); },
      onSnapshot: (next, err) => watch(col, () => ref.get(), next, err),
    };
    return ref;
  }
  function watch(col, fetcher, next, err) {
    let stopped = false, busy = false;
    const l = {
      col,
      run: async () => {
        if (stopped || busy) return; busy = true;
        try { const s = await fetcher(); if (!stopped) next(s); }
        catch (e) { if (err) err(e); }
        finally { busy = false; }
      }
    };
    listeners.add(l); l.run();
    const t = setInterval(() => { if (!document.hidden) l.run(); }, POLL_MS);
    return () => { stopped = true; clearInterval(t); listeners.delete(l); };
  }
  const db = {
    collection: (col) => query(col, null, null),
    doc: (path) => docRef(path),
  };

  /* ---------------- sample (Claude via /api/chat) ---------------- */
  const toMessages = (input) => {
    if (typeof input === "string") return [{ role: "user", content: input }];
    const out = [];
    for (const m of input) {   // merge consecutive same-role turns (the API wants alternation)
      const last = out[out.length - 1];
      if (last && last.role === m.role) last.content += "\n\n" + m.content;
      else out.push({ role: m.role, content: String(m.content) });
    }
    return out;
  };
  const textOf = (content) => (content || []).filter(b => b.type === "text").map(b => b.text).join("");

  async function sample(input, opts) {
    opts = opts || {};
    const tier = opts.modelTier && opts.modelTier !== "inherit" ? opts.modelTier : "default";
    const tools = opts.tools || [];
    const messages = toMessages(input);
    let rounds = 0, all = "", last = null;
    while (true) {
      if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "Cancelled" };
      last = await fetch("/api/chat", {
        method: "POST", credentials: "same-origin", signal: opts.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tier, messages,
          tools: tools.map(t => ({ name: t.name, description: t.description || "", input_schema: t.inputSchema || { type: "object", properties: {} } })),
        })
      }).then(async r => {
        if (r.status === 401) { location.reload(); throw { code: "session_expired", message: "Please log in again." }; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw { code: j.code || "error", message: j.message || ("HTTP " + r.status), text: all || undefined };
        return j;
      }, e => { throw e && e.name === "AbortError" ? { code: "cancelled", message: "Cancelled", text: all || undefined } : e; });

      const txt = textOf(last.content);
      if (txt) { all += (all ? "\n\n" : "") + txt; if (opts.onText) opts.onText({ text: all, delta: txt }); }
      const calls = (last.content || []).filter(b => b.type === "tool_use");
      if (last.stop_reason !== "tool_use" || !calls.length || ++rounds > 8) break;

      messages.push({ role: "assistant", content: last.content });
      const results = [];
      for (const c of calls) {
        const tool = tools.find(t => t.name === c.name);
        let out, isErr = false;
        try { out = tool ? await tool.execute(c.input || {}) : "Unknown tool"; }
        catch (e) { out = String(e && e.message || e); isErr = true; }
        results.push({ type: "tool_result", tool_use_id: c.id, content: typeof out === "string" ? out : JSON.stringify(out), is_error: isErr || undefined });
      }
      messages.push({ role: "user", content: results });
    }
    if (!all.trim()) throw { code: "empty_completion", message: "Empty answer" };
    return { text: all, truncated: last.stop_reason === "max_tokens", modelTierApplied: tier, usage: last.usage };
  }
  sample.json = async (input, opts) => {
    const msgs = toMessages(input);
    msgs[msgs.length - 1].content += "\n\nReply with valid JSON only, no code fences, no text before or after.";
    const { text } = await sample(msgs, opts);
    const s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const a = s.search(/[\[{]/), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    try { return JSON.parse(a >= 0 ? s.slice(a, b + 1) : s); }
    catch { throw { code: "invalid_json", message: "Claude did not return valid JSON" }; }
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxTools: 16 }, modelTiers: ["quick", "default", "complex"] });

  const caps = { sample, db, user };
  window.claude = { use: async (name) => caps[name] || null };
})();
