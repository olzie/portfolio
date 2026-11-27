/* Cases outside iGaming
   - every main case is a row; on desktop a soft glow in the brand's colour drifts behind the list
     after the cursor, and the hovered row shows the brand's white logo
   - below, a running line: tenders first (all open one window), then small cases (each opens its own)
   - a case opens over the page; its numbers roll in like slot reels
   Plain JS + CSS transitions. Text comes from cases.js in the current language. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const list = $("#clist"), glow = $("#cglow"), view = $("#cview"), track = $("#alsoTrack");
  /* the glow stays over the list: it fades out above the running line, whose edge fades are
     drawn in the background colour and would show as dark boxes over a coloured glow */
  const glowWrap = glow && glow.parentNode;
  const fitGlow = () => {
    if (!glowWrap || !list.offsetParent) return;
    const sec = glowWrap.parentNode.getBoundingClientRect(), lb = list.getBoundingClientRect().bottom;
    // folded: no running line below, but the Skills stage slides over the block's last strip, so the glow
    // fades out fully above it, slowly, instead of meeting an edge. Open: it ends above the running line.
    const overlap = Math.abs(parseFloat(getComputedStyle(document.getElementById("skills") || document.body).marginTop) || 0);
    const folded = list.classList.contains("is-collapsed");
    glowWrap.style.bottom = (folded ? Math.round(overlap) : Math.max(0, Math.round(sec.bottom - lb - 40))) + "px";
    glowWrap.style.setProperty("--gf", folded ? "200px" : "100px");
  };
  if ("ResizeObserver" in window) new ResizeObserver(fitGlow).observe(list);
  if (!list || !window.CASES) return;
  const ALL = window.CASES, T = window.CASES_TENDERS;
  // top 3 by numbers first, then everything else from newest to oldest
  const idx = ALL.map((c, i) => i).filter(i => !ALL[i].small);
  const TOP = idx.filter(i => ALL[i].top).sort((a, b) => ALL[a].top - ALL[b].top);
  const REST = idx.filter(i => !ALL[i].top).sort((a, b) => ALL[b].y - ALL[a].y);
  const MAIN = [...TOP, ...REST];
  const shownOrder = () => MAIN;
  // headline figures: brands worked with outside iGaming, plus tenders
  { const b = document.getElementById("casesBrands"), t = document.getElementById("casesTenders");
    if (b) b.textContent = ALL.length;                                   // every brand in the list and the running line
    if (t) t.textContent = (window.CASES_TENDERS?.items || []).length; }   // the top 3 stay first when the list opens; the rest follow, newest first
  const yearOf = d => (d.meta.match(/\d{4}(–\d{2})?/) || [""])[0];
  const SMALL = (window.CASES_SMALL_ORDER || []).map(id => ALL.findIndex(c => c.id === id)).filter(i => i >= 0);
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => (window.currentLang === "uk" ? "uk" : "en");
  const t = k => window.I18N?.[lang()]?.[k] || "";
  const pad = n => String(n).padStart(2, "0");

  /* the brand's own logo in white on its colour; the name in type when there is no logo */
  /* Every logo gets the same visual weight, not the same frame: CSS sizes it by its proportions (--ar),
     so a square mark isn't tiny next to a long wordmark. */
  const arOf = src => (window.LOGO_AR || {})[(src || "").split("/").pop().split("?")[0].replace(".svg", "")] || 2;
  const logo = (c, cls = "") => c.logo
    ? `<img class="lg ${cls}" src="${c.logo}" alt="${c.name}" decoding="async" style="--ar:${arOf(c.logo)}">`
    : `<span class="lg lg--type ${cls}">${c.name}</span>`;
  const tile = c => `<div class="brand" style="--c:${c.color}">${logo(c)}</div>`;

  /* ---------- slot reels: every digit spins and lands, the rest stays still ---------- */
  const TURNS = 2;
  // screen readers and search get the final figure as text; the rolling digits are hidden from them
  const reels = str => `<span class="sr">${str}</span>` + [...str].map(ch => /\d/.test(ch)
    ? `<span class="reel" aria-hidden="true" data-d="${ch}"><span class="reel__strip">${Array.from({ length: (TURNS + 1) * 10 }, (_, i) => `<span>${i % 10}</span>`).join("")}</span></span>`
    : /[+%×]/.test(ch) ? `<em aria-hidden="true">${ch}</em>` : `<span class="reel__static" aria-hidden="true">${ch}</span>`).join("");
  function spin(root, baseDelay = 0) {
    root.querySelectorAll(".reel").forEach((r, i) => {
      const strip = r.firstElementChild, d = +r.dataset.d;
      // every digit in the strip is exactly 1em tall, so move in em: no measuring while the view is still opening
      const y = -(TURNS * 10 + d);
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      void strip.offsetHeight;
      if (reduce) { strip.style.transform = `translateY(${y}em)`; return; }
      strip.style.transition = `transform ${1.1 + (i % 6) * 0.12}s cubic-bezier(.2,.9,.25,1.12) ${baseDelay + i * 0.07}s`;
      strip.style.transform = `translateY(${y}em)`;
    });
  }

  let collapsed = true;     // the rest of the list stays folded until the button is pressed
  const section = $("#cases");

  /* ---------- list + running line ---------- */
  function render(noFlip) {
    const L = lang();
    let lastYear = "";
    let restN = 0;
    const row = (ci, n, top) => {
      const c = ALL[ci], d = c[L];
      const yr = yearOf(d), firstOfYear = yr !== lastYear;
      if (!top) lastYear = yr;
      const r = top ? 0 : restN++;
      const key = d.key
        ? `<b>${d.key[0].replace(/([+%×])/g, "<em>$1</em>")}</b><small class="mono">${d.key[1]}</small>`
        : `<small class="mono crow__did">${d.did.slice(0, 2).join(" · ")}</small>`;
      const meta = d.meta.replace(/( · \d{4}(–\d{2})?)/, `<span class="crow__yr">$1</span>`);   // the year has its own column on desktop
      return `
      <li class="crow${top ? ` crow--top${collapsed && n === TOP.length - 1 ? " crow--last" : ""}` : " crow--rest"}${!top && firstOfYear ? " crow--year" : ""}" style="--i:${n};--r:${r}">
        <button class="crow__btn" type="button" data-i="${ci}" aria-label="${c.name}: ${t("cases.open") || "Open case"}">
          <span class="crow__i mono">${top || firstOfYear ? yr : ""}</span>
          <span class="crow__logo" style="--c:${c.color}" aria-hidden="true">${logo(c)}</span>
          <span class="crow__name">${c.name}</span>
          <span class="crow__meta mono"><span class="crow__mt">${meta}</span>${c.logo ? `<img class="crow__lg" src="${c.logo}" alt="" decoding="async" style="${(() => { const a = arOf(c.logo), w = Math.min(160, 58 * a, Math.sqrt(3300 * a)); return `width:${w.toFixed(0)}px;height:${(w / a).toFixed(0)}px`; })()}">` : `<span class="crow__lg crow__lg--type">${c.name}</span>`}</span>
          <span class="crow__key">${key}</span>
          <span class="crow__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span>
        </button>
      </li>`;
    };
    const btn = `<button class="cmore__btn glass mono" type="button" aria-expanded="${!collapsed}">${collapsed ? t("cases.more").replace("{n}", REST.length) : t("cases.less")}<span aria-hidden="true">${collapsed ? "↓" : "↑"}</span></button>`;
    // the top rows slide to their new places instead of jumping (FLIP: measure, re-render, play the difference back)
    const before = {};
    if (!noFlip) list.querySelectorAll(".crow--top .crow__btn").forEach(b => before[b.dataset.i] = b.getBoundingClientRect().top);
    list.innerHTML = collapsed
      ? TOP.map((ci, n) => row(ci, n, true)).join("") + `<li class="cmore">${btn}</li>`
      : MAIN.map((ci, n) => row(ci, n, !!ALL[ci].top)).join("");
    const moved = [];
    list.querySelectorAll(".crow--top .crow__btn").forEach(b => {
      const d = before[b.dataset.i] == null ? 0 : before[b.dataset.i] - b.getBoundingClientRect().top;
      if (Math.abs(d) > 1) { const li = b.parentNode; li.style.transition = "none"; li.style.transform = `translateY(${d}px)`; moved.push(li); }
    });
    if (moved.length) { void list.offsetHeight; moved.forEach(li => { li.style.transition = "transform .8s var(--ease)"; li.style.transform = ""; }); }
    // open list: "Show less" goes under the running line of tenders
    let after = document.getElementById("cmoreEnd");
    if (!after) { after = document.createElement("div"); after.id = "cmoreEnd"; after.className = "cmore cmore--end"; $(".also").after(after); }
    after.innerHTML = collapsed ? "" : btn;
    after.hidden = collapsed;
    list.classList.toggle("is-collapsed", collapsed);
    section && section.classList.toggle("is-collapsed", collapsed);

  }
  /* the button is drawn here, after main.js set up the glass highlight: follow the cursor for it too */
  if (hover) section.addEventListener("pointermove", e => {
    const b = e.target.closest(".cmore__btn"); if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--gl-x", e.clientX - r.left + "px");
    b.style.setProperty("--gl-y", e.clientY - r.top + "px");
  });

  /* everything after the top 3 opens with the button under them */
  /* "Show less" sits at the very end of the open list. The list folds and the page is shifted in the same frame so the
     button stays exactly where the finger/cursor is (it becomes "Show all"): nothing glides, nothing jumps, the visitor
     isn't thrown back to the start of the block. */
  let openedAt = null, folding = false;
  section.addEventListener("click", e => {
    const btnEl = e.target.closest(".cmore__btn");
    if (!btnEl) return;
    if (collapsed) {
      openedAt = section.getBoundingClientRect().top;               // where the block sat on screen when the list was opened
      collapsed = false; render();
      list.classList.add("is-opening"); section.classList.add("is-opening");
      return;
    }
    /* The usual "show less" pattern (eBay's pulldown list, the scrollIntoView fix): restore the folded list and bring the
       reader back to the start of the block — here to exactly where it sat when "Show all" was pressed. Smooth version:
       the page scrolls back smoothly (list still open: it starts with the same three rows as the folded one), then the
       list closes like an accordion — its height animates down, so what follows slides up instead of being swapped. */
    if (folding) return;
    folding = true;
    const target = window.scrollY + section.getBoundingClientRect().top - (openedAt ?? 80);
    openedAt = null;
    let done = false;
    const close = () => {
      if (done) return; done = true;
      const h0 = list.offsetHeight;
      list.classList.remove("is-opening"); section.classList.remove("is-opening");
      collapsed = true; render(true);
      const h1 = list.offsetHeight;
      const nb = list.querySelector(".cmore__btn"); if (nb) nb.focus({ preventScroll: true });   // focus stays on the toggle
      if (h0 > h1 + 2) {
        list.style.height = h0 + "px"; list.style.overflow = "hidden";
        void list.offsetHeight;
        list.style.transition = "height .45s cubic-bezier(.22,.61,.36,1)";
        list.style.height = h1 + "px";
        const end = () => { list.style.height = list.style.overflow = list.style.transition = ""; folding = false; if (window.__lenis) window.__lenis.resize(); };
        list.addEventListener("transitionend", end, { once: true });
        setTimeout(end, 700);
      } else { folding = false; if (window.__lenis) window.__lenis.resize(); }
    };
    const far = Math.abs(window.scrollY - target);
    if (far > 4) {
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: .9, force: true, onComplete: close });
      else window.scrollTo({ top: target, behavior: "smooth" });
      setTimeout(close, 1200);                                        // never left half-way if the scroll is interrupted
    } else close();
  });

  /* running line: tenders (one window), then small cases (their own windows). Built once: names don't change with the language */
  function buildTrack() {
  const byId = Object.fromEntries(T.items.map(x => [x.id, x]));
  const items = [
    ...T.line_ids.map(id => ({ kind: "t", id, name: byId[id].name, logo: byId[id].logo })),
    ...SMALL.map(i => ({ kind: "c", id: i, name: ALL[i].name, logo: ALL[i].logo }))
  ];
  const one = (x, hidden) => `<button class="also__item${x.kind === "t" ? " is-tender" : ""}" type="button" data-k="${x.kind}" data-id="${x.id}"${hidden ? ' tabindex="-1" aria-hidden="true"' : ""} aria-label="${x.name}">${
    x.logo ? `<img src="${x.logo}" alt="" decoding="async">` : `<span>${x.name}</span>`}</button>`;
  const sep = `<i aria-hidden="true"></i>`;
  track.innerHTML = items.map(x => one(x) + sep).join("") + items.map(x => one(x, true) + sep).join("");   // twice, so the loop is seamless
  // round logos get taller, long wordmarks shorter, so they all read the same size.
  // The line starts moving only once every logo has its size: a logo that resized mid-loop changed
  // the track's width and made the whole line jump.
  const imgs = [...track.querySelectorAll("img")];
  Promise.all(imgs.map(im => (im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; })).then(() => {
    const ar = im.naturalWidth / im.naturalHeight || 3;
    im.style.height = `calc(var(--lh) * ${Math.min(1.85, Math.max(0.66, Math.sqrt(2.6 / ar))).toFixed(2)})`;
  }))).then(() => track.classList.add("is-ready"));
  // the line only moves while it is on screen
  if ("IntersectionObserver" in window) new IntersectionObserver(es => track.classList.toggle("is-vis", es[0].isIntersecting)).observe(track);
  else track.classList.add("is-vis");
  /* hover: the line stops while the cursor is on it (to click a logo), but over its right edge it runs
     fast instead, for a quick look through everything. The speed eases between the two. */
  // the line is hidden (no animation yet) until the list opens, so the animation is looked up when needed
  const vp = track.parentNode, anim = () => track.getAnimations && track.getAnimations()[0];
  if (hover && track.getAnimations) {
    const ff = `${'<svg viewBox="0 0 24 24"><path d="M8 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>'.repeat(2)}`;
    vp.insertAdjacentHTML("beforeend", `<span class="also__ff" aria-hidden="true">${ff}</span><span class="also__ff also__ff--back" aria-hidden="true">${ff}</span>`);
    const FAST = 8;
    let rate = 1, goal = 1, ffRaf = 0;
    const zone = () => Math.max(90, vp.clientWidth * 0.12);
    const step = () => {
      rate += (goal - rate) * 0.12;
      if (Math.abs(goal - rate) < 0.01) rate = goal;
      const a = anim();
      if (a) {
        // running backwards, the line must never reach the animation's start (it would finish and stop):
        // give it a big head start, which looks the same because the loop is seamless
        if (rate < 0 && a.currentTime < 60000) { const d = a.effect.getTiming().duration || 70000; a.currentTime += d * 200; }
        a.playbackRate = rate;
      }
      ffRaf = rate !== goal ? requestAnimationFrame(step) : 0;
    };
    const aim = g => { goal = g; if (!ffRaf) ffRaf = requestAnimationFrame(step); };
    vp.addEventListener("pointermove", e => {
      // right edge: fast forward; left edge: fast backwards; elsewhere: stop
      const r = vp.getBoundingClientRect(), z = zone(), fwd = e.clientX > r.right - z, rev = e.clientX < r.left + z;
      vp.classList.add("is-hover"); vp.classList.toggle("is-fast", fwd || rev);
      vp.classList.toggle("is-fwd", fwd); vp.classList.toggle("is-rev", rev);
      aim(fwd ? FAST : rev ? -FAST : 0);
    });
    vp.addEventListener("pointerleave", () => { vp.classList.remove("is-hover", "is-fast", "is-fwd", "is-rev"); aim(1); });
  }
  }
  buildTrack();
  render();
  window.addEventListener("langchange", () => { render(); if (cur) show(cur, false); });

  /* rows rise in when the list scrolls into view */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { section.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(section);
  } else section.classList.add("is-in");

  /* ---------- a glow in the brand's colour follows the cursor behind the list (desktop only) ---------- */
  if (hover) {
    let tx = 0, ty = 0, x = 0, y = 0, active = -1, raf = 0, shown = false;
    const loop = () => {
      const r = section.getBoundingClientRect();          // the section moves when the page scrolls: aim in its coordinates
      x += (tx - r.left - x) * 0.07; y += (ty - r.top - y) * 0.07;
      glow.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      const still = Math.abs(tx - r.left - x) < 0.3 && Math.abs(ty - r.top - y) < 0.3;
      raf = !still && (shown || glow.classList.contains("is-on")) ? requestAnimationFrame(loop) : 0;
    };
    const setActive = i => {
      if (i === active) return;
      active = i;
      if (i >= 0) glow.style.setProperty("--gc", ALL[i].color);
      list.querySelectorAll(".crow__btn").forEach(el => el.parentNode.classList.toggle("is-hot", +el.dataset.i === i));
    };
    let hideT = 0;
    const show = i => {
      clearTimeout(hideT);
      if (!shown) {
        if (!glow.classList.contains("is-on")) { const r = section.getBoundingClientRect(); x = tx - r.left; y = ty - r.top; }
        shown = true; glow.classList.add("is-on"); list.classList.add("is-hovering");
      }
      setActive(i);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const hide = () => {
      if (!shown) return;
      shown = false; glow.classList.remove("is-on"); list.classList.remove("is-hovering"); setActive(-1);
    };
    // the glow shows only while the cursor is on a row
    list.addEventListener("pointermove", e => {
      tx = e.clientX; ty = e.clientY;
      const btn = e.target.closest(".crow__btn");
      if (btn) { show(+btn.dataset.i); if (!raf) raf = requestAnimationFrame(loop); }
      // over the button it goes at once; between rows it waits a moment, so it doesn't blink on the line between them
      else if (e.target.closest(".cmore")) { clearTimeout(hideT); hide(); }
      else { clearTimeout(hideT); hideT = setTimeout(hide, 90); }
    });
    list.addEventListener("pointerleave", hide);
    // keep the cursor position current everywhere, so the check after scrolling uses where the cursor really is
    addEventListener("pointermove", e => { if (!list.contains(e.target)) { tx = e.clientX; ty = e.clientY; } }, { passive: true });
    document.addEventListener("pointerleave", () => { tx = ty = -1; hide(); });
    // the list moves under a still cursor while the page scrolls: each frame, look at what is under the cursor now
    let chk = 0, near = false;
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { near = es[0].isIntersecting; if (!near) hide(); }).observe(section);
    else near = true;
    addEventListener("scroll", () => {
      if (chk || (!near && !shown)) return;
      chk = requestAnimationFrame(() => {
        chk = 0;
        const el = tx >= 0 && document.elementFromPoint(tx, ty), btn = el && el.closest(".crow__btn");
        if (btn && list.contains(btn)) show(+btn.dataset.i); else hide();
      });
    }, { passive: true });
  }

  /* ---------- case view ---------- */
  // cur = { kind: "c", i, group: [indices] } for a case, { kind: "t" } for the tenders window
  let cur = null, lastFocus = null, settleT = 0;
  const vMedia = $("#cviewMedia"), vMeta = $("#cviewMeta"), vName = $("#cviewName"), vLine = $("#cviewLine"),
        vStats = $("#cviewStats"), vBody = $("#cviewBody"), vDid = $("#cviewDid"), vCount = $("#cviewCount"), vNav = $("#cviewNav");
  /* work examples play like Instagram stories: logo first, then each screenshot.
     Tap the right half for the next one, the left half for the previous; hovering pauses. */
  let stT = 0, stI = 0, stN = 0, stPaused = false, stLeft = 0, stStart = 0;
  const LOGO_MS = 1600, SHOT_MS = 4200;
  function story(c, shots) {
    clearTimeout(stT);
    const slides = [`<div class="st__slide st__slide--logo">${tile(c)}</div>`].concat(shots.map((x, k) =>
      `<div class="st__slide" style="--bg:url('${new URL(`assets/cases/shots/${x[0]}`, document.baseURI).href}')"><img src="assets/cases/shots/${x[0]}" width="${x[1]}" height="${x[2]}" alt="${c.name}, ${t("cases.example")} ${k + 1}" decoding="async"></div>`));
    vMedia.innerHTML = `<div class="st" style="--c:${c.color}">
      <div class="st__bars">${slides.map(() => "<i></i>").join("")}</div>
      <div class="st__head"><span class="st__ava">${logo(c)}</span><b>${c.name}</b></div>
      ${slides.join("")}
      <button class="st__tap st__tap--prev" type="button" aria-label="${t("cases.prev")}"></button>
      <button class="st__tap st__tap--next" type="button" aria-label="${t("cases.next")}"></button>
    </div>`;
    // decode every shot up front, so a fast tap doesn't land on a picture that is still being unpacked
    vMedia.querySelectorAll(".st__slide > img").forEach(im => { if (im.decode) im.decode().catch(() => {}); });
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
      // if a number is wider than its column, shrink all three by the same amount so they stay one size
      requestAnimationFrame(() => {
        const nums = [...vStats.querySelectorAll(".cnum")];
        nums.forEach(n => n.style.fontSize = "");
        let k = 1;
        nums.forEach(n => { const room = n.parentNode.clientWidth - (n.parentNode === vStats.firstElementChild ? 18 : 36); if (n.scrollWidth > room) k = Math.min(k, room / n.scrollWidth); });
        if (k < 1) nums.forEach(n => n.style.fontSize = `${parseFloat(getComputedStyle(n).fontSize) * k * 0.97}px`);
      });
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
    clearTimeout(settleT); settleT = setTimeout(() => cur && document.body.classList.add("cview-settled"), 900);
    if (window.__lenis) window.__lenis.stop();
    setTimeout(() => $("#cviewClose").focus({ preventScroll: true }), 60);
  }
  function closeView() {
    if (!cur) return;
    clearTimeout(stT);
    cur = null;
    clearTimeout(settleT); document.body.classList.remove("cview-settled");
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
  list.addEventListener("click", e => { const b = e.target.closest(".crow__btn"); if (b) openView({ kind: "c", i: +b.dataset.i, group: shownOrder() }); });
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
