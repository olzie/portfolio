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

  // Always open at the top: no restored scroll position on reload, so the cat starts face-forward
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) scrollTo(0, 0);

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
  // bump when the frames are re-rendered, so a browser never mixes cached old frames with new ones
  const FRAMES_V = "20261126a";
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
      if (((turn.shown % FRAMES) + FRAMES) % FRAMES === i) needDraw = true;
    };
    im.onerror = res;
    im.src = dir + String(i).padStart(3, "0") + ".webp?v=" + FRAMES_V;
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
    const scale = Math.min(devicePixelRatio || 1, 2, 1400 / Math.max(r.width, 1));   // sharper on retina, still cheap to draw
    const w = Math.round(r.width * scale), h = Math.round(r.height * scale);
    if (!w || !h) return;
    if (w === cw && h === ch && drawn !== -1) return;   // same size: keep what's on the canvas
    // resizing a canvas wipes it, so redraw the current frame right away (no blank frame while dragging the window)
    cw = canvas.width = w; ch = canvas.height = h;
    drawn = -1;
    drawCat(shownFrame());
  }
  /* Floor contact, measured offline from the frames: for each frame, which 8px columns of the
     crop touch the floor (NEAR: the bottom 5px, FAR: the bottom 40px). The shadow is built from
     those columns, so it sits under the shoe, the body and the tail in every pose, not just
     under the middle. */
  const CONTACT_NEAR="fffffffffffffff0000 fffffffffffffff0000 fffffffffffffff0000 fffffffffffffff0000 7fffffffffffffe0000 7fffffffffffffc0000 3fffffffffffff80000 1fffffffffffffc0000 fffffffffffffe0000 7fffffffffffff0000 3fffffffffffff8000 1fffffffffffffc000 fffffffffffffe000 ffffffffffffff000 7fffffffffffff800 3fffffffffffffe00 1ffffffffffffff00 1ffffffffffffff80 1ffffffffffffffc0 1ffffffffffffffc0 3ffffffffffffffe0 7fffffffffffffff0 ffffffffffffffff8 1ffffffffffffffffc 3ffffffffffffffffc 7ffffffffffffffffc fffffffffffffffffe 1fffffffffffffffffe 1fffffffffffffffffe 7fffffffffffffffffe 7fffffffffffffffffe ffffffffffffffffffe 1ffffffffffffffffffc 1ffffffffffffffffffc 3ffffffffffffffffff8 3ffffffffffffffffff0 7ffffffffffffffffff0 fffffffffffffffffff8 1fffffffffffffffffffc 3fffffffffffffffffffe 7fffffffffffffffffffe ffffffffffffffffffffe 1fffffffffffffffffffff 3fffffffffffffffffffff 7fffffffffffffffffffff 7ffffffffffffffffffffe fffffffffffffffffffffe 1fffffffffffffffffffffc 1fffffffffffffffffffff8 3fffffffffffffffffffff8 3fffffffffffffe3ffffff0 3ffffffffffffff3fffffc0 3ffffffffffffffffffff80 3ffffffffffffffffffff00 3fffffffffffffffffffc00 3fffffffffffffffffff800 3ffffffffffffffffffe000 1ffffffffffffffffff8000 ffffffffffffffffff0000 fffffffffffffffffc0000 7ffffffffffffffff00000 3fffffffffffffffc00000 1fffffffffffffff000000 ffffffffffffffe000000 7fffffffffffffc000000 1fffffffffffff0000000 1fffffffffffff0000000 7fffffffffffff0000000 ffffffffffffff0000000 3ffffffffffffff8000000 7ffffffffffffffc000000 1fffffffffffffffe000000 3ffffffffffffffff000000 7ffffffffffffffff800000 fffffffffffffffffc00000 1fffffffffffffffffc00000 1fffffffffffffffffe00000 3fffffffffffffffffe00000 3ffffffffffffffffff00000 3ffffffffffffffffff00000 3ffffffffffffffffff80000 3ffffffffffffffffff80000 3ffffffffffffffffff80000 1ffffffffffffffffff80000 ffffffffffffffffff80000 7fffffffffffffffffc0000 7fffffffffffffffffc0000 ffffffffffffffffffc0000 1ffffffffffffffffffc0000 3ffffffffffffffffffe0000 3fffffffffffffffffff0000 3fffffffffffffffffff8000 3fffffffffffffffffffc000 3fffffffffffffffffffe000 3ffffffffffffffffffff000 1ffffffffffffffffffff800 1ffffffffffffffffffff800 ffffffffffffffffffff800 ffffffffffffffffffff800 7fffffffffffffffffff800 3fffffffffffffffffff800 1fffffffffffffffffff000 fffffffffffffffffff000 7fffffffffffffffffe000 3fffffffffffffffffe000 1fffffffffffffffffc000 fffffffffffffffffc000 7ffffffffffffffff8000 3ffffffffffffffff0000 1ffffffffffffffff0000 fffffffffffffffe0000 7ffffffffffffffe0000 3ffffffffffffffe0000 1ffffffffffffffc0000 1ffffffffffffffc0000 ffffffffffffffc0000 ffffffffffffffc0000 ffffffffffffff80000 7fffffffffffff80000 7fffffffffffff80000".split(" "), CONTACT_FAR="ffffffffffffffffc00 ffffffffffffffffc00 ffffffffffffffff800 ffffffffffffffff800 7fffffffffffffff800 7fffffffffffffff000 3ffffffffffffffe000 1ffffffffffffffc000 ffffffffffffff8000 7fffffffffffff0000 3fffffffffffff8000 1fffffffffffffc000 fffffffffffffe000 ffffffffffffff000 ffffffffffffff800 ffffffffffffffe00 fffffffffffffff00 1fffffffffffffff80 1fffffffffffffffc0 1fffffffffffffffc0 1fffffffffffffffe0 3ffffffffffffffff0 7ffffffffffffffff8 fffffffffffffffffc fffffffffffffffffc 1fffffffffffffffffc 3fffffffffffffffffe 7fffffffffffffffffe 7fffffffffffffffffe ffffffffffffffffffe 1ffffffffffffffffffe 1ffffffffffffffffffe 3ffffffffffffffffffc 3ffffffffffffffffffc 7ffffffffffffffffff8 1fffffffffffffffffff0 3fffffffffffffffffff0 7fffffffffffffffffff8 ffffffffffffffffffffc 1ffffffffffffffffffffe 3ffffffffffffffffffffe 7ffffffffffffffffffffe ffffffffffffffffffffff 1ffffffffffffffffffffff 3ffffffffffffffffffffff 3fffffffffffffffffffffe 7fffffffffffffffffffffe ffffffffffffffffffffffc ffffffffffffffffffffff8 1ffffffffffffffffffffff8 1ffffffffffffffffffffff0 1fffffffffffffffffffffc0 1fffffffffffffffffffff80 1fffffffffffffffffffff00 1ffffffffffffffffffffc00 1ffffffffffffffffffff800 1fffffffffffffffffffe000 fffffffffffffffffffc000 7ffffffffffffffffff0000 7fffffffffffffffffc0000 3fffffffffffffffff00000 1ffffffffffffffffc00000 ffffffffffffffff000000 3ffffffffffffffe000000 1ffffffffffffffc000000 ffffffffffffffc000000 3fffffffffffffc000000 7fffffffffffffc000000 ffffffffffffffc000000 3ffffffffffffffc000000 7ffffffffffffffc000000 1fffffffffffffffe000000 3ffffffffffffffff000000 7ffffffffffffffff800000 fffffffffffffffffc00000 1fffffffffffffffffc00000 1fffffffffffffffffe00000 3ffffffffffffffffff00000 3ffffffffffffffffff00000 3ffffffffffffffffff80000 3ffffffffffffffffff80000 3ffffffffffffffffff80000 3ffffffffffffffffffc0000 1ffffffffffffffffffc0000 ffffffffffffffffffc0000 7fffffffffffffffffc0000 7fffffffffffffffffc0000 ffffffffffffffffffc0000 1ffffffffffffffffffe0000 3fffffffffffffffffff0000 3fffffffffffffffffffc000 3fffffffffffffffffffe000 3ffffffffffffffffffff800 3ffffffffffffffffffffc00 3ffffffffffffffffffffe00 1fffffffffffffffffffff00 1fffffffffffffffffffff00 fffffffffffffffffffff80 fffffffffffffffffffff80 7ffffffffffffffffffff80 3ffffffffffffffffffff80 1ffffffffffffffffffff80 ffffffffffffffffffff80 7fffffffffffffffffff80 3fffffffffffffffffff00 1fffffffffffffffffff00 fffffffffffffffffff00 7fffffffffffffffffe00 3fffffffffffffffffe00 1fffffffffffffffffc00 fffffffffffffffffc00 7ffffffffffffffff800 3ffffffffffffffff800 1ffffffffffffffff000 1ffffffffffffffff000 ffffffffffffffff000 ffffffffffffffff000 fffffffffffffffe000 7ffffffffffffffe000 7ffffffffffffffe000".split(" ");
  const BIN = 8, binCache = {};
  const bins = (list, f) => binCache[list === CONTACT_NEAR ? "n" + f : "f" + f] ??= (() => {
    const hex = list[f], out = [];
    for (let i = 0; i < hex.length * 4; i++) {
      const c = parseInt(hex[hex.length - 1 - (i >> 2)], 16);
      if (c >> (i & 3) & 1) out.push(i);
    }
    return out;
  })();
  const dot = (() => {                                 // one soft black dot, stamped along the contact
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.5, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  })();
  // The light pool follows the cat's footprint, smoothed over neighbouring frames: per-frame
  // spans change in jumps (the tail lifts off, a shoe turns), and a hopping glow made the cat look jumpy.
  const POOL = (() => {
    const raw = CONTACT_FAR.map((_, f) => {
      const b = bins(CONTACT_FAR, f);
      return b.length ? [b[0], b[b.length - 1] + 1] : [40, 55];
    });
    const n = raw.length, R = 7;
    return raw.map((_, f) => {
      let l = 0, r = 0, w = 0;
      for (let d = -R; d <= R; d++) {
        const q = raw[(f + d + n) % n], k = R + 1 - Math.abs(d);
        l += q[0] * k; r += q[1] * k; w += k;
      }
      return [l / w * BIN, r / w * BIN];           // crop pixels
    });
  })();
  /* Floor under the cat. Drawn with "destination-over", i.e. BEHIND what is already on the
     canvas, after the reflection has been faded: the fade then only touches the reflection
     (fading the whole band also cut a dark strip out of the lit floor under the tail). */
  function groundCat(f) {
    const k = cw / CROP.size, y0 = ch * BASE;
    const near = bins(CONTACT_NEAR, f), far = bins(CONTACT_FAR, f);
    const colX = i => (CROP.x + (i + 0.5) * BIN) * k;
    const l = (CROP.x + POOL[f][0]) * k, r = (CROP.x + POOL[f][1]) * k, cx = (l + r) / 2, hw = (r - l) / 2;
    // 1. contact shadow on the floor right where the shoes, body and tail touch (just below the line, never on the cat)
    let w = BIN * k * 2.6, h = ch * 0.018;
    ctx.globalAlpha = 0.5;
    for (const i of near) ctx.drawImage(dot, colX(i) - w / 2, y0 - h * 0.3, w, h);
    // 2. wide soft shade under everything that is close to the floor
    w = BIN * k * 5; h = ch * 0.05;
    ctx.globalAlpha = 0.13;                            // every 2nd column is enough: the dots overlap
    for (let n = 0; n < far.length; n += 2) ctx.drawImage(dot, colX(far[n]) - w / 2, y0 - h * 0.45, w, h);
    ctx.globalAlpha = 1;
    // 3. blue light pool on the floor, following the cat (furthest back)
    ctx.save();
    const R = Math.max(cw * 0.42, hw + cw * 0.14);
    ctx.translate(cx, y0 + ch * 0.016); ctx.scale(1, 0.13);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, "rgba(140,165,255,0.28)"); g.addColorStop(0.45, "rgba(40,90,255,0.11)"); g.addColorStop(1, "rgba(26,75,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawCat(f) {
    const im = bmp[f] || nearest(f);
    if (!im || !cw) return;
    drawn = bmp[f] ? f : -1;
    const k = cw / CROP.size;
    let dx = CROP.x * k, dy = CROP.y * k, dw = CROP.w * k, dh = CROP.h * k;
    /* The last frames of the turn drift ~5px taller and ~3px right of frame 0, so the cat
       hopped when the turn landed back on it. Ease the last 20 frames into frame 0's size
       and place (scaled about the soles, under the head), a fraction of a pixel per frame. */
    if (f >= 100) {
      const t = (f - 99) / 20, s = 1 - 0.0072 * t;
      const ax = (CROP.x + 383) * k, ay = ch * BASE;
      dx = ax + (dx - ax) * s - 3.4 * t * k; dy = ay + (dy - ay) * s; dw *= s; dh *= s;
    }
    ctx.clearRect(0, 0, cw, ch);
    // reflection: the cat mirrored at the floor line, short and faint, faded out downwards
    const y0 = ch * BASE, rh = ch * 0.065;
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
    // floor goes behind the reflection, the cat on top of everything
    ctx.globalCompositeOperation = "destination-over";
    groundCat(f);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(im, dx, dy, dw, dh);
  }

  // the turn eases toward the scroll target; the loop only runs while something changes
  const turn = { target: 0, cur: 0, shown: 0 };
  let looping = false;
  /* Which frame to show, with hysteresis: a new frame only once the turn has moved 0.85 of a
     frame away. Without it, resting the page right on a frame boundary (the trackpad and smooth
     scroll keep nudging it by a pixel) flipped between two neighbouring frames, e.g. the last
     frame and the front view at the end of the turn, which looked like the cat jumping. */
  function shownFrame() {
    const atEnd = turn.cur === turn.target && (turn.target <= 0 || turn.target >= FRAMES - 1);
    const d = turn.cur - turn.shown;
    if (atEnd) turn.shown = Math.round(turn.cur);
    else if (Math.abs(d) >= 0.85) turn.shown += Math.sign(d) * Math.floor(Math.abs(d) + 0.15);   // step, don't skip
    return ((turn.shown % FRAMES) + FRAMES) % FRAMES;
  }
  function tick() {
    turn.cur += (turn.target - turn.cur) * 0.18;
    if (Math.abs(turn.target - turn.cur) < 0.01) turn.cur = turn.target;
    const f = shownFrame();
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
  const bar = $("#scrollProgress"), huds = $$(".hud"), beam = $(".hero__light--wide");
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
    beam.style.setProperty("--beam", p.toFixed(3));
    /* one full turn between 4% and 82% of the scene, then a long hold facing forward until the
       next block arrives. (Ending the turn at 92% put its last frame step right where people
       stop before scrolling on, so the cat snapped to the front view after the motion settled.) */
    // The turn ends on the last frame, not back on frame 0: the video's loop isn't seamless, and the
    // step from the last frame to the first was a visible snap right as the cat came to rest.
    turn.target = clamp((p - 0.04) / 0.78, 0, 1) * (FRAMES - 1);
    kick();
    hero.classList.toggle("is-scrolled", p > 0.02);              // CSS hides the list and the scroll hint
    hero.classList.toggle("is-turning", p > 0.02 && p < 0.74);   // CSS dims the name while the cat turns
    huds.forEach((h, i) => h.classList.toggle("is-in", isMobile()
      ? p >= hudAt[i] && p < (hudAt[i + 1] ?? HUD_OUT)
      : p >= hudAt[i] && p < HUD_OUT));
    remember(y);
  }
  lenis ? lenis.on("scroll", onScroll) : addEventListener("scroll", onScroll, { passive: true });

  /* ---------- numbers block: rows rise in and the figures count up once, when it comes into view ---------- */
  const nums = $("#numbers");
  if (nums) {
    const counters = $$(".count", nums);
    const run = () => {
      nums.classList.add("is-in");
      counters.forEach((el, i) => {
        const to = +el.dataset.to, delay = 300 + i * 80, dur = 1600;
        if (reduce) { el.textContent = to; return; }
        el.textContent = "0";
        const t0 = performance.now() + delay;
        const step = now => {
          const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(2, -10 * k);   // fast start, soft landing
          el.textContent = Math.round(to * (k === 1 ? 1 : e));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    counters.forEach(el => { el.textContent = "0"; });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); }
      }, { threshold: 0.2 });
      io.observe(nums);
    } else run();
  }

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
    if (!location.hash) scrollTo(0, 0);                 // undo any scroll that slipped in during loading
    body.classList.remove("is-loading");
    setScale(); fitTitle(); fit(); measure();
    if (lenis && !location.hash) lenis.scrollTo(0, { immediate: true, force: true });
    onScroll();
    turn.cur = turn.target;                              // no visible spin when the page appears
    turn.shown = Math.round(turn.cur);
    needDraw = true; drawCat(shownFrame());
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
