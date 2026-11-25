(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover)").matches;
  const portraitMQ = matchMedia("(max-aspect-ratio: 3/4)");
  const isMobile = () => portraitMQ.matches;           // portrait screens use the 390×844 artboard
  gsap.registerPlugin(ScrollTrigger);

  // Chromium can refract the backdrop through an SVG filter; others get plain frosted glass
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  if (brands.some(b => /Chromium/i.test(b.brand))) document.documentElement.classList.add("refract");

  /* ---------- live clock (Kyiv time) ---------- */
  const clocks = $$(".js-clock");
  const tick = () => {
    const t = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Kyiv", hour12: false });
    clocks.forEach(c => (c.textContent = t));
  };
  tick(); setInterval(tick, 1000);

  /* ---------- decorative bits ---------- */
  /* ---------- text scramble (HUD labels) ---------- */
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEFXZ";
  function scramble(el) {
    const html = el.dataset.final || el.innerHTML;
    el.dataset.final = html;
    const plain = html.split(/(<br>)/).map(p => (p === "<br>" ? p : p.replace(/&amp;/g, "&")));
    const total = plain.reduce((n, p) => n + (p === "<br>" ? 0 : p.length), 0);
    let frame = 0; const dur = Math.min(40, 14 + total * 0.35);
    cancelAnimationFrame(el._raf);
    const step = () => {
      const revealed = Math.floor((frame / dur) * total);
      let k = 0;
      el.innerHTML = plain.map(p => {
        if (p === "<br>") return p;
        let out = "";
        for (const ch of p) { out += k < revealed || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; k++; }
        return out.replace(/&(?!amp;)/g, "&amp;").replace(/</g, "&lt;");
      }).join("");
      if (frame++ < dur) el._raf = requestAnimationFrame(step);
      else el.innerHTML = html;
    };
    step();
  }

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------- header: scroll progress line ---------- */
  gsap.to("#scrollProgress", {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 }
  });

  /* ---------- menu ---------- */
  const menuBtn = $("#menuBtn"), menu = $("#menu");
  const setMenu = open => {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  addEventListener("keydown", e => e.key === "Escape" && setMenu(false));
  $$("a[href^='#']").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const el = id === "#top" ? 0 : $(id);
    if (el === null) return;
    e.preventDefault(); setMenu(false);
    lenis ? lenis.scrollTo(el) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView());
  }));

  /* ---------- language switch: a glass droplet that stretches as it slides ---------- */
  const pill = $(".lang__pill");
  const pillX = lang => (lang === "uk" ? $(".lang__btn[data-lang=uk]").offsetLeft - 4 : 0);
  gsap.set(pill, { x: pillX(window.currentLang) });
  $$(".lang__btn").forEach(b => b.addEventListener("click", () => {
    const lang = b.dataset.lang;
    if (lang === window.currentLang) return;
    gsap.timeline()
      .to(pill, { scaleX: 1.25, scaleY: 0.92, duration: 0.18, ease: "power2.in" })
      .to(pill, { x: pillX(lang), duration: 0.42, ease: "power3.inOut" }, 0.04)
      .to(pill, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "power3.out" }, 0.3);
    window.setLang(lang);
    $$(".hud p").forEach(p => { delete p.dataset.final; if (p.closest(".hud").classList.contains("is-in")) scramble(p); });
  }));

  /* ---------- glass: caustic highlight follows the cursor ---------- */
  if (hover) {
    $$(".glass").forEach(el => el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gl-x", e.clientX - r.left + "px");
      el.style.setProperty("--gl-y", e.clientY - r.top + "px");
    }));
  }

  /* ---------- magnetic buttons ---------- */
  if (hover) {
    $$(".magnetic").forEach(el => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- cat: 120 frames of a 360° turn, driven by scroll ----------
     Every frame is decoded up front into an ImageBitmap, so drawing never stalls.
     One frame is drawn at a time (no blending, so the cat is never doubled),
     plus a short, faint mirror reflection on the floor. */
  const FRAMES = 120, BASE = 0.80;                 // feet sit at 80% of the frame height
  const canvas = $("#cat"), ctx = canvas.getContext("2d", { alpha: true });
  const bmp = new Array(FRAMES);
  const src = i => `assets/cat/seq/${String(i).padStart(3, "0")}.webp`;
  const load = i => new Promise(res => {
    const im = new Image();
    im.onload = async () => {
      try { bmp[i] = window.createImageBitmap ? await createImageBitmap(im) : (await im.decode(), im); }
      catch (e) { bmp[i] = im; }
      res();
    };
    im.onerror = res; im.src = src(i);
  });
  // order: every 8th, then every 4th, then the rest, so a rough turn is available early
  const order = [];
  [8, 4, 2, 1].forEach(step => { for (let i = 0; i < FRAMES; i += step) if (!order.includes(i)) order.push(i); });
  const frameLoads = [];
  let chain = Promise.resolve();
  const PAR = 6;                                    // load a few in parallel
  for (let k = 0; k < order.length; k += PAR) {
    const batch = order.slice(k, k + PAR);
    chain = chain.then(() => Promise.all(batch.map(load)));
    batch.forEach(() => frameLoads.push(chain));
  }
  const firstLoads = frameLoads;                    // the loader waits for all of them

  const nearest = i => {
    for (let d = 0; d < FRAMES; d++) {
      const a = bmp[(i + d) % FRAMES]; if (a) return a;
      const b = bmp[(i - d + FRAMES) % FRAMES]; if (b) return b;
    }
    return null;
  };
  let cw = 0, ch = 0, drawn = -1;
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2, 1100 / Math.max(r.width, 1));   // frames are 900px, no point going bigger
    cw = canvas.width = Math.round(r.width * scale); ch = canvas.height = Math.round(r.height * scale);
    drawn = -1;
  };
  const turn = { target: 0, cur: 0 };               // in frames
  // a pool of light on the floor and a soft contact shadow, so the cat sits on the floor
  function groundCat() {
    const cx = cw / 2, y = ch * BASE;
    ctx.save();
    ctx.translate(cx, y); ctx.scale(1, 0.16);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, cw * 0.42);
    g.addColorStop(0, "rgba(140,165,255,0.16)"); g.addColorStop(0.5, "rgba(91,130,255,0.07)"); g.addColorStop(1, "rgba(91,130,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cw * 0.42, 0, Math.PI * 2); ctx.fill();
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, cw * 0.27);
    g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(0.6, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cw * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function renderCat() {
    turn.cur += (turn.target - turn.cur) * 0.18;
    if (Math.abs(turn.target - turn.cur) < 0.01) turn.cur = turn.target;
    const f = ((Math.round(turn.cur) % FRAMES) + FRAMES) % FRAMES;
    const im = bmp[f] || nearest(f);
    if (!im || !cw || (f === drawn && bmp[f])) return;
    drawn = bmp[f] ? f : -1;
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
    groundCat();
    ctx.drawImage(im, 0, 0, cw, ch);
    // short reflection under the feet only
    const y0 = ch * BASE;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y0, cw, ch * 0.09); ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.translate(0, y0 * 2); ctx.scale(1, -1);
    ctx.drawImage(im, 0, 0, cw, ch);
    ctx.restore();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createLinearGradient(0, y0, 0, y0 + ch * 0.09);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g; ctx.fillRect(0, y0, cw, ch * 0.09);
    ctx.globalCompositeOperation = "source-over";
  }
  fit();
  gsap.ticker.add(renderCat);
  if (/[?&]debug/.test(location.search)) window.__cat = () => ({ cur: turn.cur, drawn, loaded: bmp.filter(Boolean).length });
  let heroP = 0;

  if (hover) {
    const stageX = gsap.quickTo(".hero__stage", "x", { duration: 1.4, ease: "power3" });
    const lightX = gsap.quickTo(".hero__light--core", "x", { duration: 1.6, ease: "power3" });
    addEventListener("mousemove", e => {
      if (document.body.classList.contains("is-loading")) return;
      const nx = e.clientX / innerWidth - 0.5;
      stageX(nx * 14); lightX(nx * innerWidth * 0.06);
    });
  }

  /* ---------- loader ---------- */
  const statusList = () => (window.I18N[window.currentLang] || window.I18N.en).status;
  const countEl = $("#loaderCount"), barEl = $("#loaderBar"), statusEl = $("#loaderStatus");
  const shown = { v: 0 };
  let target = 0;
  const jobs = [...firstLoads, document.fonts ? document.fonts.ready : Promise.resolve()];
  let done = 0;
  jobs.forEach(p => p.then(() => { done++; target = Math.round((done / jobs.length) * 100); }));
  const minTime = reduce ? 300 : 1900, t0 = performance.now();
  const render = () => {
    const cap = Math.min(100, ((performance.now() - t0) / minTime) * 100);
    const goal = Math.min(target, cap);
    shown.v += (goal - shown.v) * 0.12;
    if (goal - shown.v < 0.4) shown.v = goal;
    const v = Math.round(shown.v);
    countEl.textContent = String(v).padStart(3, "0");
    barEl.style.transform = `scaleX(${v / 100})`;
    const st = statusList();
    statusEl.textContent = st[Math.min(st.length - 1, Math.floor((v / 100) * (st.length - 1)))];
    if (v >= 100) return finishLoader();
    requestAnimationFrame(render);
  };
  setTimeout(() => { target = 100; }, 8000);       // never hang on the loader
  requestAnimationFrame(render);

  function finishLoader() {
    gsap.timeline({
      onComplete: () => {
        $("#loader").remove();
        document.body.classList.remove("is-loading");
        fitTitle();
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    })
      .to(".loader__eyes i", { scaleY: 0.1, duration: 0.12, yoyo: true, repeat: 1 })
      .to([".loader__core", ".loader__hud"], { opacity: 0, y: -10, duration: 0.35, stagger: 0.02 }, "+=0.1")
      .to(".loader__panel--top", { yPercent: -101, duration: 1, ease: "expo.inOut" }, "<0.1")
      .to(".loader__panel--bottom", { yPercent: 101, duration: 1, ease: "expo.inOut" }, "<")
      .add(heroIntro(), "<0.35");
  }

  /* ---------- hero entrance ---------- */
  function heroIntro() {
    return gsap.timeline()
      // the light flickers on, like a studio spot
      .fromTo(".hero__light", { opacity: 0 }, { opacity: 1, duration: 0.05, repeat: 3, yoyo: true, ease: "none" }, 0)
      .to(".hero__light", { opacity: 1, duration: 0.6 }, 0.25)
      .from("#cat", { opacity: 0, scale: 1.04, filter: "brightness(0)", duration: 1.8, ease: "power2.out" }, 0.15)
      .from(".hero__row .hero__mask:first-child .hero__word", { yPercent: 105, duration: 1.3, ease: "expo.out" }, 0.5)
      .from(".hero__row .hero__mask:last-child .hero__word", { yPercent: 105, duration: 1.3, ease: "expo.out" }, 0.6)
      .from(".hero__role", { yPercent: 110, duration: 1, ease: "expo.out" }, 0.8)
      .from(".hero__list li", { x: -14, opacity: 0, duration: 0.7, stagger: 0.07, ease: "expo.out" }, 0.9)
      .from(".corner", { opacity: 0, scale: 0.4, duration: 0.8, stagger: 0.1, ease: "expo.out" }, 0.9)
      .from(".cta", { y: 40, opacity: 0, duration: 1, ease: "expo.out" }, 1)
      .from(".header__right > *", { y: -24, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.4)
      .from(".hero__scroll", { opacity: 0, duration: 0.8 }, 1.1);
  }

  /* ---------- hero scroll scene ---------- */
  const huds = $$(".hud");
  const hudAt = [0.14, 0.4, 0.64];
  const setHud = (i, on) => {
    const h = huds[i];
    if (h.classList.contains("is-in") === on) return;
    h.classList.toggle("is-in", on);
    gsap.to(h, { opacity: on ? 1 : 0, x: on ? 0 : (h.classList.contains("hud--2") ? -20 : 20), duration: 0.5, ease: "power3.out", overwrite: true });
    if (on) scramble(h.querySelector("p"));
  };
  gsap.set(huds, { x: (i, el) => (el.classList.contains("hud--2") ? -20 : 20) });

  if (!reduce) {
    window.__heroScene = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#hero", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: self => {
          heroP = self.progress;
          turn.target = gsap.utils.clamp(0, 1, (heroP - 0.04) / 0.88) * FRAMES;
          huds.forEach((h, i) => setHud(i, isMobile()
            ? heroP >= hudAt[i] && heroP < (hudAt[i + 1] ?? 0.86)
            : heroP >= hudAt[i] && heroP < 0.86));
        }
      }
    })
      // desktop: the name parts drift apart; phone: they float up instead of leaving the screen
      .to(".hero__title", { opacity: 0.28, yPercent: -4, duration: 0.25, ease: "sine.inOut" }, 0)   // name steps back while the cat turns
      .to(".hero__list", { opacity: 0, x: -30, duration: 0.25 }, 0)
      .to(".hero__stage", { scale: 1.08, duration: 0.46, ease: "sine.inOut" }, 0)     // push in (grows up from the feet)
      .to(".hero__stage", { scale: 1, duration: 0.46, ease: "sine.inOut" }, 0.46)     // ease back out as the turn completes
      .to(".hero__light--core", { scaleX: 1.25, duration: 0.5 }, 0.1)
      .to(".hero__scroll", { opacity: 0, duration: 0.1 }, 0.02)
      .to(".hero__title", { opacity: 1, yPercent: 0, duration: 0.2, ease: "sine.inOut" }, 0.72)
      .to({}, { duration: 0.08 }, 0.92);                                               // hold still before the page moves on
  } else {
    huds.forEach(h => { h.classList.add("is-in"); gsap.set(h, { opacity: 1, x: 0 }); });
  }

  /* ---------- artboard scale + name fitting ----------
     The hero is laid out on a fixed artboard (1440×900, or 390×844 on portrait screens)
     and scaled as a whole, so window size and browser zoom never move things around. */
  const pin = $(".hero__pin"), board = $("#board"), title = $("#heroTitle"), row = $("#heroRow"), stage = $("#stage");
  function setScale() {
    const bw = isMobile() ? 390 : 1440, bh = isMobile() ? 844 : 900;
    const s = Math.min(pin.clientWidth / bw, pin.clientHeight / bh);
    board.style.setProperty("--s", s.toFixed(4));
    // wall/floor line sits behind the cat, a bit above its soles, so the cat sits *on* the floor
    const boardTop = (pin.clientHeight - bh * s) / 2;
    const horizon = stage.offsetTop + stage.offsetHeight * (BASE - 0.085);
    pin.style.setProperty("--horizon", Math.round(boardTop + horizon * s) + "px");
  }
  function fitTitle() {
    title.style.setProperty("--fs", "100px");
    const w = row.offsetWidth;                      // artboard pixels, unaffected by the scale
    if (!w) return;
    let fs;
    if (isMobile()) {
      fs = 100 * (348 / w);                         // longest word spans the phone width
      title.style.top = "";
    } else {
      const H = stage.offsetHeight, TOP_MIN = 92;
      const earTop = stage.offsetTop + 0.10 * H;    // frames: feet at 80%, cat 70% tall -> ears at 10%
      const lineBottom = earTop + 0.04 * H;          // only the ear tips reach into the letters
      fs = Math.min(100 * (1300 / w), (lineBottom - TOP_MIN) / 0.8);
      title.style.top = Math.round(lineBottom - 0.8 * fs) + "px";   // sit the letters right on the ears
    }
    title.style.setProperty("--fs", fs.toFixed(2) + "px");
  }
  setScale(); fitTitle();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitTitle);
  window.addEventListener("langchange", fitTitle);
  if (document.fonts) document.fonts.addEventListener("loadingdone", fitTitle);
  addEventListener("load", fitTitle);
  portraitMQ.addEventListener("change", () => { setScale(); fitTitle(); fit(); ScrollTrigger.refresh(); });

  /* ---------- resize / browser zoom: re-measure once things settle ---------- */
  // The page height depends on the viewport, so after a zoom the same scrollY means a
  // different spot. Remember where we were (as a fraction of the page) and go back there.
  let rz, keep = null, lastW = innerWidth, frac = 0;
  // remember the position continuously, so we know it from *before* the zoom
  const remember = () => { const max = document.documentElement.scrollHeight - innerHeight; if (max > 0) frac = scrollY / max; };
  addEventListener("scroll", remember, { passive: true });
  addEventListener("resize", () => {
    // phones fire resize when the address bar hides; width stays the same, so ignore it
    if (innerWidth === lastW) { setScale(); fit(); return; }
    lastW = innerWidth;
    if (keep === null) keep = frac;
    setScale(); fit(); fitTitle();
    gsap.set(pill, { x: pillX(window.currentLang) });
    clearTimeout(rz);
    rz = setTimeout(() => {
      ScrollTrigger.refresh();
      const y = keep * (document.documentElement.scrollHeight - innerHeight);
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y);
      keep = null;
      ScrollTrigger.update();
    }, 160);
  });
})();
