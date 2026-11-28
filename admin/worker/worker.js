/* itsolga.com API: collects visit stats and chat briefs, and serves them to the admin page.
   Routes (Worker route itsolga.com/api/*):
     POST /api/e            public: a batch of visit events from js/track.js
     POST /api/lead         public: a finished chat brief
     GET  /api/admin/stats  admin: aggregates for a period (?days=30)
     GET  /api/admin/leads  admin: the leads
     POST /api/admin/lead   admin: change a lead's status or note
   Admin routes need a valid Cloudflare Access token for ADMIN_EMAIL (checked here too, not only at the edge).
   Bindings: DB (D1). Vars: ACCESS_TEAM (the part before .cloudflareaccess.com), ACCESS_AUD (the Access app's
   Audience tag), ADMIN_EMAIL. No IP address is stored; the country comes from Cloudflare. */

const TYPES = new Set(["view", "reach", "dwell", "depth", "click", "case"]);
const BLOCKS = ["hero", "numbers", "cases", "skills", "contact"];
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const now = () => Math.floor(Date.now() / 1000);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, "");
    // local testing only (DEV=1): let the admin page on another port call this worker
    if (env.DEV === "1") {
      const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" };
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      const r = await this.route(req, env, url, p);
      const h = new Headers(r.headers); Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(r.body, { status: r.status, headers: h });
    }
    return this.route(req, env, url, p);
  },
  async route(req, env, url, p) {
    try {
      if (p === "/api/e" && req.method === "POST") return await collect(req, env);
      if (p === "/api/lead" && req.method === "POST") return await lead(req, env);
      if (p.startsWith("/api/admin/")) {
        const who = await admin(req, env);
        if (!who) return json({ error: "forbidden" }, 403);
        if (p === "/api/admin/stats" && req.method === "GET") return await stats(url, env);
        if (p === "/api/admin/leads" && req.method === "GET") return await leads(env);
        if (p === "/api/admin/lead" && req.method === "POST") return await editLead(req, env);
        if (p === "/api/admin/me") return json({ email: who });
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server" }, 500);
    }
  }
};

/* ---------- public ---------- */
async function body(req, max = 16000) {
  const len = +req.headers.get("content-length") || 0;
  if (len > max) return null;
  const t = await req.text();
  if (t.length > max) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}
const ctx = (req, b) => ({
  country: str(req.cf && req.cf.country, 2),
  lang: str(b.l, 5), device: ["mobile", "tablet", "desktop"].includes(b.d) ? b.d : "",
  ref: str(b.r, 80), utm: Array.isArray(b.u) ? b.u.map(x => str(x, 60)) : ["", "", ""]
});
// her own visits don't count: once she has signed in to /admin, the browser carries Cloudflare Access's cookie
const isOwner = req => /(?:^|;\s*)CF_Authorization=/.test(req.headers.get("cookie") || "");

