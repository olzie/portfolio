(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => innerWidth <= 640;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- live clock (Kyiv time) ---------- */
  const clocks = $$(".js-clock");
  const tick = () => {
    const t = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Kyiv", hour12: false });
    clocks.forEach(c => (c.textContent = t));
  };
  tick(); setInterval(tick, 1000);

  /* ---------- decorative bits ---------- */
  const stars = $("#heroStars");
  for (let i = 0; i < 46; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 70 + "%";
    s.style.setProperty("--d", 3 + Math.random() * 4 + "s");
    s.style.setProperty("--dl", -Math.random() * 6 + "s");
    s.style.setProperty("--o", (0.3 + Math.random() * 0.7).toFixed(2));
    stars.appendChild(s);
  }
  const ticks = $(".reticle__ticks");
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r1 = 190, r2 = i % 6 === 0 ? 176 : 184;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 200 + Math.cos(a) * r1); l.setAttribute("y1", 200 + Math.sin(a) * r1);
    l.setAttribute("x2", 200 + Math.cos(a) * r2); l.setAttribute("y2", 200 + Math.sin(a) * r2);
    ticks.appendChild(l);
  }

  /* ---------- text scramble (HUD labels) ---------- */
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEFXZ";
  function scramble(el) {
    const html = el.dataset.final || el.innerHTML;
    el.dataset.final = html;
    const parts = html.split(/(<br>)/);
    const plain = parts.map(p => (p === "<br>" ? p : p.replace(/&amp;/g, "&")));
    const total = plain.reduce((n, p) => n + (p === "<br>" ? 0 : p.length), 0);
    let frame = 0; const dur = Math.min(40, 14 + total * 0.35);
    cancelAnimationFrame(el._raf);
    const step = () => {
      const revealed = Math.floor((frame / dur) * total);
      let k = 0;
      el.innerHTML = plain.map(p => {
        if (p === "<br>") return p;
        let out = "";
        for (const ch of p) {
          out += k < revealed || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          k++;
        }
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
  $$("#menu a").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id && id.startsWith("#")) {
      e.preventDefault(); setMenu(false);
      const target = id === "#top" ? 0 : $(id);
      lenis ? lenis.scrollTo(target, { offset: 0 }) : (target === 0 ? scrollTo(0, 0) : target.scrollIntoView());
    }
  }));
  addEventListener("keydown", e => e.key === "Escape" && setMenu(false));
  $$("a[href^='#']").forEach(a => {
    if (a.closest("#menu")) return;
    a.addEventListener("click", e => {
      const t = a.getAttribute("href"); const el = t === "#top" ? 0 : $(t);
      if (el === null) return;
      e.preventDefault(); lenis ? lenis.scrollTo(el) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView());
    });
  });

  /* ---------- language switch ---------- */
  $$(".lang__btn").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.lang === window.currentLang) return;
    window.setLang(b.dataset.lang);
    $$(".hud p").forEach(p => { delete p.dataset.final; if (p.closest(".hud").classList.contains("is-in")) scramble(p); });
  }));

  /* ---------- magnetic buttons ---------- */
  if (matchMedia("(hover: hover)").matches) {
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

  /* ---------- cat frames ---------- */
  const frames = $$("#catFrames img");
  let cur = 0;
  const showFrame = i => {
    i = ((i % 8) + 8) % 8;
    if (i === cur) return;
    frames[cur].classList.remove("is-on");
    frames[i].classList.add("is-on");
    cur = i;
  };
  let heroP = 0;

  // before scrolling, the cat glances toward the cursor
  if (matchMedia("(hover: hover)").matches) {
    const spot = $("#heroSpot");
    const sx = gsap.quickTo(spot, "x", { duration: 1.2, ease: "power3" });
    const catX = gsap.quickTo("#cat", "x", { duration: 1, ease: "power3" });
    addEventListener("mousemove", e => {
      const nx = e.clientX / innerWidth - 0.5;
      sx(nx * innerWidth * 0.25);
      if (heroP < 0.02 && !document.body.classList.contains("is-loading")) {
        catX(nx * 18);
        showFrame(nx < -0.2 ? 7 : nx > 0.2 ? 1 : 0);
      }
    });
  }

  /* ---------- loader ---------- */
  const statusList = () => (window.I18N[window.currentLang] || window.I18N.en).status;
  const countEl = $("#loaderCount"), barEl = $("#loaderBar"), statusEl = $("#loaderStatus");
  const shown = { v: 0 };
  let target = 0;
  const assets = frames.map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve());
  const jobs = [...assets, document.fonts ? document.fonts.ready : Promise.resolve()];
  let done = 0;
  jobs.forEach(p => p.then(() => { done++; target = Math.round((done / jobs.length) * 100); }));

  const minTime = reduce ? 300 : 1900;
  const t0 = performance.now();
  const render = () => {
    const elapsed = performance.now() - t0;
    const cap = Math.min(100, (elapsed / minTime) * 100);       // never faster than minTime
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
  // safety: never hang on the loader longer than 6s
  setTimeout(() => { target = 100; }, 6000);
  requestAnimationFrame(render);

  function finishLoader() {
    const tl = gsap.timeline({
      onComplete: () => {
        $("#loader").remove();
        document.body.classList.remove("is-loading");
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    });
    tl.to(".loader__eyes i", { scaleY: 0.1, duration: 0.12, yoyo: true, repeat: 1 })
      .to([".loader__core", ".loader__hud"], { opacity: 0, y: -10, duration: 0.35, stagger: 0.02 }, "+=0.1")
      .to(".loader__panel--top", { yPercent: -101, duration: 1, ease: "expo.inOut" }, "<0.1")
      .to(".loader__panel--bottom", { yPercent: 101, duration: 1, ease: "expo.inOut" }, "<")
      .add(heroIntro(), "<0.35");
  }

  /* ---------- hero entrance ---------- */
  function heroIntro() {
    const tl = gsap.timeline();
    tl.from(".hero__char", { yPercent: 110, opacity: 0, duration: 1.2, stagger: 0.07, ease: "expo.out" })
      .from(".hero__beam", { opacity: 0, scaleY: 0.2, transformOrigin: "top center", duration: 1.4, stagger: 0.1, ease: "power2.out" }, 0)
      .from("#cat", { y: 80, opacity: 0, duration: 1.3, ease: "expo.out" }, 0.25)
      .from(".cat__floor", { scaleX: 0, opacity: 0, duration: 1.1, ease: "expo.out" }, 0.35)
      .from(".header > *", { y: -24, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.3)
      .from(".hero__meta", { opacity: 0, y: 10, duration: 0.8, stagger: 0.1 }, 0.6);
    return tl;
  }

  /* ---------- hero scroll scene ---------- */
  const huds = $$(".hud");
  const hudAt = [0.12, 0.38, 0.62];                 // when each label appears (desktop: they stay)
  const setHud = (i, on) => {
    const h = huds[i];
    if (h.classList.contains("is-in") === on) return;
    h.classList.toggle("is-in", on);
    gsap.to(h, { opacity: on ? 1 : 0, x: on ? 0 : (h.classList.contains("hud--2") ? -20 : 20), duration: 0.5, ease: "power3.out", overwrite: true });
    if (on) scramble(h.querySelector("p"));
  };
  gsap.set(huds, { x: (i, el) => (el.classList.contains("hud--2") ? -20 : 20) });

  if (!reduce) {
    const chars = $$(".hero__char");
    const scene = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#hero", start: "top top", end: "bottom bottom", scrub: 0.6,
        onUpdate: self => {
          heroP = self.progress;
          // full 360° turn between 6% and 88% of the scene, ending face-forward
          const t = gsap.utils.clamp(0, 1, (heroP - 0.06) / 0.82);
          showFrame(Math.round(t * 8));
          $("#angle").textContent = String(Math.round(t * 360) % 360).padStart(3, "0") + "°";
          huds.forEach((h, i) => {
            const on = isMobile()
              ? heroP >= hudAt[i] && heroP < (hudAt[i + 1] ?? 0.9)   // mobile: one label at a time
              : heroP >= hudAt[i];
            setHud(i, on);
          });
          if (heroP < 0.02) gsap.to("#cat", { x: 0, duration: 0.6, overwrite: "auto" });
        }
      }
    });
    scene
      .to(chars, { yPercent: i => -18 - i * 9, opacity: 0.22, stagger: 0.02, duration: 1 }, 0)
      .to(".reticle", { opacity: 1, scale: 1, duration: 0.2 }, 0.1)
      .to(".reticle svg", { rotate: 120, duration: 0.9 }, 0.1)
      .to("#cat", { scale: 0.92, yPercent: -2, duration: 1 }, 0)
      .to(".hero__beam", { opacity: 1, duration: 0.5 }, 0.2)
      .to(".hero__scroll", { opacity: 0, duration: 0.1 }, 0.02)
      .to(".reticle", { opacity: 0, scale: 1.1, duration: 0.12 }, 0.88);
  } else {
    huds.forEach((h, i) => { h.classList.add("is-in"); gsap.set(h, { opacity: 1, x: 0 }); });
  }

  addEventListener("resize", () => ScrollTrigger.refresh());
})();
