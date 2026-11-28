/* Visit stats for the admin page, with no cookies and nothing stored in the browser.
   A "visit" is one page load: an id made in memory, gone when the tab closes, so nobody can be followed across visits.
   What is sent: which blocks were reached and how long each was on screen, how far down the page went, clicks on
   cases, the CV and the contacts, and the brief from the chat. The country comes from Cloudflare on the server; no IP
   is kept. Nothing is sent with Do Not Track or Global Privacy Control on, or anywhere but itsolga.com. */
(() => {
  const host = location.hostname.replace(/^www\./, "");
  if (host !== "itsolga.com") return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;

  const visit = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const lang = () => (document.documentElement.lang || "en").slice(0, 2);
  const queue = [];
  const push = (type, name, value) => { queue.push([type, String(name || "").slice(0, 60), typeof value === "number" ? Math.round(value * 10) / 10 : null]); if (queue.length >= 25) flush(); };

  // where the visit came from: the referring site's name only, and the utm tags people put on links in posts and bios
  let ref = "";
  try { const r = document.referrer && new URL(document.referrer); if (r && r.hostname.replace(/^www\./, "") !== host) ref = r.hostname.replace(/^www\./, ""); } catch (e) {}
  const q = new URLSearchParams(location.search);
  const utm = ["utm_source", "utm_medium", "utm_campaign"].map(k => (q.get(k) || "").slice(0, 60));
  const device = innerWidth < 700 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop";

  function flush() {
    if (!queue.length) return;
    const body = JSON.stringify({ v: visit, l: lang(), r: ref, u: utm, d: device, e: queue.splice(0, 50) });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/e", new Blob([body], { type: "application/json" }))))
        fetch("/api/e", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  push("view", location.pathname);

  /* blocks: reached once a quarter of it has been on screen; time counts for the block that fills most of the screen,
     only while the tab is visible */
  const ids = ["hero", "numbers", "cases", "skills", "contact"];
  const blocks = ids.map(id => document.getElementById(id)).filter(Boolean);
  const ratio = new Map(), reached = new Set(), time = new Map(), sentTime = new Map();
  const io = new IntersectionObserver(es => es.forEach(en => {
    const id = en.target.id;
    // a tall block never fills a quarter of itself on a phone: count what share of the SCREEN it covers instead
    const share = en.intersectionRect.height / Math.max(1, innerHeight);
    ratio.set(id, share);
    if (!reached.has(id) && (en.intersectionRatio >= .25 || share >= .5)) { reached.add(id); push("reach", id); }
  }), { threshold: [0, .1, .25, .5, .75, 1] });
  blocks.forEach(b => io.observe(b));
  let depth = 0;
  const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; if (h > 0) depth = Math.max(depth, Math.min(100, scrollY / h * 100)); };
  addEventListener("scroll", onScroll, { passive: true });
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    let best = null, top = .2;
    ratio.forEach((r, id) => { if (r > top) { top = r; best = id; } });
    if (best) time.set(best, (time.get(best) || 0) + 1);
  }, 1000);
  const sendTime = () => {
    time.forEach((s, id) => { const d = s - (sentTime.get(id) || 0); if (d >= 1) { push("dwell", id, d); sentTime.set(id, s); } });
    if (depth) { push("depth", "page", depth); }
  };

  // clicks, read from the page as they bubble, so the rest of the site needs no changes for them
  document.addEventListener("click", e => {
    const a = e.target.closest("a, button");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (a.matches(".cta")) push("click", "cta_mail");
    else if (a.matches("#cvvDl")) push("click", "cv_download_" + (/_UA\.pdf/.test(href) ? "ua" : "en"));
    else if (a.matches("[data-cv]")) push("click", "cv_open");
    else if (a.matches("[data-cvlang]")) push("click", "cv_lang_" + a.dataset.cvlang);
    else if (a.matches("[data-openchat]")) push("click", "chat_open");
    else if (a.matches("#ctSend") && a.classList.contains("is-on")) { push("click", "chat_send"); flush(); }
    else if (a.matches(".lang__btn")) push("click", "lang_" + (a.dataset.lang || a.textContent.trim().toLowerCase()));
    else if (a.matches(".pill--cta")) push("click", "nav_talk");
    else if (/cal\.com/.test(href)) push("click", "call");
    else if (/linkedin\.com/.test(href)) push("click", "linkedin");
    else if (/t\.me\//.test(href)) push("click", "telegram");
    else if (/^mailto:/.test(href)) push("click", "mail");
  }, { capture: true, passive: true });

  // the case view and the chat tell us themselves (cases-ui.js, contact.js)
  document.addEventListener("case:open", e => push("case", e.detail));
  document.addEventListener("brief:ready", e => {
    const d = e.detail || {};
    const body = JSON.stringify({ v: visit, l: lang(), need: d.need, market: d.market, start: d.start, msg: d.msg, r: ref, u: utm, d: device });
    try { fetch("/api/lead", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {}); } catch (err) {}
  });

  // send when the page is hidden or closed, and every 20 seconds while it's open
  const out = () => { sendTime(); flush(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") out(); });
  addEventListener("pagehide", out);
  setInterval(() => { if (document.visibilityState === "visible") flush(); }, 20000);
})();
