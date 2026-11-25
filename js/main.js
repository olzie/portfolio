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
  const svgNS = "http://www.w3.org/2000/svg";
  const ticks = $(".reticle__ticks");
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r1 = 190, r2 = i % 6 === 0 ? 176 : 184;
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", 200 + Math.cos(a) * r1); l.setAttribute("y1", 200 + Math.sin(a) * r1);
    l.setAttribute("x2", 200 + Math.cos(a) * r2); l.setAttribute("y2", 200 + Math.sin(a) * r2);
    ticks.appendChild(l);
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

  /* ---------- cat video ----------
     A muted 10-second 360° turn that loops. The reticle angle follows the video. */
  const video = $("#cat");
  video.muted = true;
  const angleEl = $("#angle");
  let heroP = 0;
  gsap.ticker.add(() => {
    if (!video.duration) return;
    angleEl.textContent = String(Math.round((video.currentTime / video.duration) * 360) % 360).padStart(3, "0") + "°";
  });
  // pause when the hero is off screen, resume when it comes back
  new IntersectionObserver(([e]) => {
    if (reduce) return;
    e.isIntersecting ? video.play().catch(() => {}) : video.pause();
  }, { threshold: 0.05 }).observe($("#hero"));
  if (reduce) { video.removeAttribute("autoplay"); video.pause(); }

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
  const videoReady = new Promise(res => {
    if (video.readyState >= 3) return res();
    video.addEventListener("canplay", res, { once: true });
    video.addEventListener("error", res, { once: true });
  });
  const posterReady = new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = video.poster; });
  const jobs = [videoReady, posterReady, document.fonts ? document.fonts.ready : Promise.resolve()];
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
      // the light flickers on, like a studio spot
      .fromTo(".hero__light", { opacity: 0 }, { opacity: 1, duration: 0.05, repeat: 3, yoyo: true, ease: "none" }, 0)
      .to(".hero__light", { opacity: 1, duration: 0.6 }, 0.25)
      .from("#cat", { opacity: 0, scale: 1.04, filter: "brightness(0)", duration: 1.8, ease: "power2.out" }, 0.15)
      .from(".crowd", { opacity: 0, duration: 2.2, ease: "power2.out" }, 0.4)
      .to(arc, { strokeDashoffset: 0, duration: 1.4, ease: "power3.inOut" }, 0.5)
      .from(".reticle__cross", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.8, ease: "expo.out" }, 0.8)
      .from(".hero__name--l .hero__word", { yPercent: 105, duration: 1.2, ease: "expo.out" }, 0.55)
      .from(".hero__name--r .hero__word", { yPercent: 105, duration: 1.2, ease: "expo.out" }, 0.62)
      .from(".hero__role", { yPercent: 110, duration: 1, ease: "expo.out" }, 0.8)
      .from(".hero__list li", { x: -14, opacity: 0, duration: 0.7, stagger: 0.07, ease: "expo.out" }, 0.9)
      .from(".corner", { opacity: 0, scale: 0.4, duration: 0.8, stagger: 0.1, ease: "expo.out" }, 0.9)
      .from(".cta", { y: 40, opacity: 0, duration: 1, ease: "expo.out" }, 1)
      .from(".header__right > *, .header__center", { y: -24, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.4)
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
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#hero", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: self => {
          heroP = self.progress;
          huds.forEach((h, i) => setHud(i, isMobile()
            ? heroP >= hudAt[i] && heroP < (hudAt[i + 1] ?? 0.9)
            : heroP >= hudAt[i]));
        }
      }
    })
      // desktop: the name parts drift apart; phone: they float up instead of leaving the screen
      .to(".hero__name--l", { xPercent: () => (isMobile() ? 0 : -30), yPercent: () => (isMobile() ? -25 : 0), opacity: 0.12, duration: 0.6 }, 0)
      .to(".hero__name--r", { xPercent: () => (isMobile() ? 0 : 30), yPercent: () => (isMobile() ? -25 : 0), opacity: 0.12, duration: 0.6 }, 0)
      .to(".hero__list", { opacity: 0, x: -30, duration: 0.25 }, 0)
      .to(".crowd--l", { xPercent: -18, duration: 1 }, 0)
      .to(".crowd--r", { xPercent: 18, duration: 1 }, 0)
      .to(".reticle svg", { rotate: 90, duration: 0.9 }, 0.05)
      .to([".reticle__ticks", ".reticle__ring--dash", ".reticle__label"], { opacity: 1, duration: 0.12 }, 0.08)
      .to(".hero__stage", { scale: 1.12, yPercent: 3, duration: 1 }, 0)        // slow camera push-in
      .to(".hero__light--core", { scaleX: 1.25, duration: 0.5 }, 0.1)
      .to([".hero__scroll", ".cta"], { opacity: 0, duration: 0.1 }, 0.02)
      .to(".cta", { opacity: 1, duration: 0.1 }, 0.9)
      .to([".reticle__ticks", ".reticle__ring--dash", ".reticle__label"], { opacity: 0, duration: 0.1 }, 0.9)
      .to(".hero__name--l, .hero__name--r", { xPercent: 0, yPercent: 0, opacity: 1, duration: 0.1 }, 0.9);
  } else {
    huds.forEach(h => { h.classList.add("is-in"); gsap.set(h, { opacity: 1, x: 0 }); });
  }

  addEventListener("resize", () => { ScrollTrigger.refresh(); gsap.set(pill, { x: pillX(window.currentLang) }); });
})();
