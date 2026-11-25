/* Cases outside iGaming
   - a list of cases; on desktop a preview card follows the cursor over it
   - choosing a case opens it over the page; its numbers roll in like slot reels
   Plain JS + CSS transitions. Text comes from window.CASES in the current language. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const list = $("#clist"), card = $("#ccard"), view = $("#cview");
  if (!list || !window.CASES) return;
  const CASES = window.CASES;
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => (window.currentLang === "uk" ? "uk" : "en");
  const pad = n => String(n).padStart(2, "0");

  /* ---------- the same wordmark style for every brand ---------- */
  const wordmark = c => `<div class="wm" style="--c:${c.color}"><span class="wm__name">${c.name}</span></div>`;
  const media = (c, i = 0, chip = true) => c.img && c.img[i]
    ? `<img src="${c.img[i]}" alt="" loading="lazy" decoding="async">${chip ? `<span class="chip">${c.name}</span>` : ""}`
    : wordmark(c);

  /* ---------- slot reels: every digit spins and lands, the rest stays still ---------- */
  const TURNS = 2;
  const reels = str => [...str].map(ch => /\d/.test(ch)
    ? `<span class="reel" data-d="${ch}"><span class="reel__strip">${Array.from({ length: (TURNS + 1) * 10 }, (_, i) => `<span>${i % 10}</span>`).join("")}</span></span>`
    : /[+%×]/.test(ch) ? `<em>${ch}</em>` : `<span class="reel__static">${ch}</span>`).join("");
  function spin(root, baseDelay = 0) {
    root.querySelectorAll(".reel").forEach((r, i) => {
      const strip = r.firstElementChild, d = +r.dataset.d;
      const step = strip.firstElementChild.getBoundingClientRect().height;
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      void strip.offsetHeight;
      const y = -(TURNS * 10 + d) * step;
      if (reduce) { strip.style.transform = `translateY(${y}px)`; return; }
      strip.style.transition = `transform ${1.1 + (i % 6) * 0.12}s cubic-bezier(.2,.9,.25,1.12) ${baseDelay + i * 0.07}s`;
      strip.style.transform = `translateY(${y}px)`;
    });
  }

  /* ---------- list ---------- */
  function renderList() {
    const L = lang();
    list.innerHTML = CASES.map((c, i) => `
      <li class="crow" style="--i:${i}">
        <button class="crow__btn" type="button" data-i="${i}" aria-label="${c.name}: ${window.I18N?.[L]?.["cases.open"] || "Open case"}">
          <span class="crow__i mono">${pad(i + 1)}</span>
          <span class="crow__name">${c.name}</span>
          <span class="crow__meta mono">${c[L].meta}</span>
          <span class="crow__key"><b>${c[L].key[0].replace(/([+%×])/g, "<em>$1</em>")}</b><small class="mono">${c[L].key[1]}</small></span>
          <span class="crow__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span>
        </button>
      </li>`).join("");
    card.innerHTML = CASES.map((c, i) => `<div class="ccard__item" data-i="${i}">${media(c)}</div>`).join("");
    const also = (window.CASES_ALSO || []).map(n => `<span>${n}</span><i aria-hidden="true"></i>`).join("");
    $("#alsoTrack").innerHTML = also + also;          // twice, so the loop is seamless
  }
  renderList();
  window.addEventListener("langchange", () => { renderList(); if (open >= 0) fill(open, false); });

  /* rows rise in when the list scrolls into view */
  const section = $("#cases");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { section.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(section);
  } else section.classList.add("is-in");

  /* ---------- preview card follows the cursor (desktop only) ---------- */
  if (hover) {
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, active = -1, raf = 0, shown = false;
    const W = () => card.offsetWidth, H = () => card.offsetHeight;
    const loop = () => {
      const px = x;
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      vx += ((x - px) - vx) * 0.2;
      const rot = Math.max(-8, Math.min(8, vx * 0.5));
      card.style.transform = `translate3d(${(x - W() / 2).toFixed(1)}px,${(y - H() / 2).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
      raf = (shown || Math.abs(tx - x) > 0.5) ? requestAnimationFrame(loop) : 0;
    };
    const setActive = i => {
      if (i === active) return;
      active = i;
      card.querySelectorAll(".ccard__item").forEach(el => el.classList.toggle("is-on", +el.dataset.i === i));
      list.querySelectorAll(".crow").forEach((el, k) => el.classList.toggle("is-hot", k === i));
    };
    list.addEventListener("pointermove", e => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { x = tx; y = ty; shown = true; card.classList.add("is-on"); list.classList.add("is-hovering"); }
      const btn = e.target.closest(".crow__btn");
      if (btn) setActive(+btn.dataset.i);
      if (!raf) raf = requestAnimationFrame(loop);
    });
    list.addEventListener("pointerleave", () => {
      shown = false; card.classList.remove("is-on"); list.classList.remove("is-hovering"); setActive(-1);
    });
    // scrolling under a still cursor: keep the card on it
    addEventListener("scroll", () => { if (shown && !raf) raf = requestAnimationFrame(loop); }, { passive: true });
  }

  /* ---------- case view ---------- */
  let open = -1, lastFocus = null;
  const vMedia = $("#cviewMedia"), vMeta = $("#cviewMeta"), vName = $("#cviewName"), vLine = $("#cviewLine"),
        vStats = $("#cviewStats"), vBody = $("#cviewBody"), vCount = $("#cviewCount");
  function fill(i, animate = true) {
    const c = CASES[i], L = lang();
    view.style.setProperty("--c", c.color);
    vMedia.innerHTML = (c.img ? c.img.map((_, k) => `<figure class="cview__fig">${media(c, k, false)}</figure>`).join("") : `<figure class="cview__fig">${wordmark(c)}</figure>`);
    vMedia.dataset.n = c.img ? c.img.length : 1;
    vMeta.textContent = c[L].meta;
    vName.textContent = c.name;
    vLine.textContent = c[L].line;
    vBody.textContent = c[L].body;
    vStats.innerHTML = c[L].stats.map(s => `<li><div class="cnum">${reels(s[0])}</div><p class="mono">${s[1]}</p></li>`).join("");
    vCount.textContent = `${pad(i + 1)} / ${pad(CASES.length)}`;
    view.classList.remove("is-swap"); void view.offsetWidth; view.classList.add("is-swap");
    if (animate) requestAnimationFrame(() => spin(vStats, 0.35));
    else spin(vStats, 0);
  }
  function openCase(i) {
    lastFocus = document.activeElement;
    open = i; fill(i);
    view.setAttribute("aria-hidden", "false");
    view.classList.add("is-open");
    document.body.classList.add("cview-open");
    if (window.__lenis) window.__lenis.stop();
    setTimeout(() => $("#cviewClose").focus({ preventScroll: true }), 60);
  }
  function closeCase() {
    if (open < 0) return;
    open = -1;
    view.classList.remove("is-open");
    view.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cview-open");
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  const go = d => { if (open >= 0) { open = (open + d + CASES.length) % CASES.length; fill(open); } };
  list.addEventListener("click", e => { const b = e.target.closest(".crow__btn"); if (b) openCase(+b.dataset.i); });
  $("#cviewClose").addEventListener("click", closeCase);
  $("#cviewPrev").addEventListener("click", () => go(-1));
  $("#cviewNext").addEventListener("click", () => go(1));
  view.addEventListener("click", e => { if (e.target === view) closeCase(); });
  addEventListener("keydown", e => {
    if (open < 0) return;
    if (e.key === "Escape") closeCase();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
  // swipe left/right between cases on touch screens
  let sx = null;
  view.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  view.addEventListener("touchend", e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
