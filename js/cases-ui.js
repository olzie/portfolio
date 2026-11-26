/* Cases outside iGaming
   - every main case is a row; on desktop a card with the brand's logo follows the cursor
   - below, a running line: tenders first (all open one window), then small cases (each opens its own)
   - a case opens over the page; its numbers roll in like slot reels
   Plain JS + CSS transitions. Text comes from cases.js in the current language. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const list = $("#clist"), card = $("#ccard"), view = $("#cview"), track = $("#alsoTrack");
  if (!list || !window.CASES) return;
  const ALL = window.CASES, T = window.CASES_TENDERS;
  // top 3 by numbers first, then everything else from newest to oldest
  const idx = ALL.map((c, i) => i).filter(i => !ALL[i].small);
  const TOP = idx.filter(i => ALL[i].top).sort((a, b) => ALL[a].top - ALL[b].top);
  const REST = idx.filter(i => !ALL[i].top).sort((a, b) => ALL[b].y - ALL[a].y);
  const MAIN = [...TOP, ...REST];
  const yearOf = d => (d.meta.match(/\d{4}(–\d{2})?/) || [""])[0];
  const SMALL = (window.CASES_SMALL_ORDER || []).map(id => ALL.findIndex(c => c.id === id)).filter(i => i >= 0);
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => (window.currentLang === "uk" ? "uk" : "en");
  const t = k => window.I18N?.[lang()]?.[k] || "";
  const pad = n => String(n).padStart(2, "0");

  /* the brand's own logo in white on its colour; the name in type when there is no logo */
  const logo = (c, cls = "") => c.logo
    ? `<img class="lg ${cls}" src="${c.logo}" alt="${c.name}" decoding="async">`
    : `<span class="lg lg--type ${cls}">${c.name}</span>`;
  const tile = c => `<div class="brand" style="--c:${c.color}">${logo(c)}</div>`;

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

  /* ---------- list + running line ---------- */
  function render() {
    const L = lang();
    const row = (ci, n, top) => {
      const c = ALL[ci], d = c[L];
      const key = d.key
        ? `<b>${d.key[0].replace(/([+%×])/g, "<em>$1</em>")}</b><small class="mono">${d.key[1]}</small>`
        : `<small class="mono crow__did">${d.did.slice(0, 2).join(" · ")}</small>`;
      const meta = top ? d.meta : d.meta.replace(/( · \d{4}(–\d{2})?)/, `<span class="crow__yr">$1</span>`);   // the year has its own column on desktop
      return `
      <li class="crow${top ? " crow--top" : ""}" style="--i:${n}">
        <button class="crow__btn" type="button" data-i="${ci}" aria-label="${c.name}: ${t("cases.open") || "Open case"}">
          <span class="crow__i mono">${top ? pad(n + 1) : yearOf(d)}</span>
          <span class="crow__logo" style="--c:${c.color}" aria-hidden="true">${logo(c)}</span>
          <span class="crow__name">${c.name}</span>
          <span class="crow__meta mono">${meta}</span>
          <span class="crow__key">${key}</span>
          <span class="crow__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span>
        </button>
      </li>`;
    };
    list.innerHTML =
      `<li class="clabel mono" aria-hidden="true">${t("cases.top")}</li>` +
      TOP.map((ci, n) => row(ci, n, true)).join("") +
      `<li class="clabel clabel--rest mono" aria-hidden="true">${t("cases.rest")}</li>` +
      REST.map((ci, n) => row(ci, n + TOP.length, false)).join("") +
      `<li class="yrail" aria-hidden="true"><div class="yrail__y">${[0, 1, 2, 3].map(() => `<span class="yreel"><span>${[...Array(10).keys()].map(d => `<i>${d}</i>`).join("")}</span></span>`).join("")}</div></li>`;
    setupYear();
    card.innerHTML = MAIN.map(ci => `<div class="ccard__item" data-i="${ci}">${tile(ALL[ci])}</div>`).join("");

    // running line: tenders (one window), then small cases (their own windows)
    const byId = Object.fromEntries(T.items.map(x => [x.id, x]));
    const items = [
      ...T.line_ids.map(id => ({ kind: "t", id, name: byId[id].name, logo: byId[id].logo })),
      ...SMALL.map(i => ({ kind: "c", id: i, name: ALL[i].name, logo: ALL[i].logo }))
    ];
    const one = (x, hidden) => `<button class="also__item${x.kind === "t" ? " is-tender" : ""}" type="button" data-k="${x.kind}" data-id="${x.id}"${hidden ? ' tabindex="-1" aria-hidden="true"' : ""} aria-label="${x.name}">${
      x.logo ? `<img src="${x.logo}" alt="" loading="lazy" decoding="async">` : `<span>${x.name}</span>`}</button>`;
    const sep = `<i aria-hidden="true"></i>`;
    track.innerHTML = items.map(x => one(x) + sep).join("") + items.map(x => one(x, true) + sep).join("");   // twice, so the loop is seamless
    // round logos get taller, long wordmarks shorter, so they all read the same size
    track.querySelectorAll("img").forEach(im => {
      const fit = () => { const ar = im.naturalWidth / im.naturalHeight || 3; im.style.height = `calc(var(--lh) * ${Math.min(1.55, Math.max(0.72, Math.sqrt(2.6 / ar))).toFixed(2)})`; };
      im.complete && im.naturalWidth ? fit() : im.addEventListener("load", fit, { once: true });
    });
  }
  /* the year next to "everything else" sticks while you scroll and rolls to the year of the row in the middle of the screen */
  let yio = null;
  function setupYear() {
    const rail = list.querySelector(".yrail"), lbl = list.querySelector(".clabel--rest");
    if (!rail || !lbl) return;
    const place = () => { rail.style.top = lbl.offsetTop + lbl.offsetHeight + "px"; };
    place(); addEventListener("resize", place);
    const strips = [...rail.querySelectorAll(".yreel > span")];
    let shownY = "";
    const setY = y => {
      if (y === shownY) return; shownY = y;
      [...y].forEach((d, k) => { strips[k].style.transform = `translateY(${-d}em)`; strips[k].style.transitionDelay = `${k * 50}ms`; });
    };
    setY(String(Math.floor(ALL[REST[0]].y)));
    if (yio) yio.disconnect();
    yio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setY(e.target.dataset.y); }), { rootMargin: "-46% 0px -52% 0px" });
    list.querySelectorAll(".crow:not(.crow--top)").forEach(li => {
      li.dataset.y = String(Math.floor(ALL[+li.querySelector(".crow__btn").dataset.i].y));
      yio.observe(li);
    });
  }
  render();
  window.addEventListener("langchange", () => { render(); if (cur) show(cur, false); });

  /* rows rise in when the list scrolls into view */
  const section = $("#cases");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { section.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(section);
  } else section.classList.add("is-in");

  /* ---------- logo card follows the cursor (desktop only) ---------- */
  if (hover) {
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, active = -1, raf = 0, shown = false;
    const loop = () => {
      const px = x;
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      vx += ((x - px) - vx) * 0.2;
      const rot = Math.max(-8, Math.min(8, vx * 0.5));
      card.style.transform = `translate3d(${(x - card.offsetWidth / 2).toFixed(1)}px,${(y - card.offsetHeight / 2).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
      raf = (shown || Math.abs(tx - x) > 0.5) ? requestAnimationFrame(loop) : 0;
    };
    const setActive = i => {
      if (i === active) return;
      active = i;
      card.querySelectorAll(".ccard__item").forEach(el => el.classList.toggle("is-on", +el.dataset.i === i));
      list.querySelectorAll(".crow__btn").forEach(el => el.parentNode.classList.toggle("is-hot", +el.dataset.i === i));
    };
    list.addEventListener("pointermove", e => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { x = tx; y = ty; shown = true; card.classList.add("is-on"); list.classList.add("is-hovering"); }
      const btn = e.target.closest(".crow__btn");
      if (btn) setActive(+btn.dataset.i);
      if (!raf) raf = requestAnimationFrame(loop);
    });
    const hide = () => { shown = false; card.classList.remove("is-on"); list.classList.remove("is-hovering"); setActive(-1); };
    list.addEventListener("pointerleave", hide);
    // scrolling moves the list under a still cursor and no pointer event fires: check what is under the cursor now
    let chk = 0;
    addEventListener("scroll", () => {
      if (!shown || chk) return;
      chk = requestAnimationFrame(() => {
        chk = 0;
        const el = document.elementFromPoint(tx, ty), btn = el && el.closest(".crow__btn");
        if (!btn || !list.contains(btn)) hide();
        else { setActive(+btn.dataset.i); if (!raf) raf = requestAnimationFrame(loop); }
      });
    }, { passive: true });
  }

  /* ---------- case view ---------- */
  // cur = { kind: "c", i, group: [indices] } for a case, { kind: "t" } for the tenders window
  let cur = null, lastFocus = null;
  const vMedia = $("#cviewMedia"), vMeta = $("#cviewMeta"), vName = $("#cviewName"), vLine = $("#cviewLine"),
        vStats = $("#cviewStats"), vBody = $("#cviewBody"), vDid = $("#cviewDid"), vCount = $("#cviewCount"), vNav = $("#cviewNav");
  /* work examples play like Instagram stories: logo first, then each screenshot.
     Tap the right half for the next one, the left half for the previous; hovering pauses. */
  let stT = 0, stI = 0, stN = 0, stPaused = false, stLeft = 0, stStart = 0;
  const LOGO_MS = 1600, SHOT_MS = 4200;
  function story(c, shots) {
    clearTimeout(stT);
    const slides = [`<div class="st__slide st__slide--logo">${tile(c)}</div>`].concat(shots.map((x, k) =>
      `<div class="st__slide" style="--bg:url('assets/cases/shots/${x[0]}')"><img src="assets/cases/shots/${x[0]}" width="${x[1]}" height="${x[2]}" alt="${c.name}, ${t("cases.example")} ${k + 1}" decoding="async"></div>`));
    vMedia.innerHTML = `<div class="st" style="--c:${c.color}">
      <div class="st__bars">${slides.map(() => "<i></i>").join("")}</div>
      <div class="st__head"><span class="st__ava">${logo(c)}</span><b>${c.name}</b></div>
      ${slides.join("")}
      <button class="st__tap st__tap--prev" type="button" aria-label="${t("cases.prev")}"></button>
      <button class="st__tap st__tap--next" type="button" aria-label="${t("cases.next")}"></button>
    </div>`;
    stN = slides.length; stPaused = false; stGo(0);
  }
  function stGo(i) {
    clearTimeout(stT);
    const st = vMedia.querySelector(".st"); if (!st) return;
    stI = (i + stN) % stN;
    st.querySelectorAll(".st__slide").forEach((e, k) => e.classList.toggle("on", k === stI));
    const d = stI === 0 ? LOGO_MS : SHOT_MS;
    st.querySelectorAll(".st__bars i").forEach((b, k) => {
      b.className = k < stI ? "done" : "";
      b.style.setProperty("--d", d + "ms");
    });
    const bar = st.querySelectorAll(".st__bars i")[stI]; void bar.offsetWidth; bar.className = "run";
    stLeft = d; stStart = performance.now();
    if (!stPaused) stT = setTimeout(() => stGo(stI + 1), d);
  }
  function stPause(on) {
    const st = vMedia.querySelector(".st"); if (!st || stPaused === on) return;
    stPaused = on; st.classList.toggle("is-paused", on);
    if (on) { clearTimeout(stT); stLeft -= performance.now() - stStart; }
    else { stStart = performance.now(); stT = setTimeout(() => stGo(stI + 1), Math.max(200, stLeft)); }
  }
  vMedia.addEventListener("click", e => {
    if (e.target.closest(".st__tap--next")) stGo(stI + 1);
    else if (e.target.closest(".st__tap--prev")) stGo(stI - 1);
  });
  if (hover) {
    vMedia.addEventListener("pointerenter", () => stPause(true));
    vMedia.addEventListener("pointerleave", () => stPause(false));
  }

  function show(s, animate = true) {
    clearTimeout(stT);
    const L = lang();
    view.classList.toggle("is-tenders", s.kind === "t");
    if (s.kind === "t") {
      view.style.setProperty("--c", T.color);
      vMedia.classList.remove("has-shots");
      vMedia.innerHTML = `<div class="cview__wall">${T.items.map(x => `<div class="cview__tile">${logo(x)}</div>`).join("")}</div>`;
      vMeta.textContent = T[L].meta; vName.textContent = T[L].name; vLine.textContent = T[L].line;
      vStats.innerHTML = ""; vStats.hidden = true; vDid.innerHTML = "";
      vBody.innerHTML = `<ul class="tlist">${T.items.map(x => `<li><b>${x.name}</b><span>${x[L]}</span></li>`).join("")}</ul>`;
      vNav.hidden = true;
    } else {
      const c = ALL[s.i], d = c[L], pos = s.group.indexOf(s.i);
      view.style.setProperty("--c", c.color);
      const shots = (window.CASES_SHOTS || {})[c.id] || [];
      vMedia.classList.toggle("has-shots", shots.length > 0);
      if (!shots.length) vMedia.innerHTML = `<figure class="cview__fig">${tile(c)}</figure>`;
      else story(c, shots);
      vMeta.textContent = d.meta; vName.textContent = c.name; vLine.textContent = d.line;
      vStats.style.setProperty("--n", Math.max(1, d.stats.length));
      vStats.innerHTML = d.stats.map(x => `<li><div class="cnum">${reels(x[0])}</div><p class="mono">${x[1]}</p></li>`).join("");
      vStats.hidden = !d.stats.length;
      vBody.textContent = d.body;
      vDid.innerHTML = `<span class="mono">${t("cases.did")}</span>` + d.did.map(x => `<i>${x}</i>`).join("");
      vCount.textContent = `${pad(pos + 1)} / ${pad(s.group.length)}`;
      vNav.hidden = s.group.length < 2;
    }
    // long single-word names shrink to fit the column instead of running off the edge
    vName.style.fontSize = "";
    const room = vName.parentNode.clientWidth - parseFloat(getComputedStyle(vName.parentNode).paddingLeft) - parseFloat(getComputedStyle(vName.parentNode).paddingRight);
    if (vName.scrollWidth > room) vName.style.fontSize = `${parseFloat(getComputedStyle(vName).fontSize) * room / vName.scrollWidth * 0.98}px`;
    view.classList.remove("is-swap"); void view.offsetWidth; view.classList.add("is-swap");
    $(".cview__text").scrollTop = 0;
    if (s.kind === "c") { if (animate) requestAnimationFrame(() => spin(vStats, 0.35)); else spin(vStats, 0); }
  }
  function openView(s) {
    lastFocus = document.activeElement;
    cur = s; show(s);
    view.setAttribute("aria-hidden", "false");
    view.classList.add("is-open");
    document.body.classList.add("cview-open");
    if (window.__lenis) window.__lenis.stop();
    setTimeout(() => $("#cviewClose").focus({ preventScroll: true }), 60);
  }
  function closeView() {
    if (!cur) return;
    clearTimeout(stT);
    cur = null;
    view.classList.remove("is-open");
    view.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cview-open");
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  const go = d => {
    if (!cur || cur.kind !== "c" || cur.group.length < 2) return;
    const g = cur.group, k = (g.indexOf(cur.i) + d + g.length) % g.length;
    cur = { kind: "c", i: g[k], group: g }; show(cur);
  };
  list.addEventListener("click", e => { const b = e.target.closest(".crow__btn"); if (b) openView({ kind: "c", i: +b.dataset.i, group: MAIN }); });
  track.addEventListener("click", e => {
    const b = e.target.closest(".also__item"); if (!b) return;
    if (b.dataset.k === "t") openView({ kind: "t" });
    else openView({ kind: "c", i: +b.dataset.id, group: SMALL });
  });
  $("#cviewClose").addEventListener("click", closeView);
  $("#cviewPrev").addEventListener("click", () => go(-1));
  $("#cviewNext").addEventListener("click", () => go(1));
  view.addEventListener("click", e => { if (e.target === view) closeView(); });
  addEventListener("keydown", e => {
    if (!cur) return;
    if (e.key === "Escape") closeView();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
  // swipe left/right between cases on touch screens
  let sx = null, sy = null;
  view.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  view.addEventListener("touchend", e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