async function collect(req, env) {
  if (isOwner(req)) return new Response(null, { status: 204 });
  const b = await body(req);
  if (!b || typeof b.v !== "string" || !Array.isArray(b.e)) return new Response(null, { status: 400 });
  const visit = str(b.v, 40), c = ctx(req, b), ts = now();
  const rows = b.e.slice(0, 50).filter(x => Array.isArray(x) && TYPES.has(x[0]));
  if (!rows.length) return new Response(null, { status: 204 });
  const st = env.DB.prepare("INSERT INTO events (ts,visit,type,name,value,lang,country,device,ref,utm_source,utm_medium,utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
  await env.DB.batch(rows.map(([type, name, value]) => st.bind(ts, visit, type, str(name, 60),
    typeof value === "number" && isFinite(value) ? Math.max(0, Math.min(value, 86400)) : null,
    c.lang, c.country, c.device, c.ref, c.utm[0] || "", c.utm[1] || "", c.utm[2] || "")));
  return new Response(null, { status: 204 });
}

async function lead(req, env) {
  if (isOwner(req)) return new Response(null, { status: 204 });
  const b = await body(req, 8000);
  if (!b || typeof b.v !== "string" || !b.msg) return new Response(null, { status: 400 });
  const c = ctx(req, b), visit = str(b.v, 40);
  // one brief per visit: "Start over" in the chat replaces it instead of piling up copies
  await env.DB.prepare("DELETE FROM leads WHERE visit = ? AND status = 'new' AND note = ''").bind(visit).run();
  await env.DB.prepare("INSERT INTO leads (ts,visit,need,market,start,message,lang,country,device,ref,utm_source) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .bind(now(), visit, str(b.need, 200), str(b.market, 80), str(b.start, 80), str(b.msg, 1200), c.lang, c.country, c.device, c.ref, c.utm[0] || "").run();
  return new Response(null, { status: 204 });
}

/* ---------- admin ---------- */
let certs = null, certsAt = 0;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
async function admin(req, env) {
  if (env.DEV === "1") return env.ADMIN_EMAIL || "dev";           // local testing only: never set DEV in production
  const tok = req.headers.get("cf-access-jwt-assertion");
  if (!tok || !env.ACCESS_TEAM || !env.ACCESS_AUD || !env.ADMIN_EMAIL) return null;
  const [h, p, s] = tok.split(".");
  if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), pay = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (Date.now() - certsAt > 3600e3 || !certs) {
    const r = await fetch(`https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`);
    certs = (await r.json()).keys; certsAt = Date.now();
  }
  const jwk = certs.find(k => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(h + "." + p));
  if (!ok) return null;
  const aud = Array.isArray(pay.aud) ? pay.aud : [pay.aud];
  if (!aud.includes(env.ACCESS_AUD) || pay.exp < now() || pay.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return null;
  if (String(pay.email || "").toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return null;
  return pay.email;
}

async function stats(url, env) {
  const days = Math.max(1, Math.min(365, +url.searchParams.get("days") || 30));
  const from = now() - days * 86400, prev = from - days * 86400;
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results);
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const [visits, prevVisits, perDay, countries, refs, utms, devices, langs, reach, dwell, depth, clicks, cases, leadsN] = await Promise.all([
    one("SELECT COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=?", from),
    one("SELECT COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? AND ts<?", prev, from),
    q("SELECT date(ts,'unixepoch') d, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? GROUP BY d ORDER BY d", from),
    q("SELECT country k, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? AND country<>'' GROUP BY k ORDER BY n DESC LIMIT 12", from),
    q("SELECT CASE WHEN ref='' THEN '(direct)' ELSE ref END k, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? GROUP BY k ORDER BY n DESC LIMIT 12", from),
    q("SELECT utm_source k, utm_campaign c, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? AND utm_source<>'' GROUP BY k, c ORDER BY n DESC LIMIT 12", from),
    q("SELECT device k, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? GROUP BY k ORDER BY n DESC", from),
    q("SELECT lang k, COUNT(DISTINCT visit) n FROM events WHERE type='view' AND ts>=? GROUP BY k ORDER BY n DESC", from),
    q("SELECT name k, COUNT(DISTINCT visit) n FROM events WHERE type='reach' AND ts>=? GROUP BY k", from),
    q("SELECT name k, SUM(value) total, COUNT(DISTINCT visit) n FROM events WHERE type='dwell' AND ts>=? GROUP BY k", from),
    q("SELECT b, COUNT(*) n FROM (SELECT visit, CAST(MIN(MAX(value),99.9)/10 AS INT)*10 b FROM events WHERE type='depth' AND ts>=? GROUP BY visit) GROUP BY b ORDER BY b", from),
    q("SELECT name k, COUNT(*) n, COUNT(DISTINCT visit) v FROM events WHERE type='click' AND ts>=? GROUP BY k ORDER BY n DESC", from),
    q("SELECT name k, COUNT(*) n, COUNT(DISTINCT visit) v FROM events WHERE type='case' AND ts>=? GROUP BY k ORDER BY n DESC", from),
    one("SELECT COUNT(*) n FROM leads WHERE ts>=?", from)
  ]);
  const byK = a => Object.fromEntries(a.map(r => [r.k, r]));
  const R = byK(reach), D = byK(dwell);
  const funnel = BLOCKS.map(k => ({ block: k, reached: (R[k] && R[k].n) || 0, avgSeconds: D[k] && D[k].n ? Math.round(D[k].total / D[k].n) : 0, totalSeconds: (D[k] && Math.round(D[k].total)) || 0 }));
  return json({ days, visits: visits.n, prevVisits: prevVisits.n, perDay, countries, refs, utms, devices, langs, funnel, depth, clicks, cases, leads: leadsN.n });
}

async function leads(env) {
  const r = await env.DB.prepare(`SELECT l.*, EXISTS(SELECT 1 FROM events e WHERE e.visit=l.visit AND e.type='click' AND e.name='chat_send') sent
    FROM leads l ORDER BY l.ts DESC LIMIT 500`).all();
  return json(r.results);
}

async function editLead(req, env) {
  const b = await body(req, 8000);
  if (!b || !Number.isInteger(b.id)) return json({ error: "bad" }, 400);
  const status = ["new", "talking", "won", "lost"].includes(b.status) ? b.status : null;
  if (b.delete === true) { await env.DB.prepare("DELETE FROM leads WHERE id=?").bind(b.id).run(); return json({ ok: true }); }
  await env.DB.prepare("UPDATE leads SET status=COALESCE(?,status), note=COALESCE(?,note) WHERE id=?")
    .bind(status, typeof b.note === "string" ? b.note.slice(0, 4000) : null, b.id).run();
  return json({ ok: true });
}
