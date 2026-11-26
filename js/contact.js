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

  /* ---------- magnify + bounce ---------- */
  const magnify = x => apps.forEach(a => {
    const r = a.getBoundingClientRect(), d = Math.abs(x - (r.left + r.width / 2));
    a.style.setProperty("--s", (1 + .55 * Math.max(0, 1 - d / 170) ** 1.6).toFixed(3));
  });
  const rest = () => apps.forEach(a => a.style.setProperty("--s", 1));
  let touched = false;
  dock.addEventListener("pointermove", e => { if (!fine.matches || e.target.closest(".ct-win")) return; touched = true; magnify(e.clientX); });
  dock.addEventListener("pointerleave", () => { if (fine.matches) rest(); });
  dock.addEventListener("pointerenter", () => { if (fine.matches) { touched = true; apps.forEach(a => a.classList.remove("is-tip", "is-lit")); } });
  apps.forEach(a => a.addEventListener("click", () => { a.classList.remove("is-bounce"); void a.offsetWidth; a.classList.add("is-bounce", "is-ran"); }));

  /* ---------- intro sweep: once, the first time the dock is in view ---------- */
  const center = a => { const r = a.getBoundingClientRect(); return r.left + r.width / 2; };
  const tipAt = x => { let best = null, bd = 1e9; apps.forEach(a => { const d = Math.abs(x - center(a)); if (d < bd) { bd = d; best = a; } }); apps.forEach(a => a.classList.toggle("is-tip", a === best)); };
  function sweep() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = dock.getBoundingClientRect(), x0 = r.left + 30, x1 = r.right - 30, xc = center(apps[0]);
    const T1 = 2200, T2 = 700, t0 = performance.now(), tips = wide.matches;
    const step = now => {
      if (touched) return;
      const t = now - t0;
      if (t >= T1 + T2) {
        magnify(xc); if (tips) tipAt(xc); apps[0].classList.add("is-lit");
        setTimeout(() => { if (touched) return; rest(); apps.forEach(a => a.classList.remove("is-tip", "is-lit")); }, 1700);
        return;
      }
      let x;
      if (t < T1) { const k = t / T1; x = x0 + (x1 - x0) * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2); }
      else { const k = (t - T1) / T2; x = x1 + (xc - x1) * (1 - (1 - k) ** 3); }
      magnify(x); if (tips) tipAt(x);
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
      q1: "Hi! Tell me about your project — what do you need help with? Pick all that fit.",
      q2: "Nice. Which market is it?", q3: "And when would you like to start?",
      done: "Done →", again: "Start over", send: "Send in Telegram ↗",
      sum: m => `Got it. Here’s your message — tap to send it to me in Telegram:<br><br><b>“${m}”</b>`,
      and: " and ", cvSoon: "CV link coming soon",
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
      q1: "Привіт! Розкажіть про проєкт — з чим потрібна допомога? Оберіть усе, що підходить.",
      q2: "Чудово. Який ринок?", q3: "І коли хочете почати?",
      done: "Готово →", again: "Спочатку", send: "Надіслати в Telegram ↗",
      sum: m => `Готово. Ось ваше повідомлення — натисніть, щоб надіслати мені в Telegram:<br><br><b>«${m}»</b>`,
      and: " і ", cvSoon: "Посилання на CV скоро буде",
      msg: s => {
        const st = s.start === "Поки придивляюся" ? "Поки що просто придивляюся." : `Хочемо почати: ${s.start.toLowerCase()}.`;
        return `Привіт, Ольго! Мене цікавить: ${list(s.need.map((x, i) => i ? x.toLowerCase() : x), " і ")}. Ринок: ${s.market === "iGaming" ? "iGaming" : "інша індустрія"}. ${st} Можемо поговорити?`;
      }
    }
  };
  const L = () => T[window.currentLang] || T.en;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function list(a, and) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + and + a[a.length - 1]; }

  const log = $("#ctLog"), reply = $("#ctReply"), xBtn = $("#ctClose");
  let gen = 0, started = false, opener = null;
  const add = (cls, html) => { const m = document.createElement("div"); m.className = "ct-msg " + cls; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; };
  const say = html => { const g = gen; return new Promise((res, rej) => { add("her dots", "<i></i><i></i><i></i>"); const d = log.lastChild; setTimeout(() => { d.remove(); if (g !== gen) return rej(); add("her", html); res(); }, 700); }); };
  const ask = (opts, multi) => { const g = gen; return new Promise(res => {
    const picked = [];
    reply.innerHTML = `<div class="ct-chips">${opts.map(v => `<button class="ct-chip" type="button" aria-pressed="false">${esc(v)}</button>`).join("")}${multi ? `<button class="ct-chip is-go" type="button" data-done>${L().done}</button>` : ""}</div>`;
    reply.onclick = e => {
      const b = e.target.closest(".ct-chip"); if (!b || g !== gen) return;
      if (multi && !b.hasAttribute("data-done")) { const v = b.textContent, i = picked.indexOf(v); i < 0 ? picked.push(v) : picked.splice(i, 1); b.setAttribute("aria-pressed", i < 0); return; }
      if (multi && !picked.length) return;
      reply.innerHTML = ""; reply.onclick = null;
      const ans = multi ? picked : b.textContent; add("me", esc(multi ? list(picked, L().and) : ans)); res(ans);
    };
  }); };
  async function flow() {
    gen++; log.innerHTML = ""; reply.innerHTML = ""; reply.onclick = null;
    const t = L(), s = {};
    await say(t.q1); s.need = await ask(t.need, true);
    await say(t.q2); s.market = await ask(t.market);
    await say(t.q3); s.start = await ask(t.start);
    const m = t.msg(s);
    await say(t.sum(esc(m)));
    reply.innerHTML = `<div class="ct-chips"><a class="ct-send" href="${TG}?text=${encodeURIComponent(m)}" target="_blank" rel="noopener">${t.send}</a><button class="ct-chip" type="button" data-again>${t.again}</button></div>`;
    reply.onclick = e => { if (e.target.closest("[data-again]")) flow().catch(() => {}); };
  }
  const open = from => {
    opener = from; sec.classList.add("is-chat"); rest();
    if (!started) { started = true; flow().catch(() => {}); }
    setTimeout(() => xBtn.focus({ preventScroll: true }), 300);
  };
  const close = () => { sec.classList.remove("is-chat"); if (opener) opener.focus({ preventScroll: true }); };
  $$("[data-openchat]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); sec.classList.contains("is-chat") ? close() : open(a); }));
  xBtn.addEventListener("click", close);
  /* a click anywhere outside the window closes it; composedPath still knows where the click was even if the chip it hit has already been replaced */
  sec.addEventListener("click", e => { if (!sec.classList.contains("is-chat")) return; if (!e.composedPath().some(n => n.nodeType === 1 && n.matches(".ct-win,[data-openchat]"))) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && sec.classList.contains("is-chat")) close(); });
  addEventListener("langchange", () => { if (started) { started = false; gen++; log.innerHTML = ""; reply.innerHTML = ""; if (sec.classList.contains("is-chat")) { started = true; flow().catch(() => {}); } } });
})();
