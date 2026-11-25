(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover)").matches;
  const isMobile = () => innerWidth <= 640;
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
  const stars = $("#heroStars");
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 65 + "%";
    s.style.setProperty("--d", 3 + Math.random() * 4 + "s");
    s.style.setProperty("--dl", -Math.random() * 6 + "s");
    s.style.setProperty("--o", (0.25 + Math.random() * 0.6).toFixed(2));
    stars.appendChild(s);
  }
  const svgNS = "http://www.w3.org/2000/svg";
  const ticks = $(".reticle__ticks");
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r1 = 190, r2 = i % 6 === 0 ? 176 : 184;
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", 200 + Math.cos(a) * r1); l.setAttribute("y1", 200 + Math.sin(a) * r1);
    l.setAttribute("x2", 200 + Math.cos(a) * r2); l.setAttribute("y2", 200 + Math.sin(a) * r2);
    ticks.appendChild(l);
  }
  // blue edge spots of the poker chip
  const seg = $(".chip__seg");
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - 0.2, a1 = a0 + 0.4, R = 92, r = 70;
    const p = (a, rad) => `${100 + Math.cos(a) * rad} ${100 + Math.sin(a) * rad}`;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 0 0 ${p(a0, r)}Z`);
    seg.appendChild(path);
  }

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
      .to(pill, { scaleX: 1.45, scaleY: 0.86, duration: 0.18, ease: "power2.in" })
      .to(pill, { x: pillX(lang), duration: 0.42, ease: "power3.inOut" }, 0.04)
      .to(pill, { scaleX: 1, scaleY: 1, duration: 0.55, ease: "elastic.out(1, .45)" }, 0.3);
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

  /* ---------- cat turntable ----------
     8 frames, 45° apart. Instead of hard cuts, neighbouring frames cross-fade
     around the midpoint and the body narrows slightly, like a real turn.
     Swap in more frames (e.g. from a 360° video) and N updates by itself. */
  const frames = $$("#catFrames img");
  const N = frames.length;
  const turn = { scroll: 0, glance: 0 };   // in frames
  let lastOn = [];
  const smooth = x => x * x * (3 - 2 * x);
  function renderCat() {
    let v = turn.scroll + turn.glance;
    v = ((v % N) + N) % N;
    const f = Math.floor(v), frac = v - f, nxt = (f + 1) % N;
    const w = smooth(gsap.utils.clamp(0, 1, (frac - 0.28) / 0.44));
    const squash = 1 - 0.06 * Math.sin(Math.PI * frac);
    lastOn.forEach(i => { if (i !== f && i !== nxt) { frames[i].style.opacity = 0; } });
    frames[f].style.opacity = 1 - w;
    frames[nxt].style.opacity = w;
    frames[f].style.transform = frames[nxt].style.transform = `scaleX(${squash})`;
    lastOn = [f, nxt];
  }
  frames.forEach((img, i) => { img.classList.remove("is-on"); img.style.opacity = i === 0 ? 1 : 0; });
  gsap.ticker.add(renderCat);

  let heroP = 0;
  if (hover) {
    const spot = $("#heroSpot"), lens = $("#lens");
    const sx = gsap.quickTo(spot, "x", { duration: 1.2, ease: "power3" });
    const catX = gsap.quickTo("#cat", "x", { duration: 1, ease: "power3" });
    let glanceTarget = 0;
    const lx = gsap.quickTo(lens, "x", { duration: 0.6, ease: "power3" });
    const ly = gsap.quickTo(lens, "y", { duration: 0.6, ease: "power3" });
    addEventListener("mousemove", e => {
      const nx = e.clientX / innerWidth - 0.5;
      sx(nx * innerWidth * 0.25);
      lx(e.clientX); ly(e.clientY);
      if (document.body.classList.contains("is-loading")) return;
      const overUI = e.clientY < 90 || e.target.closest(".glass, a, button");
      gsap.to(lens, { opacity: heroP < 0.55 && !overUI ? 1 : 0, duration: 0.4, overwrite: "auto" });
      if (heroP < 0.02) {
        catX(nx * 16);
        // snap to a whole frame so the cat never hangs between two angles
        const g = nx < -0.2 ? -1 : nx > 0.2 ? 1 : 0;
        if (g !== glanceTarget) { glanceTarget = g; gsap.to(turn, { glance: g, duration: 0.45, ease: "power2.inOut", overwrite: "auto" }); }
      }
    });
    document.documentElement.addEventListener("mouseleave", () => gsap.to(lens, { opacity: 0, duration: 0.3 }));
  }

  /* ---------- loader ---------- */
  const statusList = () => (window.I18N[window.currentLang] || window.I18N.en).status;
  const countEl = $("#loaderCount"), barEl = $("#loaderBar"), statusEl = $("#loaderStatus");
  const shown = { v: 0 };
  let target = 0;
  const jobs = [...frames.map(img => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())),
                document.fonts ? document.fonts.ready : Promise.resolve()];
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
  setTimeout(() => { target = 100; }, 6000);       // never hang on the loader
  requestAnimationFrame(render);

  function finishLoader() {
    gsap.timeline({
      onComplete: () => {
        $("#loader").remove();
        document.body.classList.remove("is-loading");
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
  const arc = $(".reticle__arc");
  const arcLen = arc.getTotalLength();
  gsap.set(arc, { strokeDasharray: arcLen, strokeDashoffset: arcLen });
  function heroIntro() {
    return gsap.timeline()
      .from("#cat", { y: 70, opacity: 0, duration: 1.3, ease: "expo.out" }, 0.1)
      .from(".cat__floor", { scaleX: 0, opacity: 0, duration: 1.1, ease: "expo.out" }, 0.2)
      .to(arc, { strokeDashoffset: 0, duration: 1.4, ease: "power3.inOut" }, 0.35)
      .from(".reticle__cross", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.8, ease: "expo.out" }, 0.6)
      .from(".hero__name--l .hero__word", { xPercent: 22, opacity: 0, filter: "blur(10px)", duration: 1.2, ease: "expo.out" }, 0.45)
      .from(".hero__name--r .hero__word", { xPercent: -22, opacity: 0, filter: "blur(10px)", duration: 1.2, ease: "expo.out" }, 0.5)
      .from(".hero__role", { y: 14, opacity: 0, duration: 0.9, ease: "expo.out" }, 0.8)
      .from(".hero__list li", { x: -14, opacity: 0, duration: 0.7, stagger: 0.07, ease: "expo.out" }, 0.85)
      .from(".chip", { y: -60, rotateZ: -40, opacity: 0, duration: 1.1, ease: "bounce.out" }, 0.9)
      .from(".crowd", { opacity: 0, duration: 1.6, ease: "power2.out" }, 0.3)
      .from(".corner", { opacity: 0, scale: 0.4, duration: 0.8, stagger: 0.1, ease: "expo.out" }, 0.7)
      .from(".hero__beam", { opacity: 0, duration: 1.4, ease: "power2.out" }, 0)
      .from(".header__right > *, .header__center", { y: -24, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.3)
      .from(".hero__meta", { opacity: 0, y: 10, duration: 0.8 }, 0.9);
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
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#hero", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: self => {
          heroP = self.progress;
          // one full turn between 6% and 88% of the scene, ending face-forward
          const t = gsap.utils.clamp(0, 1, (heroP - 0.06) / 0.82);
          turn.scroll = t * N;
          if (heroP > 0.02 && turn.glance !== 0) gsap.to(turn, { glance: 0, duration: 0.4, overwrite: "auto" });
          $("#angle").textContent = String(Math.round(t * 360) % 360).padStart(3, "0") + "°";
          huds.forEach((h, i) => setHud(i, isMobile()
            ? heroP >= hudAt[i] && heroP < (hudAt[i + 1] ?? 0.9)
            : heroP >= hudAt[i]));
          if (heroP > 0.02) gsap.to("#cat", { x: 0, duration: 0.6, overwrite: "auto" });
        }
      }
    })
      // desktop: the name parts drift apart; phone: they float up instead of leaving the screen
      .to(".hero__name--l", { xPercent: () => (isMobile() ? 0 : -30), yPercent: () => (isMobile() ? -25 : 0), opacity: 0.12, duration: 0.6 }, 0)
      .to(".hero__name--r", { xPercent: () => (isMobile() ? 0 : 30), yPercent: () => (isMobile() ? -25 : 0), opacity: 0.12, duration: 0.6 }, 0)
      .to(".hero__list", { opacity: 0, x: -30, duration: 0.25 }, 0)
      .to(".crowd--l", { xPercent: -18, duration: 1 }, 0)
      .to(".crowd--r", { xPercent: 18, duration: 1 }, 0)
      .to(".chip", { opacity: 0, y: 20, duration: 0.15 }, 0.04)
      .to(".reticle svg", { rotate: 90, duration: 0.9 }, 0.05)
      .to([".reticle__ticks", ".reticle__ring--dash", ".reticle__label"], { opacity: 1, duration: 0.12 }, 0.08)
      .to("#cat", { scale: 0.94, duration: 1 }, 0)
      .to(".hero__scroll", { opacity: 0, duration: 0.1 }, 0.02)
      .to([".reticle__ticks", ".reticle__ring--dash", ".reticle__label"], { opacity: 0, duration: 0.1 }, 0.9)
      .to(".chip", { opacity: 1, y: 0, duration: 0.1 }, 0.9)
      .to(".hero__name--l, .hero__name--r", { xPercent: 0, yPercent: 0, opacity: 1, duration: 0.1 }, 0.9);
  } else {
    huds.forEach(h => { h.classList.add("is-in"); gsap.set(h, { opacity: 1, x: 0 }); });
  }

  addEventListener("resize", () => { ScrollTrigger.refresh(); gsap.set(pill, { x: pillX(window.currentLang) }); });
})();
