/* Olga Akimova — portfolio
   Plain JS + CSS transitions. JavaScript only does what CSS can't:
   the scroll-linked cat frames, the artboard scale and a few measurements. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement, body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover)").matches;
  const portraitMQ = matchMedia("(max-aspect-ratio: 3/4)");
  const isMobile = () => portraitMQ.matches;           // portrait screens use the 390×844 artboard
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Chromium can refract the backdrop through an SVG filter; others get plain frosted glass
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  if (brands.some(b => /Chromium/i.test(b.brand))) root.classList.add("refract");

  /* ---------- smooth scroll (wheel only; touch stays native) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    lenis.stop();
  }

  /* ---------- menu ---------- */
  const menuBtn = $("#menuBtn"), menu = $("#menu");
  const setMenu = open => {
    body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  addEventListener("keydown", e => e.key === "Escape" && setMenu(false));
  $$("a[href^='#']").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const el = id === "#top" ? 0 : $(id);
    if (el === null) return;
    e.preventDefault(); setMenu(false);
    lenis ? lenis.scrollTo(el) : (el === 0 ? scrollTo({ top: 0, behavior: "smooth" }) : el.scrollIntoView({ behavior: "smooth" }));
  }));

  /* ---------- language switch: CSS moves the droplet, a class adds the stretch ---------- */
  const lang = $(".lang"), pill = $(".lang__pill");
  const placePill = l => pill.style.setProperty("--x", (l === "uk" ? $(".lang__btn[data-lang=uk]").offsetLeft - 4 : 0) + "px");
  placePill(window.currentLang);
  $$(".lang__btn").forEach(b => b.addEventListener("click", () => {
    const l = b.dataset.lang;
    if (l === window.currentLang) return;
    lang.classList.remove("is-moving"); void lang.offsetWidth; lang.classList.add("is-moving");
    placePill(l);
    window.setLang(l);
  }));
  pill.addEventListener("animationend", () => lang.classList.remove("is-moving"));

  /* ---------- glass highlight + magnetic CTA (CSS transitions do the easing) ---------- */
  if (hover) {
    $$(".glass").forEach(el => el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gl-x", e.clientX - r.left + "px");
      el.style.setProperty("--gl-y", e.clientY - r.top + "px");
    }));
    $$(".magnetic").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.3).toFixed(1) + "px");
        el.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px");
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px"); });
    });
  }

  /* ---------- cat: frames of a 360° turn, driven by scroll ----------
     Frames are cropped to the cat (CROP, in the 900×900 frame space) and decoded to
     ImageBitmaps, so drawing never stalls. They load in chunks: every 8th frame first
     (the loader waits only for these), then every 4th, every 2nd, then the rest.
     Phones get a lighter set: 60 frames (every 2nd) at 80% size. */
  const FRAMES = 120, BASE = 0.80;                   // soles at 80% of the frame height
  const CROP = { x: 65, y: 76, w: 757, h: 654, size: 900 };
  const phoneSet = isMobile();
  const dir = phoneSet ? "assets/cat/seq-m/" : "assets/cat/seq/";
  const canvas = $("#cat"), ctx = canvas.getContext("2d");
  const bmp = new Array(FRAMES);
  const loadFrame = i => new Promise(res => {
    const im = new Image();
    im.decoding = "async";
    im.onload = async () => {
      try { bmp[i] = window.createImageBitmap ? await createImageBitmap(im) : (await im.decode(), im); }
      catch (e) { bmp[i] = im; }
      res();
      if (Math.round(turn.cur) % FRAMES === i) needDraw = true;
    };
    im.onerror = res;
    im.src = dir + String(i).padStart(3, "0") + ".webp";
  });
  const tiers = [8, 4, 2].concat(phoneSet ? [] : [1]);
  const chunks = [];                                   // [[frame indices], ...] in load order
  const seen = new Set();
  tiers.forEach(step => {
    const c = [];
    for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); c.push(i); }
    chunks.push(c);
  });
  const PAR = 6;                                       // parallel requests within a chunk
  const loadChunk = list => {
    let k = 0;
    const worker = () => k < list.length ? loadFrame(list[k++]).then(worker) : Promise.resolve();
    return Promise.all(Array.from({ length: Math.min(PAR, list.length) }, worker));
  };
  const firstLoads = chunks[0].map(loadFrame);          // first chunk: all at once (HTTP/2 multiplexes)
  Promise.all(firstLoads).then(() => chunks.slice(1).reduce((p, c) => p.then(() => loadChunk(c)), Promise.resolve()));

  const nearest = i => {
    for (let d = 0; d < FRAMES; d++) {
      const a = bmp[(i + d) % FRAMES]; if (a) return a;
      const b = bmp[(i - d + FRAMES) % FRAMES]; if (b) return b;
    }
    return null;
  };
  let cw = 0, ch = 0, drawn = -1, needDraw = true;
  function fit() {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2, 1100 / Math.max(r.width, 1));
    const w = Math.round(r.width * scale), h = Math.round(r.height * scale);
    if (!w || !h) return;
    if (w === cw && h === ch && drawn !== -1) return;   // same size: keep what's on the canvas
    // resizing a canvas wipes it, so redraw the current frame right away (no blank frame while dragging the window)
    cw = canvas.width = w; ch = canvas.height = h;
    drawn = -1;
    drawCat(((Math.round(turn.cur) % FRAMES) + FRAMES) % FRAMES);
  }
  function groundCat() {                               // light pool + soft contact shadow under the feet
    ctx.save();
    ctx.translate(cw / 2, ch * BASE); ctx.scale(1, 0.16);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, cw * 0.42);
    g.addColorStop(0, "rgba(120,150,255,0.18)"); g.addColorStop(0.5, "rgba(26,75,255,0.08)"); g.addColorStop(1, "rgba(26,75,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cw * 0.42, 0, Math.PI * 2); ctx.fill();
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, cw * 0.27);
    g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(0.6, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cw * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawCat(f) {
    const im = bmp[f] || nearest(f);
    if (!im || !cw) return;
    drawn = bmp[f] ? f : -1;
    const k = cw / CROP.size, dx = CROP.x * k, dy = CROP.y * k, dw = CROP.w * k, dh = CROP.h * k;
    ctx.clearRect(0, 0, cw, ch);
    groundCat();
    ctx.drawImage(im, dx, dy, dw, dh);
    const y0 = ch * BASE, rh = ch * 0.09;              // short reflection under the feet
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y0, cw, rh); ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.translate(0, y0 * 2); ctx.scale(1, -1);
    ctx.drawImage(im, dx, dy, dw, dh);
    ctx.restore();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g; ctx.fillRect(0, y0, cw, rh);
    ctx.globalCompositeOperation = "source-over";
  }
  // the turn eases toward the scroll target; the loop only runs while something changes
  const turn = { target: 0, cur: 0 };
  let looping = false;
  function tick() {
    turn.cur += (turn.target - turn.cur) * 0.18;
    if (Math.abs(turn.target - turn.cur) < 0.01) turn.cur = turn.target;
    const f = ((Math.round(turn.cur) % FRAMES) + FRAMES) % FRAMES;
    if (f !== drawn || needDraw) { needDraw = false; drawCat(f); }
    if (turn.cur !== turn.target || needDraw) requestAnimationFrame(tick);
    else looping = false;
  }
  const kick = () => { if (!looping) { looping = true; requestAnimationFrame(tick); } };
  if (/[?&]debug/.test(location.search)) window.__cat = () => ({ cur: turn.cur, drawn, loaded: bmp.filter(Boolean).length });

  /* ---------- mouse parallax (CSS transitions ease it) ---------- */
  if (hover) {
    addEventListener("pointermove", e => {
      if (body.classList.contains("is-loading")) return;
      root.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
    }, { passive: true });
  }

  /* ---------- artboard scale + name fitting ----------
     The hero is laid out on a fixed artboard (1440×900, or 390×844 on portrait screens)
     and scaled as a whole, so window size and browser zoom never move things around. */
  const hero = $("#hero"), pin = $(".hero__pin"), board = $("#board"), title = $("#heroTitle"), row = $("#heroRow"), stage = $("#stage");
  /* Phones: the artboard is fitted to the width and stretched to the real screen height
     (which varies a lot: Safari with both bars is ~650px, Chrome ~780px). The name sits at
     the top, the button and the note at the bottom, and the cat is sized to fill the space
     between them, with its ear tips just touching the role line. */
  function placeStageMobile(bh) {
    const titleBottom = title.offsetTop + title.offsetHeight;
    const hudH = Math.max(...huds.map(h => h.offsetHeight), 40);
    const solesMax = bh - 138 - hudH - 26;            // above the note (CSS: .hud bottom 138), leaving room for the reflection
    const earsMin = titleBottom - 8;
    const span = solesMax - earsMin;                    // ears-to-soles is 70% of the stage
    const size = clamp(span / 0.70, 300, 470);
    const soles = solesMax - Math.max(0, span - 0.70 * size) / 2;   // tall screens: centre the cat in the gap
    Object.assign(stage.style, {
      width: size + "px", height: size + "px",
      left: (390 - size) / 2 + "px", top: Math.round(soles - BASE * size) + "px"
    });
  }
  /* Mobile browsers hide their bars while scrolling, so the visible area grows and shrinks.
     The scene's background fills the largest size (100lvh), while the content is laid out in
     the smallest one (100svh, measured by a probe), so nothing ends up under the bars and no
     empty strip shows below the scene when they collapse. */
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none";
  body.appendChild(probe);
  const safeH = () => Math.min(probe.offsetHeight || innerHeight, pin.clientHeight);
  function setScale() {
    const mob = isMobile(), H = safeH();
    const bw = mob ? 390 : 1440;
    const s = mob ? pin.clientWidth / bw : Math.min(pin.clientWidth / bw, H / 900);
    const bh = mob ? H / s : 900;
    board.style.setProperty("--s", s.toFixed(4));
    board.style.height = mob ? bh.toFixed(1) + "px" : "";
    board.style.top = (H / 2).toFixed(1) + "px";
    if (mob) placeStageMobile(bh); else stage.removeAttribute("style");
    if (cw) fit();
    const boardTop = (H - bh * s) / 2;  // wall/floor line behind the cat, a bit above the soles
    const horizon = stage.offsetTop + stage.offsetHeight * (BASE - 0.085);
    pin.style.setProperty("--horizon", Math.round(boardTop + horizon * s) + "px");
  }
  function fitTitle() {
    title.style.setProperty("--fs", "100px");
    const w = row.offsetWidth;                         // artboard pixels, unaffected by the scale
    if (!w) return;
    let fs;
    if (isMobile()) {
      fs = 100 * (348 / w);
      title.style.top = "";
      title.style.setProperty("--fs", fs.toFixed(2) + "px");
      setScale();                                       // the cat's place depends on the title height
      return;
    } else {
      const H = stage.offsetHeight, TOP_MIN = 92;
      const earTop = stage.offsetTop + 0.10 * H;       // cat 70% tall with soles at 80% -> ears at 10%
      const lineBottom = earTop + 0.04 * H;             // only the ear tips reach into the letters
      fs = Math.min(100 * (1300 / w), (lineBottom - TOP_MIN) / 0.8);
      title.style.top = Math.round(lineBottom - 0.8 * fs) + "px";
    }
    title.style.setProperty("--fs", fs.toFixed(2) + "px");
  }

  /* ---------- scroll: progress bar, cat frame, scene states ---------- */
  const bar = $("#scrollProgress"), huds = $$(".hud");
  const hudAt = [0.14, 0.4, 0.64], HUD_OUT = 0.86;
  let heroTop = 0, heroLen = 1, docLen = 1;
  const measure = () => {
    heroTop = hero.offsetTop;
    heroLen = Math.max(1, hero.offsetHeight - innerHeight);
    docLen = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  };
  function onScroll() {
    const y = lenis ? lenis.scroll : scrollY;
    bar.style.transform = `scaleX(${clamp(y / docLen, 0, 1).toFixed(4)})`;
    const p = clamp((y - heroTop) / heroLen, 0, 1);
    // one full turn between 4% and 92% of the scene, ending face-forward, then a short hold
    turn.target = clamp((p - 0.04) / 0.88, 0, 1) * FRAMES;
    kick();
    hero.classList.toggle("is-scrolled", p > 0.02);              // CSS hides the list and the scroll hint
    hero.classList.toggle("is-turning", p > 0.02 && p < 0.74);   // CSS dims the name while the cat turns
    huds.forEach((h, i) => h.classList.toggle("is-in", isMobile()
      ? p >= hudAt[i] && p < (hudAt[i + 1] ?? HUD_OUT)
      : p >= hudAt[i] && p < HUD_OUT));
    remember(y);
  }
  lenis ? lenis.on("scroll", onScroll) : addEventListener("scroll", onScroll, { passive: true });

  /* ---------- loader: waits for the first chunk of frames and the exact fonts ---------- */
  const countEl = $("#loaderCount"), loaderBar = $("#loaderBar"), loader = $("#loader");
  const fontJobs = document.fonts
    ? ["800 100px Unbounded", "400 12px Unbounded"].map(f => document.fonts.load(f, "OLGA AKIMOVA ОЛЬГА АКІМОВА $").catch(() => {}))
    : [];
  const jobs = [...firstLoads, ...fontJobs];
  let target = 0, done = 0, shown = 0;
  jobs.forEach(p => p.then(() => { done++; target = Math.round((done / jobs.length) * 100); }));
  const minTime = reduce ? 0 : 400, t0 = performance.now();
  setTimeout(() => { target = 100; }, 8000);            // never hang on the loader
  (function loaderTick() {
    const cap = Math.min(100, ((performance.now() - t0) / Math.max(minTime, 1)) * 100);
    const goal = Math.min(target, cap);
    shown += (goal - shown) * 0.2;
    if (goal - shown < 0.5) shown = goal;
    const v = Math.round(shown);
    countEl.textContent = v + "%";
    loaderBar.style.transform = `scaleX(${v / 100})`;
    if (v >= 100) finishLoader(); else requestAnimationFrame(loaderTick);
  })();
  // Everything is laid out and drawn before the loader leaves, so the page appears complete.
  function finishLoader() {
    body.classList.remove("is-loading");
    setScale(); fitTitle(); fit(); measure();
    needDraw = true; drawCat(0); onScroll();
    requestAnimationFrame(() => loader.classList.add("is-done"));         // CSS fades it out
    loader.addEventListener("transitionend", () => { loader.remove(); if (lenis) lenis.start(); }, { once: true });
  }

  setScale(); fitTitle(); fit();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitTitle);
  if (document.fonts) document.fonts.addEventListener("loadingdone", fitTitle);
  addEventListener("load", () => { fitTitle(); measure(); });
  window.addEventListener("langchange", fitTitle);
  portraitMQ.addEventListener("change", () => { setScale(); fitTitle(); fit(); measure(); onScroll(); });

  /* ---------- resize / browser zoom ----------
     Page height depends on the viewport, so after a zoom the same scrollY means a different
     spot. Remember the position as a fraction (from before the zoom) and go back there. */
  let rz, keep = null, lastW = innerWidth, frac = 0;
  function remember(y) { frac = y / docLen; }
  addEventListener("resize", () => {
    if (innerWidth === lastW) { setScale(); fit(); return; }   // phone address bar: width unchanged
    lastW = innerWidth;
    if (keep === null) keep = frac;
    setScale(); fit(); fitTitle(); placePill(window.currentLang);
    clearTimeout(rz);
    rz = setTimeout(() => {
      measure();
      const y = keep * docLen;
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y);
      keep = null;
      onScroll();
    }, 160);
  });
})();
