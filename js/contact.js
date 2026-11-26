/* Contact: a glass dock where every channel is an "app".
   - the giant title is fitted to the width;
   - the floor line sits right under the dock;
   - icons swell under the cursor (like the macOS dock) and bounce when clicked;
   - the first time the dock comes into view, a virtual cursor sweeps across it and rests on the call;
   - "Brief" opens a small chat window: three taps write the first message, which opens in Telegram. */
(function () {
  const sec = document.getElementById("contact");
  if (!sec) return;
  const $ = s => sec.querySelector(s), $$ = s => [...sec.querySelectorAll(s)];
  const title = $(".ct-title"), dock = $("#ctDock"), apps = $$(".ct-app"), bg = $(".ct-bg");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const wide = matchMedia("(min-width:901px)");
  const TG = "https://t.me/itsolz";

  /* ---------- title fit + floor line ---------- */
  function layout() {
    title.style.removeProperty("--tfs");
    const fs = parseFloat(getComputedStyle(title).fontSize);
    if (wide.matches) {                                  // one line across the whole width
      const r = document.createRange(); r.selectNodeContents(title);
      const w = r.getBoundingClientRect().width;
      if (w) title.style.setProperty("--tfs", Math.min(250, fs * title.clientWidth * .96 / w).toFixed(1) + "px");
    } else {                                             // phones: words wrap, but the longest word must still fit (ПОГОВОРІМО is one word)
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit";
      title.appendChild(probe);
      let wmax = 0;
      title.textContent.split(/\s+/).forEach(w => { probe.textContent = w; wmax = Math.max(wmax, probe.getBoundingClientRect().width); });
      probe.remove();
      if (wmax > title.clientWidth * .96) title.style.setProperty("--tfs", (fs * title.clientWidth * .96 / wmax).toFixed(1) + "px");
    }
    const s = sec.getBoundingClientRect(), d = dock.getBoundingClientRect();
    bg.style.setProperty("--hz", ((d.bottom - s.top - 8) / s.height * 100).toFixed(2) + "%");
  }
  layout();
  if (document.fonts) document.fonts.ready.then(layout);
  addEventListener("resize", layout);
  addEventListener("langchange", () => requestAnimationFrame(layout));

  /* ---------- magnify + bounce ----------
     Only transforms move: each icon's face scales up from its bottom edge and the icons slide apart so they don't overlap.
     Nothing changes size in the layout, so the browser composites the frames instead of re-laying out the dock.
     A single rAF loop eases every icon toward its target, so pointer moves and the intro sweep share one smooth motion. */
  const items = [...dock.children].filter(n => n.matches(".ct-app,.ct-sep"));
  const faces = apps.map(a => a.querySelector(".ct-face")), tips = apps.map(a => a.querySelector(".ct-tip"));
  let rest0 = null, size = 72;
  let restAll = null, dockW = 0;
  const measure = () => { size = apps[0].offsetWidth; rest0 = apps.map(a => a.offsetLeft + a.offsetWidth / 2); restAll = items.map(n => n.offsetLeft + n.offsetWidth / 2); dockW = dock.offsetWidth; };   // offsets ignore transforms
  addEventListener("resize", () => { rest0 = null; });
  const cur = apps.map(() => 1), tgt = apps.map(() => 1);
  let raf = 0, pointerX = null, anchorX = 0;                                   // pointer x relative to the dock box, or null = at rest
  const R = () => wide.matches ? 170 : 110;
  /* positions are a pure function of two eased values: `sp` (where the pointer is) and `amp` (0 = at rest, 1 = fully swollen).
     Easing each icon's size separately from the anchor let them disagree from frame to frame, and the icons twitched. */
  let sp = null, amp = 0;
  function frame() {
    raf = 0; if (!rest0) measure();
    let moving = false;
    if (pointerX !== null) {
      if (sp === null) sp = pointerX;
      sp += (pointerX - sp) * .25;
      if (Math.abs(pointerX - sp) > .2) moving = true; else sp = pointerX;
    }
    const aT = pointerX === null ? 0 : 1;
    amp += (aT - amp) * .2;
    if (Math.abs(aT - amp) > .002) moving = true; else amp = aT;
    /* The swell is a smooth "magnification field" along the dock: scale(t) = 1 + amp·0.55·(1 − |t − sp|/R)^1.6.
       Every point of the dock is moved by the integral of that extra scale from the pointer to the point (G below), the same
       idea as the macOS dock: the point under the cursor stays put, sizes and gaps grow together, nothing overlaps, and as the
       pointer travels each icon only ever slides one way — no back-and-forth twitching. */
    const Rr = R(), Gk = amp * .55 * Rr / 2.6;
    const G = u => { if (sp === null) return 0; const a = Math.min(1, Math.abs(u) / Rr); return Math.sign(u) * Gk * (1 - (1 - a) ** 2.6); };
    const sc = x => sp === null ? 1 : 1 + amp * .55 * Math.max(0, 1 - Math.abs(x - sp) / Rr) ** 1.6;
    let k = 0;
    items.forEach((n, idx) => {
      const c = restAll[idx], dx = G(c - (sp ?? c));
      n.style.transform = `translate3d(${dx.toFixed(2)}px,0,0)`;
      if (n.classList.contains("ct-app")) {
        cur[k] = sc(c);
        faces[k].style.scale = (cur[k] / 1.55).toFixed(4);          // faces are drawn 1.55× and scaled down at rest
        if (tips[k]) tips[k].style.transform = `translateY(${(-size * (cur[k] - 1)).toFixed(2)}px)`;
        k++;
      }
    });
    dock.style.setProperty("--growL", (-G(0 - (sp ?? 0))).toFixed(2) + "px");
    dock.style.setProperty("--growR", G(dockW - (sp ?? dockW)).toFixed(2) + "px");
    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const magnify = x => { pointerX = x - dock.getBoundingClientRect().left; kick(); };   // x in viewport px
  const rest = () => { pointerX = null; kick(); };
  /* while the intro sweep runs, the pointer is only remembered, not followed: hovering the dock early doesn't cut the onboarding short.
     When the sweep ends, the dock picks up wherever the pointer is. */
  let sweeping = false, over = false, lastX = null;
  const chatOpen = () => sec.classList.contains("is-chat") || sec.classList.contains("is-closing");
  dock.addEventListener("pointermove", e => {
    if (!fine.matches) return;
    over = true; lastX = e.clientX;
    if (sweeping) return;
    if (chatOpen() || e.target.closest(".ct-win")) { rest(); return; }
    magnify(e.clientX);
  });
  dock.addEventListener("pointerleave", () => { over = false; if (fine.matches && !sweeping) rest(); });
  apps.forEach(a => a.addEventListener("click", () => { a.classList.remove("is-bounce"); void a.offsetWidth; a.classList.add("is-bounce", "is-ran"); }));

  /* ---------- intro sweep: once, the first time the dock is in view ---------- */
  const center = a => { if (!rest0) measure(); return dock.getBoundingClientRect().left + rest0[apps.indexOf(a)]; };
  const tipAt = x => { let best = null, bd = 1e9; apps.forEach(a => { const d = Math.abs(x - center(a)); if (d < bd) { bd = d; best = a; } }); apps.forEach(a => a.classList.toggle("is-tip", a === best)); };
  function sweep() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sweeping = true; measure();
    const finish = () => {
      sweeping = false; apps.forEach(a => a.classList.remove("is-tip", "is-lit"));
      over && lastX !== null && !chatOpen() ? magnify(lastX) : rest();
    };
    const x0 = center(apps[0]) - 20, x1 = center(apps[apps.length - 1]) + 20, xc = center(apps[0]);
    const T1 = 2200, T2 = 700, t0 = performance.now(), withTips = wide.matches;
    const step = now => {
      if (!sweeping) return;                                       // the chat was opened mid-sweep
      const t = now - t0;
      if (t >= T1 + T2) {
        magnify(xc); if (withTips) tipAt(xc); apps[0].classList.add("is-lit");
        setTimeout(() => { if (sweeping) finish(); }, 1700);
        return;
      }
      let x;
      if (t < T1) { const k = t / T1; x = x0 + (x1 - x0) * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2); }
      else { const k = (t - T1) / T2; x = x1 + (xc - x1) * (1 - (1 - k) ** 3); }
      magnify(x); if (withTips) tipAt(x);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(sweep, 450); } }, { threshold: .6 });
  io.observe(dock);

  /* ---------- toast, CV placeholder ---------- */
  const toastEl = document.getElementById("ctToast");
  const toast = t => { toastEl.textContent = t; toastEl.classList.add("is-on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("is-on"), 1600); };
  $$("[data-cv]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); toast(L().cvSoon); }));   // until the PDF is in place

  /* ---------- chat ---------- */
  const T = {
    en: {
      need: ["SMM strategy", "Channel launch", "Content & AI", "Community", "Influencers", "Consulting"],
      market: ["iGaming", "Another industry"], start: ["ASAP", "This month", "Just exploring"],
      q1: "Hi! 👋 Tell me about your project — what do you need help with? Pick all that fit.",
      q2: "Nice. Which market is it?", q3: "And when would you like to start?",
      q4: "Got it! Your message is ready below — send it and I’ll reply in Telegram.",
      done: "Done", again: "Start over", online: "online", typing: "typing…", today: "Today",
      pick: "Pick an answer above", pickMany: "Pick one or more above", ready: "Ready to send", cvSoon: "CV link coming soon", and: " and ",
      msg: s => {
        const need = list(s.need.map(x => x.toLowerCase().replace("smm", "SMM").replace("ai", "AI")), " and ");
        const mk = s.market === "iGaming" ? " for an iGaming brand" : " for a brand outside iGaming";
        const st = s.start === "Just exploring" ? " For now I'm just exploring." : ` We'd like to start ${s.start === "ASAP" ? "as soon as possible" : s.start.toLowerCase()}.`;
        return `Hi Olga! I'm looking for help with ${need}${mk}.${st} Can we talk?`;
      }
    },
    uk: {
      need: ["SMM-стратегія", "Запуск каналу", "Контент і AI", "Ком’юніті", "Інфлюенсери", "Консультація"],
      market: ["iGaming", "Інша індустрія"], start: ["Якнайшвидше", "Цього місяця", "Поки придивляюся"],
      q1: "Привіт! 👋 Розкажіть про проєкт — з чим потрібна допомога? Оберіть усе, що підходить.",
      q2: "Чудово. Який ринок?", q3: "І коли хочете почати?",
      q4: "Готово! Повідомлення вже внизу — надішліть його, і я відповім у Telegram.",
      done: "Готово", again: "Спочатку", online: "в мережі", typing: "друкує…", today: "Сьогодні",
      pick: "Оберіть відповідь вище", pickMany: "Оберіть одну або кілька відповідей", ready: "Готово до відправки", cvSoon: "Посилання на CV скоро буде", and: " і ",
      msg: s => {
        const st = s.start === "Поки придивляюся" ? "Поки що просто придивляюся." : `Хочемо почати: ${s.start.toLowerCase()}.`;
        return `Привіт, Ольго! Мене цікавить: ${list(s.need.map((x, i) => i ? x.toLowerCase() : x), " і ")}. Ринок: ${s.market === "iGaming" ? "iGaming" : "інша індустрія"}. ${st} Можемо поговорити?`;
      }
    }
  };
  const L = () => T[window.currentLang] || T.en;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function list(a, and) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + and + a[a.length - 1]; }
  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const TICKS = `<svg viewBox="0 0 16 10"><path d="M1 5.5 4 8.5 10 1.5M6.5 8.5l.8.6L14.5 1.5"/></svg>`;

  const log = $("#ctLog"), kb = $("#ctKb"), field = $("#ctField"), sendBtn = $("#ctSend"), hint = $("#ctHint"), state = $("#ctState"), xBtn = $("#ctClose");
  let gen = 0, started = false, opener = null;
  const add = (cls, html, meta) => {
    const m = document.createElement("div"); m.className = "ct-msg " + cls;
    m.innerHTML = html + (meta ? `<span class="meta">${now()}${cls === "me" ? TICKS : ""}</span>` : "");
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  };
  const composer = (text, ready, href) => {
    field.textContent = text; field.classList.toggle("is-ready", !!ready);
    sendBtn.classList.toggle("is-on", !!ready); sendBtn.setAttribute("aria-disabled", ready ? "false" : "true");
    ready ? sendBtn.setAttribute("href", href) : sendBtn.removeAttribute("href");
  };
  const say = html => { const g = gen; return new Promise((res, rej) => {
    state.textContent = L().typing; state.classList.add("is-typing");
    const d = add("her dots", "<i></i><i></i><i></i>");
    setTimeout(() => { d.remove(); state.textContent = L().online; state.classList.remove("is-typing"); if (g !== gen) return rej(); add("her", html, true); res(); }, 800);
  }); };
  const ask = (opts, multi) => { const g = gen; return new Promise(res => {
    const picked = [], t = L();
    composer(multi ? t.pickMany : t.pick, false);
    kb.innerHTML = opts.map(v => `<button class="ct-chip" type="button" aria-pressed="false">${esc(v)}</button>`).join("") +
      (multi ? `<button class="ct-chip is-go" type="button" data-done disabled>${t.done} →</button>` : "");
    if (opts.length % 2 && !multi) kb.lastElementChild.classList.add("is-wide");
    const doneBtn = kb.querySelector("[data-done]");
    kb.onclick = e => {
      const b = e.target.closest(".ct-chip"); if (!b || g !== gen || b.disabled) return;
      if (multi && !b.hasAttribute("data-done")) {
        const v = b.textContent, i = picked.indexOf(v); i < 0 ? picked.push(v) : picked.splice(i, 1);
        b.setAttribute("aria-pressed", i < 0); doneBtn.disabled = !picked.length;
        composer(picked.length ? list(picked, t.and) : t.pickMany, false); field.classList.toggle("is-ready", !!picked.length);
        return;
      }
      kb.innerHTML = ""; kb.onclick = null;
      const ans = multi ? picked : b.textContent; add("me", esc(multi ? list(picked, t.and) : ans), true); composer("", false); res(ans);
    };
  }); };
  async function flow() {
    gen++; log.innerHTML = `<span class="ct-day">${L().today}</span>`; kb.innerHTML = ""; hint.innerHTML = ""; composer("", false);
    const t = L(), s = {};
    await say(t.q1); s.need = await ask(t.need, true);
    await say(t.q2); s.market = await ask(t.market);
    await say(t.q3); s.start = await ask(t.start);
    const m = t.msg(s);
    await say(t.q4);
    composer(m, true, `${TG}?text=${encodeURIComponent(m)}`);
    hint.innerHTML = `${t.ready} · <button type="button" data-again>${t.again}</button>`;
  }
  hint.addEventListener("click", e => { if (e.target.closest("[data-again]")) flow().catch(() => {}); });

  /* genie: the window pours out of the Chat icon in the dock and is sucked back into it.
     Built from transform + clip-path keyframes (Web Animations): the bottom pinches to the icon's width first, then the whole
     window shrinks and slides into the icon. Only compositor-friendly properties animate. */
  const win = $("#ctWin"), chatIcon = $("[data-openchat]");
  let genieAnim = null;
  function genieFrames() {
    const w = win.getBoundingClientRect(), ic = chatIcon.querySelector(".ct-face").getBoundingClientRect();
    const dx = (ic.left + ic.width / 2) - (w.left + w.width / 2), dy = ic.bottom - w.bottom;
    const k = Math.max(4, ic.width / w.width * 50);                    // half the icon's width, in % of the window
    const sy = Math.max(.06, ic.height / w.height);
    /* the window's outline: a polygon with curved sides. `pinch` pulls the bottom in to the icon's width along an S-curve
       (the top stays wide), `squeeze` then narrows the top too, until the window is an icon-wide ribbon. */
    const N = 12, smooth = t => t * t * (3 - 2 * t);
    const shape = (pinch, squeeze) => {
      const L = [], R = [];
      for (let n = 0; n <= N; n++) {
        const y = n / N, maxIn = 50 - k;
        const inset = maxIn * Math.min(1, smooth(y) * pinch + (1 - smooth(y)) * squeeze);
        L.push(`${inset.toFixed(2)}% ${(y * 100).toFixed(2)}%`); R.unshift(`${(100 - inset).toFixed(2)}% ${(y * 100).toFixed(2)}%`);
      }
      const v = `polygon(${L.concat(R).join(",")})`;
      return { clipPath: v, webkitClipPath: v };
    };
    return [
      { offset: 0,   transform: "translate(0px,0px) scale(1,1)", opacity: 1, ...shape(0, 0), easing: "cubic-bezier(.45,0,.55,1)" },
      { offset: .38, transform: `translate(${dx * .12}px,0px) scale(1,1)`, opacity: 1, ...shape(1, 0), easing: "cubic-bezier(.5,0,.7,.4)" },
      { offset: .72, transform: `translate(${dx * .7}px,${dy * .6}px) scale(1,${(.35 + sy * .65).toFixed(3)})`, opacity: 1, ...shape(1, .7), easing: "cubic-bezier(.3,.6,.4,1)" },
      { offset: 1,   transform: `translate(${dx}px,${dy}px) scale(1,${sy.toFixed(3)})`, opacity: .35, ...shape(1, 1) }
    ];
  }

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const open = from => {
    opener = from; rest(); sweeping = false;
    if (genieAnim) genieAnim.cancel();
    sec.classList.remove("is-closing"); sec.classList.add("is-chat", "is-genie");
    if (!reduced()) { genieAnim = win.animate(genieFrames().reverse().map(f => ({ ...f, offset: 1 - f.offset })), { duration: 720, easing: "linear" });
      genieAnim.onfinish = () => { genieAnim = null; sec.classList.remove("is-genie"); }; }
    else sec.classList.remove("is-genie");
    if (!started) { started = true; flow().catch(() => {}); }
    setTimeout(() => xBtn.focus({ preventScroll: true }), 300);
  };
  // the window is fixed on screen: if the visitor scrolls away from the contact block, it closes
  new IntersectionObserver(es => { if (!es[0].isIntersecting && sec.classList.contains("is-chat")) close(); }, { threshold: .15 }).observe(sec);
  const close = viaKey => {
    if (!sec.classList.contains("is-chat")) return;
    if (genieAnim) genieAnim.cancel();
    const frames = reduced() ? null : genieFrames();
    sec.classList.add("is-closing", "is-genie"); sec.classList.remove("is-chat");     // the dock comes back while the window pours into it
    // order matters: hide the window while transitions are still off, then drop the finished animation, then re-enable transitions
    const done = anim => {
      sec.classList.remove("is-closing");
      if (anim) anim.cancel();
      genieAnim = null;
      requestAnimationFrame(() => { if (!sec.classList.contains("is-chat")) sec.classList.remove("is-genie"); });
      chatIcon.classList.remove("is-bounce"); void chatIcon.offsetWidth; chatIcon.classList.add("is-bounce");
    };
    if (frames) { const anim = genieAnim = win.animate(frames, { duration: 660, easing: "linear", fill: "forwards" }); anim.onfinish = () => { if (genieAnim === anim) done(anim); }; }
    else done(null);
    if (viaKey === true && opener) opener.focus({ preventScroll: true });   // keyboard users get focus back on the icon; a mouse close leaves no tooltip hanging
  };
  $$("[data-openchat]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); sec.classList.contains("is-chat") ? close() : open(a); }));
  xBtn.addEventListener("click", e => close(e.detail === 0));   // detail 0 = Enter/Space on the button
  /* a click anywhere outside the window closes it; composedPath still knows where the click was even if the button it hit has already been replaced */
  document.addEventListener("click", e => { if (!sec.classList.contains("is-chat")) return; if (!e.composedPath().some(n => n.nodeType === 1 && n.matches(".ct-win,[data-openchat]"))) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && sec.classList.contains("is-chat")) close(true); });
  addEventListener("langchange", () => { if (started) { started = false; gen++; log.innerHTML = ""; kb.innerHTML = ""; hint.innerHTML = ""; composer("", false); if (sec.classList.contains("is-chat")) { started = true; flow().catch(() => {}); } } });
})();
