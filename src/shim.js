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
    let stopped = false, busy = false, sig = null;
    const l = {
      col,
      run: async () => {
        if (stopped || busy) return; busy = true;
        try {
          const s = await fetcher(); if (stopped) return;
          // only notify when the data actually changed, otherwise every poll re-renders the app (wipes typing and running chat answers)
          let k; try { k = JSON.stringify(s && s.docs ? s.docs.map(d => [d.id, d.data()]) : [s && s.exists, s && s.data && s.data()]); } catch { k = Math.random(); }
          if (k === sig) return; sig = k; next(s);
        }
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

  /* Reads the Claude API event stream and returns {content, stop_reason, usage}, calling onDelta for each text piece. */
  async function readStream(resp, onDelta) {
    const reader = resp.body.getReader(), dec = new TextDecoder();
    const blocks = [], usage = {}; let stop = null, buf = "";
    const handle = (ev) => {
      if (ev.type === "message_start") Object.assign(usage, ev.message && ev.message.usage || {});
      else if (ev.type === "content_block_start") { const cb = ev.content_block || {}; blocks[ev.index] = cb.type === "tool_use" ? { type: "tool_use", id: cb.id, name: cb.name, _json: "" } : cb.type === "text" ? { type: "text", text: "" } : { ...cb }; }
      else if (ev.type === "content_block_delta") {
        const blk = blocks[ev.index], d = ev.delta || {};
        if (!blk) return;
        if (d.type === "text_delta") { blk.text += d.text; onDelta(d.text); }
        else if (d.type === "input_json_delta") blk._json += d.partial_json || "";
        else if (d.type === "thinking_delta") blk.thinking = (blk.thinking || "") + (d.thinking || "");
        else if (d.type === "signature_delta") blk.signature = (blk.signature || "") + (d.signature || "");
      }
      else if (ev.type === "content_block_stop") { const blk = blocks[ev.index]; if (blk && blk.type === "tool_use") { try { blk.input = blk._json ? JSON.parse(blk._json) : {}; } catch { blk.input = {}; } delete blk._json; } }
      else if (ev.type === "message_delta") { stop = ev.delta && ev.delta.stop_reason || stop; Object.assign(usage, ev.usage || {}); }
      else if (ev.type === "error") throw { code: (ev.error && ev.error.type) === "overloaded_error" ? "overloaded" : "error", message: ev.error && ev.error.message || "Stream error" };
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = chunk.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
        if (data) handle(JSON.parse(data));
      }
    }
    return { content: blocks.filter(Boolean), stop_reason: stop, usage };
  }

  async function sample(input, opts) {
    opts = opts || {};
    const tier = opts.modelTier && opts.modelTier !== "inherit" ? opts.modelTier : "default";
    const tools = opts.tools || [];
    // The app sends its long instructions as the first user turn; send them as a cached system prompt instead.
    let system = null, src = input;
    if (Array.isArray(input) && input.length > 1 && input[0].role === "user" && input[1].role === "user") { system = String(input[0].content); src = input.slice(1); }
    const messages = toMessages(src);
    let rounds = 0, all = "", last = null;
    const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    while (true) {
      if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "Cancelled" };
      const sep = all ? "\n\n" : ""; let roundText = "";
      last = await fetch("/api/chat", {
        method: "POST", credentials: "same-origin", signal: opts.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tier, messages, system, stream: true, round: rounds,
          tools: tools.map(t => ({ name: t.name, description: t.description || "", input_schema: t.inputSchema || { type: "object", properties: {} } })),
        })
      }).then(async r => {
        if (r.status === 401) { location.reload(); throw { code: "session_expired", message: "Please log in again." }; }
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw { code: j.code || "error", message: j.message || ("HTTP " + r.status), text: all || undefined }; }
        if ((r.headers.get("content-type") || "").includes("text/event-stream")) {
          return readStream(r, (d) => { roundText += d; if (opts.onText) opts.onText({ text: all + (roundText ? sep : "") + roundText, delta: d }); });
        }
        return r.json();
      }).catch(e => { throw e && e.name === "AbortError" ? { code: "cancelled", message: "Cancelled", text: all || undefined } : e; });

      for (const k in usage) usage[k] += (last.usage && last.usage[k]) || 0;
      const txt = textOf(last.content);
      if (txt) { all += sep + txt; if (opts.onText && !roundText) opts.onText({ text: all, delta: txt }); }
      const calls = (last.content || []).filter(b => b.type === "tool_use");
      if (last.stop_reason !== "tool_use" || !calls.length || ++rounds > 8) break;

      messages.push({ role: "assistant", content: (last.content || []).filter(b => b.type !== "thinking" || b.signature).map(b => b.type === "thinking" ? { type: "thinking", thinking: b.thinking || "", signature: b.signature } : b) });
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
    sample.lastUsage = usage;
    return { text: all, truncated: last.stop_reason === "max_tokens", modelTierApplied: tier, usage };
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
