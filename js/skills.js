/* Skills block: six glass panels stand on a lit stage (the same black studio as the first block).
   Scrolling slides them sideways; the one under the spotlight turns to face you and lights up.

   Performance: the panels move every frame, so nothing on them makes the browser repaint while they
   move. No backdrop blur (there is only black behind them) and no -webkit-box-reflect; the reflection
   is a flipped copy that moves with its panel, and the "lit" glow is a layer whose opacity changes.
   When the panels have settled, the loop stops writing styles. */
(() => {
  const section = document.getElementById("skills");
  if (!section) return;
  const track = section.querySelector(".sk-track"), halo = section.querySelector(".sk-halo"), num = section.querySelector("#skNum"), bar = section.querySelector("#skBar");
  const lang = () => (window.currentLang === "uk" ? "uk" : "en");
  const SK = {
    en: [
      ["Strategy", "Positioning, content systems, channel launches from zero, end-to-end SMM direction.", ["Notion", "Jira", "Trello", "Asana"]],
      ["AI production", "AI video, virtual creators and content automation. 2× output with the same team.", ["Claude", "Midjourney", "Seedance", "Nano Banana", "Higgsfield"]],
      ["Content", "Reels, TikTok, carousels and stories, localised for 7 languages at once.", ["Figma", "Canva", "CapCut", "Premiere Pro", "Final Cut Pro", "Lightroom"]],
      ["Platforms", "Native formats, tone and growth mechanics for each network, from feeds to messengers.", ["Instagram", "Facebook", "TikTok", "X (Twitter)", "YouTube", "Telegram", "WhatsApp", "Discord"]],
      ["Community", "Telegram, WhatsApp and Discord: VIP chats, promo drops, engagement and retention flows.", ["Telegram", "WhatsApp", "Discord"]],
      ["Influencers", "Creator collaborations and contract-based ambassadors.", ["TrendHero", "HypeAuditor"]],
      ["Analytics", "KPIs, reporting and growth experiments that feed the next plan.", ["Meta Business Suite", "Internal CRM", "Google Analytics 4", "AppsFlyer", "TrendHero"]]
    ],
    uk: [
      ["Стратегія", "Позиціонування, контент-системи, запуск каналів з нуля, SMM-напрям від початку до кінця.", ["Notion", "Jira", "Trello", "Asana"]],
      ["AI-продакшн", "AI-відео, віртуальні кріейтори й автоматизація контенту. Удвічі більше контенту тією ж командою.", ["Claude", "Midjourney", "Seedance", "Nano Banana", "Higgsfield"]],
      ["Контент", "Reels, TikTok, каруселі й сторіс, локалізовані одразу на 7 мов.", ["Figma", "Canva", "CapCut", "Premiere Pro", "Final Cut Pro", "Lightroom"]],
      ["Платформи", "Нативні формати, тон і механіки росту для кожної мережі, від стрічок до месенджерів.", ["Instagram", "Facebook", "TikTok", "X (Twitter)", "YouTube", "Telegram", "WhatsApp", "Discord"]],
      ["Ком'юніті", "Telegram, WhatsApp і Discord: VIP-чати, промо-дропи, залучення й утримання.", ["Telegram", "WhatsApp", "Discord"]],
      ["Інфлюенсери", "Колаборації з кріейторами та амбасадори за контрактом.", ["TrendHero", "HypeAuditor"]],
      ["Аналітика", "KPI, звіти й експерименти з росту, з яких складається наступний план.", ["Meta Business Suite", "Внутрішня CRM", "Google Analytics 4", "AppsFlyer", "TrendHero"]]
    ]
  };
  const N = SK.en.length, pad = n => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inner = (s, i) => `<div class="sk-n mono"><b>${pad(i + 1)}</b><span>/ ${pad(N)}</span></div>
      <div class="sk-big" aria-hidden="true">${pad(i + 1)}</div>
      <h3 class="sk-t">${s[0]}</h3><p class="sk-d mono">${s[1]}</p>
      <div class="sk-chips">${s[2].map(x => `<span>${x}</span>`).join("")}</div>`;
  let panels = [], mx = 0, sx = 0, cam = 0, last = null, cur = -1, pw = 0;
  function render() {
    track.innerHTML = SK[lang()].map((s, i) => `<article class="sk-panel" data-i="${i}" tabindex="0" aria-label="${pad(i + 1)} ${s[0]}">
      <div class="sk-face"><div class="sk-in">${inner(s, i)}</div></div>
      <div class="sk-refl" aria-hidden="true"><div class="sk-face"><div class="sk-in">${inner(s, i)}</div></div></div>
    </article>`).join("");
    panels = [...track.children];
    last = null; cur = -1; pw = 0;                  // force one full write
  }
  render();
  window.addEventListener("langchange", render);
  { const tot = section.querySelector(".sk-prog span"); if (tot) tot.textContent = pad(N); }

  /* click a neighbouring panel to bring it under the spotlight: the block is scroll-driven,
     so this scrolls the page to the spot where that panel is the lit one */
  const pinEl = section.querySelector(".skills__pin");
  const pinH = () => (pinEl ? pinEl.offsetHeight : innerHeight);   // the stage is the large viewport tall on phones, not innerHeight
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;   // the cards still follow the scroll, but don't turn, and nothing glides
  let gliding = false;
  const easeOut = t => 1 - Math.pow(1 - t, 3), easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // a click answers at once (ease-out: the cards start moving on the same frame); the settle after a scroll eases in and out
  const go = (i, dur = .9, easing = easeOut) => {
    i = clamp(i, 0, N - 1);
    const top = section.getBoundingClientRect().top + scrollY, len = section.offsetHeight - pinH();
    const y = top + len * (i / (N - 1));
    if (reduce) { scrollTo(0, y); return; }
    gliding = true;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: dur, easing, onComplete: () => { gliding = false; } }); else { scrollTo({ top: y, behavior: "smooth" }); setTimeout(() => { gliding = false; }, dur * 1000); }
  };
  track.addEventListener("click", e => { const p = e.target.closest(".sk-panel"); if (p) go(+p.dataset.i); });
  /* when scrolling stops inside the block, one card settles under the light — the next one in the direction the visitor
     was scrolling, not the nearest. Snapping to the nearest pulled a slow scroller back to the same card again and again
     (and held them on the last one), so the block felt like a wall at the end of the site. */
  let snapT = 0, fromY = null, fromPinned = false;
  const pinned = () => { const r = section.getBoundingClientRect(); return r.top <= -4 && r.bottom >= pinH() + 4; };
  const snap = () => {
    const dir = Math.sign(scrollY - fromY), entered = !fromPinned; fromY = null;
    const r = section.getBoundingClientRect(), len = r.height - pinH();
    if (!pinned()) return;                                        // leaving or not in the block: don't hold the visitor
    const p = clamp(-r.top / len, 0, 1) * (N - 1), f = p - Math.floor(p);
    let i;
    if (entered) {                                                // a swipe that just arrived from above or below: let it land where it
      if (Math.min(f, 1 - f) < .2) return;                        // stopped, only straighten a card that is clearly half-way, and always
      i = dir > 0 ? Math.ceil(p) : dir < 0 ? Math.floor(p) : Math.round(p);   // onward: pulling back against the swipe felt like a jerk
    } else i = dir > 0 ? (f > .05 ? Math.ceil(p) : Math.floor(p)) : dir < 0 ? (f < .95 ? Math.floor(p) : Math.ceil(p)) : Math.round(p);
    if (Math.abs(p - i) * len / (N - 1) < 6) return;                // already there
    go(i, .85, easeInOut);
  };
  const touch = matchMedia("(pointer:coarse)").matches;
  const onScroll = () => { if (fromY === null) { fromY = scrollY; fromPinned = pinned(); } clearTimeout(snapT); snapT = setTimeout(snap, touch ? 240 : 160); };
  if (window.__lenis) window.__lenis.on("scroll", onScroll); else addEventListener("scroll", onScroll, { passive: true });
  // a finger on the screen always wins: a glide in progress stops at once instead of fighting the swipe
  addEventListener("touchstart", () => {
    clearTimeout(snapT); fromY = null;
    if (gliding && window.__lenis) { gliding = false; window.__lenis.scrollTo(scrollY, { immediate: true, force: true }); }
  }, { passive: true });
  track.addEventListener("keydown", e => { const p = e.target.closest(".sk-panel"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(+p.dataset.i); } });
  const set = (el, k, v) => { const c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };
  const progress = () => { const r = section.getBoundingClientRect(); return clamp(-r.top / (r.height - pinH()), 0, 1); };
  const near = () => { const r = section.getBoundingClientRect(); return r.bottom > -innerHeight && r.top < innerHeight * 2; };   // starts a screen early: the panels' first paint happens before they arrive, not mid-swipe
  const hover = matchMedia("(hover:hover)").matches;
  if (hover) section.addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; });
  section.addEventListener("pointerleave", () => { mx = 0; });

  let tPrev = 0, wasT = 0;
  /* The panels' path (slide, depth, turn, fade) is a paused Web Animation per panel, scrubbed by the camera,
     instead of a transform string written every frame. Safari re-draws a layer whose 3D scale changes from script
     on every frame (the depth and the turn change it all the time), so the cards stuttered there while Chrome was
     smooth; a layer that is being animated keeps its drawing. One keyframe per twentieth of a card, linear between. */
  const placeAt = (d, SP) => {
    const ad = Math.abs(d);
    const x = d * SP + Math.sign(d) * Math.min(ad, 1) * SP * .18;
    const ry = reduce ? 0 : clamp(-d * 38, -58, 58), z = -Math.min(ad, 3) * 170;
    return `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
  };
  // neighbours stay solid so the panels behind don't show through them; the third one is faint (~.12)
  const opAt = ad => clamp(ad <= 1 ? 1 : ad <= 2 ? 1 - (ad - 1) * .5 : .5 - (ad - 2) * .38, 0, 1);
  let anims = [];
  function build(SP) {
    anims.forEach(a => a && a.cancel());
    const STEPS = (N - 1) * 20;
    anims = panels.map((el, i) => {
      if (!el.animate) return null;
      const kf = [];
      for (let k = 0; k <= STEPS; k++) { const c = k / 20, d = i - c; kf.push({ offset: k / STEPS, transform: placeAt(d, SP), opacity: opAt(Math.abs(d)).toFixed(3) }); }
      el.style.transform = ""; el.style.opacity = "";
      const a = el.animate(kf, { duration: (N - 1) * 1000, fill: "both", easing: "linear" });
      a.pause(); a.currentTime = cam * 1000;
      return a;
    });
  }
  function frame(now) {
    // the same easing at 60 and 120 Hz: the follow speed is per second, not per frame (0.14 per frame ran twice as fast,
    // and twice as twitchy, on ProMotion iPhones and 120 Hz monitors)
    const dt = Math.min(.05, tPrev ? (now - tPrev) / 1000 : 1 / 60); tPrev = now;
    if (near()) {
      const goal = progress() * (N - 1);
      cam += (goal - cam) * (1 - Math.exp(-dt * 7.5)); if (Math.abs(goal - cam) < .0005) cam = goal;
      cam = clamp(cam, goal - .35, goal + .35);   // never more than a third of a card behind the scroll: a fast flick used to leave the cards
                                                  // catching up after the stage had already started to scroll away (card 05 on the way into Contact)
      sx += (mx - sx) * (1 - Math.exp(-dt * 5)); if (Math.abs(mx - sx) < .0005) sx = mx;
      const key = cam.toFixed(4) + "|" + sx.toFixed(4) + "|" + innerWidth;
      if (key !== last) {                           // nothing moved: write nothing
        last = key;
        if (!pw) { pw = panels[0] ? panels[0].offsetWidth : 320; build(pw * .7); }   // measured once (and on resize), not every frame
        const c = Math.round(cam);
        // stacking by rank (nearest panel on top), not by distance: the rank only changes when two panels swap order,
        // while a distance-based z-index changed every frame and made the browser repaint the whole page each time
        const rank = panels.map((_, i) => i).sort((a, b) => Math.abs(a - cam) - Math.abs(b - cam));
        const tilt = reduce ? "" : `y ${(sx * 10).toFixed(2)}deg`;
        panels.forEach((el, i) => {
          const op = opAt(Math.abs(i - cam));
          if (anims[i]) anims[i].currentTime = cam * 1000;            // the panel's place on its paused animation (see build)
          set(el, "rotate", tilt);                                    // the cursor tilt rides on top, as its own property
          set(el, "visibility", op < .03 ? "hidden" : "visible");   // panels too far to see are not drawn at all
          set(el, "zIndex", String(100 - rank.indexOf(i)));
        });
        if (c !== cur) {
          const prev = cur; cur = c;
          panels.forEach((el, i) => { el.classList.toggle("is-on", i === c); el.classList.toggle("was-on", i === prev); });
          clearTimeout(wasT); wasT = setTimeout(() => panels.forEach(el => el.classList.remove("was-on")), 650);   // its fade is over: drop the layers
          num.textContent = pad(c + 1);
        }
        set(bar, "transform", `scaleX(${(cam / (N - 1)).toFixed(3)})`);
        // the halo is full when a panel sits under the spotlight and dims while they slide past
        set(halo, "opacity", clamp(1 - Math.abs(cam - Math.round(cam)) * 2.4, 0, 1).toFixed(2));
      }
    }
    raf = running ? requestAnimationFrame(frame) : (tPrev = 0, 0);
  }
  /* the loop runs only while the block is within a screen of the viewport */
  let raf = 0, running = true;
  addEventListener("resize", () => { pw = 0; last = null; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      running = es[0].isIntersecting;
      section.classList.toggle("is-near", running);              // the panels get their GPU layers only around the block (css)
      if (running && !raf) { tPrev = 0; raf = requestAnimationFrame(frame); }
    }, { rootMargin: "100% 0px" }).observe(section);
  }
  else section.classList.add("is-near");
  raf = requestAnimationFrame(frame);
})();
