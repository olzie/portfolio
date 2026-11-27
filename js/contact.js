/* Contact: a glass dock where every channel is an "app".
   - the giant title is fitted to the width;
   - the floor line sits right under the dock;
   - icons swell under the cursor (like the macOS dock) and bounce when clicked;
   - the first time the dock comes into view, a virtual cursor sweeps across it and rests on the call;
   - "Brief" opens a small chat window: three taps write the first message, which opens in Telegram. */
(function () {
  const sec = document.getElementById("contact");
  if (!sec) return;
  const $ = s => sec.querySelector(s), $$ = s => [...sec.querySelectorAll(s)];
  const title = $(".ct-title"), dock = $("#ctDock"), apps = $$(".ct-app"), bg = $(".ct-bg");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const wide = matchMedia("(min-width:901px)");
  const TG = "https://t.me/itsolz";
  if ("IntersectionObserver" in window) new IntersectionObserver(es => sec.classList.toggle("is-near", es[0].isIntersecting), { rootMargin: "100% 0px" }).observe(sec);
  else sec.classList.add("is-near");
  /* when the page last moved: heavy one-off work (the window picture, the intro sweep) waits until it has been still */
  let lastMove = 0;
  addEventListener("scroll", () => { lastMove = performance.now(); }, { passive: true });
  addEventListener("touchmove", () => { lastMove = performance.now(); }, { passive: true });
  const whenStill = (fn, ms = 300) => { const t = () => performance.now() - lastMove < ms ? setTimeout(t, 120) : fn(); setTimeout(t, 0); };

  /* ---------- title fit + floor line ---------- */
  function layout() {
    title.style.removeProperty("--tfs");
    const fs = parseFloat(getComputedStyle(title).fontSize);
    if (wide.matches) {                                  // one line across the whole width
      const r = document.createRange(); r.selectNodeContents(title);
      const w = r.getBoundingClientRect().width;
      if (w) title.style.setProperty("--tfs", Math.min(250, fs * title.clientWidth * .96 / w).toFixed(1) + "px");
    } else {                                             // phones: words wrap, but the longest word must still fit (ПОГОВОРІМО is one word)
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit";
      title.appendChild(probe);
      let wmax = 0;
      title.textContent.split(/\s+/).forEach(w => { probe.textContent = w; wmax = Math.max(wmax, probe.getBoundingClientRect().width); });
      probe.remove();
      if (wmax > title.clientWidth * .96) title.style.setProperty("--tfs", (fs * title.clientWidth * .96 / wmax).toFixed(1) + "px");
    }
    const s = sec.getBoundingClientRect(), d = dock.getBoundingClientRect();
    bg.style.setProperty("--hz", ((d.bottom - s.top - 8) / s.height * 100).toFixed(2) + "%");
  }
  layout();
  if (document.fonts) document.fonts.ready.then(layout);
  let layoutW = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== layoutW) { layoutW = innerWidth; layout(); } });   // Safari fires resize while its bars slide mid-swipe: refitting the giant heading then made the swipe hang
  addEventListener("langchange", () => requestAnimationFrame(layout));

  /* ---------- magnify + bounce ----------
     Only transforms move: each icon's face scales up from its bottom edge and the icons slide apart so they don't overlap.
     Nothing changes size in the layout, so the browser composites the frames instead of re-laying out the dock.
     A single rAF loop eases every icon toward its target, so pointer moves and the intro sweep share one smooth motion. */
  const items = [...dock.children].filter(n => n.matches(".ct-app,.ct-sep")), bar = $(".ct-bar");
  const faces = apps.map(a => a.querySelector(".ct-face")), tips = apps.map(a => a.querySelector(".ct-tip"));
  let rest0 = null, size = 72;
  let restAll = null, dockW = 0;
  const measure = () => { size = apps[0].offsetWidth; rest0 = apps.map(a => a.offsetLeft + a.offsetWidth / 2); restAll = items.map(n => n.offsetLeft + n.offsetWidth / 2); dockW = dock.offsetWidth; };   // offsets ignore transforms
  addEventListener("resize", () => { rest0 = null; });
  const cur = apps.map(() => 1), tgt = apps.map(() => 1);
  let raf = 0, pointerX = null, anchorX = 0;                                   // pointer x relative to the dock box, or null = at rest
  const R = () => wide.matches ? 170 : 110;
  /* positions are a pure function of two eased values: `sp` (where the pointer is) and `amp` (0 = at rest, 1 = fully swollen).
     Easing each icon's size separately from the anchor let them disagree from frame to frame, and the icons twitched. */
  let sp = null, amp = 0;
  function frame() {
    raf = 0; if (!rest0) measure();
    let moving = false;
    if (pointerX !== null) {
      if (sp === null) sp = pointerX;
      sp += (pointerX - sp) * .25;
      if (Math.abs(pointerX - sp) > .2) moving = true; else sp = pointerX;
    }
    const aT = pointerX === null ? 0 : 1;
    amp += (aT - amp) * .2;
    if (Math.abs(aT - amp) > .002) moving = true; else amp = aT;
    /* The swell is a smooth "magnification field" along the dock: scale(t) = 1 + amp·0.4·(1 − |t − sp|/R)^1.6.
       Every point of the dock is moved by the integral of that extra scale from the pointer to the point (G below), the same
       idea as the macOS dock: the point under the cursor stays put, sizes and gaps grow together, nothing overlaps, and as the
       pointer travels each icon only ever slides one way — no back-and-forth twitching. */
    const Rr = R(), Gk = amp * .4 * Rr / 2.6;   // peak swell ≈1.4× (was 1.55×)
    const G = u => { if (sp === null) return 0; const a = Math.min(1, Math.abs(u) / Rr); return Math.sign(u) * Gk * (1 - (1 - a) ** 2.6); };
    const half = (rest0[1] - rest0[0]) / 2;                          // half of one icon's slot (icon + gap)
    let k = 0;
    items.forEach((n, idx) => {
      const c = restAll[idx], dx = G(c - (sp ?? c));
      n.style.transform = `translate3d(${dx.toFixed(2)}px,0,0)`;
      if (n.classList.contains("ct-app")) {
        // the icon grows by exactly the room the field opens across its slot, so neighbours can never overlap
        cur[k] = sp === null ? 1 : 1 + (G(c + half - sp) - G(c - half - sp)) / size;
        faces[k].style.transform = `scale(${(cur[k] / 1.55).toFixed(4)})`;   // faces are drawn 1.55× and scaled down at rest; a transform (not the `scale` property) keeps the layer's raster, so the face isn't repainted every frame
        if (tips[k]) tips[k].style.transform = `translateY(${(-size * (cur[k] - 1)).toFixed(2)}px)`;
        k++;
      }
    });
    const bl = G(0 - (sp ?? 0)), br = -G(dockW - (sp ?? dockW));   // how far each end of the glass reaches out (negative = outwards)
    bar.style.transform = `translate3d(${bl.toFixed(2)}px,0,0) scaleX(${((dockW - bl - br) / dockW).toFixed(4)})`;   // a transform, not left/right: no layout on every frame
    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const magnify = x => { pointerX = x - dock.getBoundingClientRect().left; kick(); };   // x in viewport px
  const rest = () => { pointerX = null; kick(); };
  /* while the intro sweep runs, the pointer is only remembered, not followed: hovering the dock early doesn't cut the onboarding short.
     When the sweep ends, the dock picks up wherever the pointer is. */
  let sweeping = false, over = false, lastX = null;
  const chatOpen = () => sec.classList.contains("is-chat") || sec.classList.contains("is-closing");
  dock.addEventListener("pointermove", e => {
    if (!fine.matches) return;
    over = true; lastX = e.clientX;
    if (sweeping) return;
    if (chatOpen() || e.target.closest(".ct-win")) { rest(); return; }
    magnify(e.clientX);
  });
  dock.addEventListener("pointerleave", () => { over = false; if (fine.matches && !sweeping) rest(); });
  /* the swell must never stay stuck: a dock link opens a new tab, the window loses focus, and no pointerleave ever arrives */
  const unstick = () => { over = false; if (!sweeping) rest(); };
  addEventListener("blur", unstick);
  document.addEventListener("visibilitychange", () => { if (document.hidden) unstick(); else setTimeout(() => { if (!dock.matches(":hover")) unstick(); }, 60); });
  addEventListener("focus", () => setTimeout(() => { if (!dock.matches(":hover")) unstick(); }, 60));
  document.documentElement.addEventListener("mouseleave", unstick);              // pointer left the browser window
  // watchdog: Safari can replay a stale pointer position when the tab comes back and never send pointerleave
  setInterval(() => { if (pointerX !== null && !sweeping && fine.matches && !dock.matches(":hover")) unstick(); }, 400);
  document.addEventListener("pointermove", e => { if (pointerX !== null && !sweeping && !dock.contains(e.target)) unstick(); }, { passive: true });
  apps.forEach(a => a.addEventListener("click", () => { if (a.target === "_blank") setTimeout(unstick, 250); }));
  apps.forEach(a => a.addEventListener("click", () => { a.classList.remove("is-bounce"); void a.offsetWidth; a.classList.add("is-bounce", "is-ran"); }));
  faces.forEach((f, i) => f.addEventListener("animationend", () => apps[i].classList.remove("is-bounce")));

  /* ---------- intro sweep: once, the first time the dock is in view ---------- */
  const center = a => { if (!rest0) measure(); return dock.getBoundingClientRect().left + rest0[apps.indexOf(a)]; };
  const tipAt = x => { let best = null, bd = 1e9; apps.forEach(a => { const d = Math.abs(x - center(a)); if (d < bd) { bd = d; best = a; } }); apps.forEach(a => a.classList.toggle("is-tip", a === best)); };
  function sweep() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sweeping = true; measure();
    const finish = () => {
      sweeping = false; apps.forEach(a => a.classList.remove("is-tip", "is-lit"));
      over && lastX !== null && !chatOpen() ? magnify(lastX) : rest();
    };
    const x0 = center(apps[0]) - 20, x1 = center(apps[apps.length - 1]) + 20, xc = center(apps[0]);
    const T1 = 2200, T2 = 700, t0 = performance.now(), withTips = wide.matches;
    const step = now => {
      if (!sweeping) return;                                       // the chat was opened mid-sweep
      const t = now - t0;
      if (t >= T1 + T2) {
        magnify(xc); if (withTips) tipAt(xc); apps[0].classList.add("is-lit");
        setTimeout(() => { if (sweeping) finish(); }, 1700);
        return;
      }
      let x;
      if (t < T1) { const k = t / T1; x = x0 + (x1 - x0) * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2); }
      else { const k = (t - T1) / T2; x = x1 + (xc - x1) * (1 - (1 - k) ** 3); }
      magnify(x); if (withTips) tipAt(x);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(() => whenStill(sweep), 350); } }, { threshold: .6 });   // starts once the scroll has settled: it doesn't compete with the scrolling, and it's actually seen
  io.observe(dock);

  /* ---------- toast, CV placeholder ---------- */
  const toastEl = document.getElementById("ctToast");
  const toast = t => { toastEl.textContent = t; toastEl.classList.add("is-on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("is-on"), 1600); };
  $$("[data-cv]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); toast(L().cvSoon); }));   // until the PDF is in place

  /* ---------- chat ---------- */
  const T = {
    en: {
      need: ["SMM strategy", "Channel launch", "Content & AI", "Community", "Influencers", "Consulting"],
      market: ["iGaming", "Another industry"], start: ["ASAP", "This month", "Just exploring"],
      q1: "Hi! 👋 Tell me about your project — what do you need help with? Pick all that fit.",
      q2: "Nice. Which market is it?", q3: "And when would you like to start?",
      q4: "Got it! Your message is ready below — send it and I’ll reply in Telegram.",
      done: "Done", again: "Start over", online: "online", typing: "typing…", today: "Today",
      pick: "Pick an answer above", pickMany: "Pick one or more above", ready: "Ready to send", cvSoon: "CV link coming soon", and: " and ",
      msg: s => {
        const need = list(s.need.map(x => x.toLowerCase().replace("smm", "SMM").replace("ai", "AI")), " and ");
        const mk = s.market === "iGaming" ? " for an iGaming brand" : " for a brand outside iGaming";
        const st = s.start === "Just exploring" ? " For now I'm just exploring." : ` We'd like to start ${s.start === "ASAP" ? "as soon as possible" : s.start.toLowerCase()}.`;
        return `Hi Olga! I'm looking for help with ${need}${mk}.${st} Can we talk?`;
      }
    },
    uk: {
      need: ["SMM-стратегія", "Запуск каналу", "Контент і AI", "Ком’юніті", "Інфлюенсери", "Консультація"],
      market: ["iGaming", "Інша індустрія"], start: ["Якнайшвидше", "Цього місяця", "Поки придивляюся"],
      q1: "Привіт! 👋 Розкажіть про проєкт — з чим потрібна допомога? Оберіть усе, що підходить.",
      q2: "Чудово. Який ринок?", q3: "І коли хочете почати?",
      q4: "Готово! Повідомлення вже внизу — надішліть його, і я відповім у Telegram.",
      done: "Готово", again: "Спочатку", online: "в мережі", typing: "друкує…", today: "Сьогодні",
      pick: "Оберіть відповідь вище", pickMany: "Оберіть одну або кілька відповідей", ready: "Готово до відправки", cvSoon: "Посилання на CV скоро буде", and: " і ",
      msg: s => {
        const st = s.start === "Поки придивляюся" ? "Поки що просто придивляюся." : `Хочемо почати: ${s.start.toLowerCase()}.`;
        return `Привіт, Ольго! Мене цікавить: ${list(s.need.map((x, i) => i ? x.toLowerCase() : x), " і ")}. Ринок: ${s.market === "iGaming" ? "iGaming" : "інша індустрія"}. ${st} Можемо поговорити?`;
      }
    }
  };
  const L = () => T[window.currentLang] || T.en;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function list(a, and) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + and + a[a.length - 1]; }
  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const TICKS = `<svg viewBox="0 0 16 10"><path d="M1 5.5 4 8.5 10 1.5M6.5 8.5l.8.6L14.5 1.5"/></svg>`;

  const log = $("#ctLog"), kb = $("#ctKb"), field = $("#ctField"), sendBtn = $("#ctSend"), hint = $("#ctHint"), state = $("#ctState"), xBtn = $("#ctClose");
  let gen = 0, started = false, opener = null;
  /* the conversation stays pinned to its latest message: when the answer chips or the ready message appear under it, the
     log gets shorter, and without this the last bubble slid half out of view */
  let stick = true;
  let userScroll = 0;                                             // only the visitor's own scrolling un-pins it, not ours
  ["wheel", "touchmove"].forEach(ev => log.addEventListener(ev, () => { userScroll = performance.now(); }, { passive: true }));
  log.addEventListener("scroll", () => { if (performance.now() - userScroll < 400) stick = log.scrollHeight - log.clientHeight - log.scrollTop < 40; }, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (stick) log.scrollTop = log.scrollHeight; }).observe(log);
  const add = (cls, html, meta) => {
    const m = document.createElement("div"); m.className = "ct-msg " + cls;
    m.innerHTML = html + (meta ? `<span class="meta">${now()}${cls === "me" ? TICKS : ""}</span>` : "");
    log.appendChild(m); stick = true; log.scrollTop = log.scrollHeight; return m;
  };
  const composer = (text, ready, href) => {
    field.textContent = text; field.classList.toggle("is-ready", !!ready);
    sendBtn.classList.toggle("is-on", !!ready); sendBtn.setAttribute("aria-disabled", ready ? "false" : "true");
    ready ? sendBtn.setAttribute("href", href) : sendBtn.removeAttribute("href");
  };
  const say = html => { const g = gen; return new Promise((res, rej) => {
    state.textContent = L().typing; state.classList.add("is-typing");
    const d = add("her dots", "<i></i><i></i><i></i>");
    setTimeout(() => { d.remove(); state.textContent = L().online; state.classList.remove("is-typing"); if (g !== gen) return rej(); add("her", html, true); res(); }, 800);
  }); };
  const ask = (opts, multi) => { const g = gen; return new Promise(res => {
    const picked = [], t = L();
    composer(multi ? t.pickMany : t.pick, false);
    kb.innerHTML = opts.map(v => `<button class="ct-chip" type="button" aria-pressed="false">${esc(v)}</button>`).join("") +
      (multi ? `<button class="ct-chip is-go" type="button" data-done disabled>${t.done} →</button>` : "");
    if (opts.length % 2 && !multi) kb.lastElementChild.classList.add("is-wide");
    const doneBtn = kb.querySelector("[data-done]");
    kb.onclick = e => {
      const b = e.target.closest(".ct-chip"); if (!b || g !== gen || b.disabled) return;
      if (multi && !b.hasAttribute("data-done")) {
        const v = b.textContent, i = picked.indexOf(v); i < 0 ? picked.push(v) : picked.splice(i, 1);
        b.setAttribute("aria-pressed", i < 0); doneBtn.disabled = !picked.length;
        composer(picked.length ? list(picked, t.and) : t.pickMany, false); field.classList.toggle("is-ready", !!picked.length);
        return;
      }
      kb.innerHTML = ""; kb.onclick = null;
      const ans = multi ? picked : b.textContent; add("me", esc(multi ? list(picked, t.and) : ans), true); composer("", false); res(ans);
    };
  }); };
  async function flow() {
    gen++; log.innerHTML = `<span class="ct-day">${L().today}</span>`; kb.innerHTML = ""; hint.innerHTML = ""; composer("", false);
    const t = L(), s = {};
    await say(t.q1); s.need = await ask(t.need, true);
    await say(t.q2); s.market = await ask(t.market);
    await say(t.q3); s.start = await ask(t.start);
    const m = t.msg(s);
    await say(t.q4);
    composer(m, true, `${TG}?text=${encodeURIComponent(m)}`);
    hint.innerHTML = `${t.ready} · <button type="button" data-again>${t.again}</button>`;
  }
  hint.addEventListener("click", e => { if (e.target.closest("[data-again]")) flow().catch(() => {}); });

  /* genie, the macOS way: the window itself bends, smoothly.
     A picture of the window is taken (its DOM, with computed styles inlined, rendered through an SVG <foreignObject>),
     then drawn on a canvas one 2px row at a time: every row gets its own width and position along a smooth funnel,
     so the outline is one continuous curve and the content bends with it. The bottom funnels into the Chat icon first,
     the rest pours in after it; opening plays it backwards after the icon's launch bounce. No DOM moves during the animation. */
  const win = $("#ctWin"), chatIcon = $("[data-openchat]");
  let genie = null;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t, clamp01 = t => Math.min(1, Math.max(0, t));
  const smooth = t => t * t * (3 - 2 * t), inOut = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);         // gentler start and end than a cubic: no visible kick when the bend starts or settles

  // --- the picture of the window ---
  let fontCSS = null, wallData = null, assetsP = null;
  const toData = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }));
  const RANGES = { latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215", cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" };
  const loadAssets = () => assetsP || (assetsP = Promise.all([
    ...[["latin", 800], ["cyrillic", 800], ["latin", 400], ["cyrillic", 400]].map(([sub, w]) =>
      toData(`assets/fonts/unbounded-${sub}-${w}-normal.woff2`).then(d => `@font-face{font-family:"Unbounded";font-weight:${w};src:url(${d}) format("woff2");unicode-range:${RANGES[sub]}}`)),
    toData("assets/dollars.svg")
  ]).then(a => { wallData = a.pop(); fontCSS = a.join(""); }));
  const defaults = {};
  /* defaults are measured inside a shadow root: the site's own rules (like *{box-sizing:border-box}) don't reach in there,
     exactly as they don't reach the picture, so "default" means what the picture would get by itself */
  const sandbox = document.createElement("div");
  sandbox.style.cssText = "all:initial;position:absolute;left:-9999px;top:0;visibility:hidden";
  const shadow = sandbox.attachShadow ? sandbox.attachShadow({ mode: "open" }) : sandbox;
  function defaultStyle(tag) {
    if (!defaults[tag]) {
      if (!sandbox.isConnected) document.body.appendChild(sandbox);
      const el = document.createElement(tag); shadow.appendChild(el);
      const cs = getComputedStyle(el), d = {};
      for (let i = 0; i < cs.length; i++) d[cs[i]] = cs.getPropertyValue(cs[i]);
      defaults[tag] = d; el.remove();
    }
    return defaults[tag];
  }
  /* a property can be left out only if it is the tag's default AND the same as the parent's value: otherwise an inherited
     property (line-height, font, colour…) would silently take the parent's value in the picture and the layout would drift */
  function inline(src, dst, root, pcs) {
    if (src.nodeType !== 1) return;
    const cs = getComputedStyle(src), d = defaultStyle(src.tagName.toLowerCase());
    let txt = "";
    for (let i = 0; i < cs.length; i++) {
      const prop = cs[i]; let v = cs.getPropertyValue(prop);
      if (!root && v === d[prop] && v === pcs.getPropertyValue(prop)) continue;
      if (prop.startsWith("transition") || prop.startsWith("animation") || prop === "will-change" || prop === "visibility") continue;   // the window may be hidden while its picture is taken
      if (v.includes("dollars.svg")) v = v.replace(/url\([^)]*dollars\.svg[^)]*\)/g, `url("${wallData}")`);
      txt += `${prop}:${v};`;
    }
    if (root) txt += "position:relative;left:0;top:0;margin:0;transform:none;translate:none;scale:none;opacity:1;visibility:visible;";
    dst.setAttribute("style", txt);
    dst.removeAttribute("class"); dst.removeAttribute("id");
    for (let k = 0; k < src.children.length; k++) inline(src.children[k], dst.children[k], false, cs);
    // ::before / ::after (the online dot on the avatar, the bubble tails…) become real spans in the picture
    for (const pse of ["::before", "::after"]) {
      const ps = getComputedStyle(src, pse), c = ps.getPropertyValue("content");
      if (!c || c === "none" || c === "normal") continue;
      const sp = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
      let t = "";
      for (let i = 0; i < ps.length; i++) { const prop = ps[i]; if (prop === "content" || prop.startsWith("transition") || prop.startsWith("animation")) continue; t += `${prop}:${ps.getPropertyValue(prop)};`; }
      sp.setAttribute("style", t);
      const m = c.match(/^"(.*)"$/); if (m) sp.textContent = m[1];
      pse === "::before" ? dst.insertBefore(sp, dst.firstChild) : dst.appendChild(sp);
    }
  }
  async function snapshot(r) {
    await loadAssets();
    const c = win.cloneNode(true);
    inline(win, c, true);
    // the conversation keeps its scroll position
    const logSrc = $("#ctLog"), logDst = c.children[[...win.children].indexOf(logSrc)];
    if (logSrc && logDst) { logDst.style.overflow = "hidden"; [...logDst.children].forEach(ch => { ch.style.position = "relative"; ch.style.top = `${-logSrc.scrollTop}px`; }); }
    const xml = new XMLSerializer().serializeToString(c);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}"><style>${fontCSS}</style><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await new Promise((res, rej) => { if (img.complete && img.naturalWidth) res(); else { img.onload = res; img.onerror = rej; } });   // Safari: decode() is unreliable for SVG
    const dpr = Math.min(2, devicePixelRatio || 1), cv = document.createElement("canvas");
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }
  if ("requestIdleCallback" in window) requestIdleCallback(() => loadAssets().catch(() => {}));   // fonts ready before the first click
  else setTimeout(() => loadAssets().catch(() => {}), 2500);

  // --- the bend ---
  function stopGenie() {
    if (!genie) return;
    cancelAnimationFrame(genie.raf); genie.canvas.remove(); genie = null;
    win.style.visibility = ""; win.style.opacity = "";
    sec.classList.remove("is-genie");
  }
  function playGenie(pic, from, to, ms, done) {
    stopGenie();
    const r = winBox(), ic = chatIcon.querySelector(".ct-face").getBoundingClientRect();
    const H = r.height, W = r.width, T = r.top, cx = r.left + W / 2;
    const ix = ic.left + ic.width / 2, iw = ic.width, ih = ic.height, ib = ic.bottom;
    const phone = !fine.matches;
    // the canvas covers only the window + the path down to the icon (not the whole screen): far fewer pixels to clear and fill
    const bx = Math.floor(Math.min(r.left, ic.left) - 2), by = Math.floor(T - 2);
    const bw = Math.ceil(Math.max(r.right, ic.right) + 2) - bx, bh = Math.ceil(ib + 2) - by;
    const dpr = Math.min(phone ? 1.5 : 2, devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.className = "ct-genie";
    canvas.width = Math.round(bw * dpr); canvas.height = Math.round(bh * dpr);
    canvas.style.cssText = `left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px`;
    dock.insertBefore(canvas, dock.firstChild);                   // inside the dock, under the icons: the window pours INTO the Chat icon and vanishes behind it, as on a Mac
    const ctx = canvas.getContext("2d", { alpha: true }); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = phone ? "low" : "high";
    sec.classList.add("is-genie");
    const ROW = 2, rows = Math.ceil(H / ROW), srcRow = pic.height / rows;   // 2px rows everywhere: on phones 3px rows showed as fine steps on the edges
    const draw = p => {                                              // p: 0 = window open, 1 = inside the icon
      const a = smoother(clamp01(p / .55)), b = smoother(clamp01((p - .22) / .78)), tail = b * b * b;   // the pinch and the slide overlap more: one continuous motion
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, -bx * dpr, -by * dpr);
      ctx.globalAlpha = 1 - smooth(clamp01((p - .6) / .34));      // near the icon it melts away (the eye kept catching the last bit)
      const yTop = lerp(T, ib - ih, b), span = lerp(H, ih, b) / rows;  // rows are evenly spaced at every moment
      for (let n = 0; n < rows; n++) {
        const y0 = yTop + n * span, yc = y0 + span / 2;
        const q = smooth(clamp01((yc - T) / (ib - T))) * a;
        const w = lerp(lerp(W, iw, q), iw, tail), x = lerp(lerp(cx, ix, q), ix, tail);
        ctx.drawImage(pic, 0, n * srcRow, pic.width, srcRow, x - w / 2, y0, w, span + .7);
      }
    };
    /* the hand-over between the picture and the live window: the live window is fully shown underneath (it is opaque) and only
       the picture fades on top of it, so nothing behind ever shows through and small differences read as a quick dissolve:
       opening ends with the picture dissolving off the window, closing starts with the picture dissolving onto it */
    const opening = from > to, FADE = opening ? .1 : .07;   // the window takes over right as the bend settles, not after a held frame
    const showWin = on => { win.style.visibility = on ? "visible" : ""; win.style.opacity = on ? "1" : ""; };
    const at = k => {
      if (opening) {
        draw(lerp(from, to, Math.min(1, k / (1 - FADE))));
        const f = clamp01((k - (1 - FADE)) / FADE); showWin(f > 0); canvas.style.opacity = (1 - f).toFixed(3);
      } else {                                                       // closing: the bend starts at once (no held frame), the
        const f = clamp01(k / FADE); showWin(f < 1); canvas.style.opacity = f.toFixed(3);   // dissolve onto the window is very short
        draw(lerp(from, to, k));
      }
    };
    at(0);
    let t0 = 0, warm = 0;                                           // the clock starts after one warm-up frame: the first frame
    genie = { canvas, raf: 0 };                                     // carries the restyle of the whole block and can be slow, and
    const step = now => {                                           // the bend must not skip ahead because of it
      if (warm < 1) { warm++; genie.raf = requestAnimationFrame(step); return; }
      if (!t0) t0 = now;
      const k = Math.min(1, (now - t0) / ms);
      at(k);
      if (k < 1) genie.raf = requestAnimationFrame(step);
      else { stopGenie(); done && done(); }
    };
    genie.raf = requestAnimationFrame(step);
  }
  /* the picture is prepared ahead of time, so a click starts the animation at once instead of waiting for the capture:
     whenever the window's content settles (new message, answer, scroll, resize, language), a fresh picture is taken in idle time */
  let pic = null, picT = 0;
  const idle = fn => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 60));
  const refreshPic = (delay = 150) => {
    pic = null; clearTimeout(picT);
    picT = setTimeout(() => idle(() => {
      if (genie || performance.now() - lastMove < 450) return refreshPic(250);   // only when the page has been still for a moment
      const r = winBox();
      if (r.width < 50 || r.height < 50) return;
      snapshot(r).then(c => { if (!pic) pic = { c, w: Math.round(r.width), h: Math.round(r.height) }; }).catch(() => {});
    }), delay);
  };
  const freshPic = () => {
    const r = winBox();
    return pic && Math.abs(pic.w - r.width) < 2 && Math.abs(pic.h - r.height) < 2 ? Promise.resolve(pic.c) : snapshot(r);
  };
  new MutationObserver(() => refreshPic()).observe(win, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "class", "disabled"] });
  $("#ctLog").addEventListener("scroll", () => refreshPic(), { passive: true });
  let picW = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== picW) { picW = innerWidth; refreshPic(400); } });
  addEventListener("langchange", () => refreshPic(400));
  // first picture: as soon as the block is near, with the window laid out where it will open
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => { placeWin(); refreshPic(0); }, 300); } }, { rootMargin: "300px" }).observe(sec);
  const winBox = () => {                                         // the window has no transform: its box is exactly where it shows
    const b = win.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom };
  };
  const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), ms))]);
  const bounceIcon = () => { chatIcon.classList.remove("is-bounce"); void chatIcon.offsetWidth; chatIcon.classList.add("is-bounce", "is-ran"); };

  /* the window stands above the dock, like a Mac app window over its Dock: its bottom sits just over the icons,
     its height is whatever fits between the site header and the dock (up to 660px) */
  const HEADER = 80, GAP = 16, WANT = 660, MIN = 470;   // under 470px above the dock (small phones) the chat may cover the dimmed dock instead
  const placeWin = () => {
    const top = dock.getBoundingClientRect().top, room = top - GAP - HEADER;
    if (room >= MIN) {
      const h = Math.min(WANT, room);
      win.style.setProperty("--winh", h + "px");
      win.style.setProperty("--wintop", (top - GAP - h) + "px");
    } else {                                                        // small phone: the chat may cover the (dimmed) dock rather than be cramped
      const h = Math.min(MIN, innerHeight - HEADER - GAP);           // tall enough that the answer chips don't squeeze the conversation to one line
      win.style.setProperty("--winh", h + "px");
      win.style.setProperty("--wintop", HEADER + "px");
    }
    return room;
  };
  addEventListener("resize", () => { if (sec.classList.contains("is-chat")) placeWin(); });
  const reallyOpen = from => {
    placeWin();
    stopGenie();
    const picP = reduced() ? null : withTimeout(freshPic(), 600);   // grab the ready picture before the chat starts writing into the window
    sec.classList.remove("is-closing"); sec.classList.add("is-chat");
    // the chat starts writing only once the window is open, so the picture that pours out is exactly what the window then shows
    const begin = () => { if (!started && sec.classList.contains("is-chat")) { started = true; flow().catch(() => {}); } };
    if (picP) {
      bounceIcon(); sec.classList.add("is-genie");                  // laid out but hidden until its picture has poured out of the icon
      picP.then(c => { if (sec.classList.contains("is-chat")) playGenie(c, 1, 0, 480, begin); else sec.classList.remove("is-genie"); })
          .catch(() => { sec.classList.remove("is-genie"); begin(); });
    } else begin();
    setTimeout(() => xBtn.focus({ preventScroll: true }), 300);
  };

  const open = from => {
    opener = from; rest(); sweeping = false; apps.forEach(x => x.classList.remove("is-tip", "is-lit"));   // a sweep cut short by the chat leaves no tooltip behind
    // not enough room above the dock (the block is scrolled high up)? glide to the end of the page first, then open
    if (dock.getBoundingClientRect().top - GAP - HEADER < MIN && window.__lenis) {
      window.__lenis.scrollTo(document.documentElement.scrollHeight, { duration: .6, onComplete: () => reallyOpen(from) });
    } else reallyOpen(from);
  };
  // the window is fixed on screen: if the visitor scrolls away from the contact block, it closes
  new IntersectionObserver(es => { if (!es[0].isIntersecting && sec.classList.contains("is-chat")) close(); }, { threshold: .15 }).observe(sec);
  const close = viaKey => {
    if (!sec.classList.contains("is-chat")) return;
    if (reduced()) { stopGenie(); sec.classList.remove("is-chat"); }
    else {
      stopGenie();
      const r = win.getBoundingClientRect();
      sec.classList.add("is-closing"); sec.classList.remove("is-chat");                // the dock and the heading come back while it pours in
      withTimeout(freshPic(), 600)
        .then(c => playGenie(c, 0, 1, 520, () => sec.classList.remove("is-closing")))
        .catch(() => sec.classList.remove("is-closing"));
    }
    if (viaKey === true && opener) opener.focus({ preventScroll: true });   // keyboard users get focus back on the icon; a mouse close leaves no tooltip hanging
  };
  $$("[data-openchat]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); sec.classList.contains("is-chat") ? close() : open(a); }));
  xBtn.addEventListener("click", e => close(e.detail === 0));   // detail 0 = Enter/Space on the button
  /* a click anywhere outside the window closes it; composedPath still knows where the click was even if the button it hit has already been replaced */
  document.addEventListener("click", e => { if (!sec.classList.contains("is-chat")) return; if (!e.composedPath().some(n => n.nodeType === 1 && n.matches(".ct-win,[data-openchat]"))) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && sec.classList.contains("is-chat")) close(true); });
  addEventListener("langchange", () => { if (started) { started = false; gen++; log.innerHTML = ""; kb.innerHTML = ""; hint.innerHTML = ""; composer("", false); if (sec.classList.contains("is-chat")) { started = true; flow().catch(() => {}); } } });
})();
