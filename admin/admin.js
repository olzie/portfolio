/* itsolga.com admin. Stats and leads come from the Worker (/api/admin/*, behind Cloudflare Access).
   Cases are edited in js/cases.js in the GitHub repo and published as one commit through the GitHub API,
   with a token that stays in this browser. */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = localStorage.getItem("olz_api") || "";            // "" = same site; a full URL only for local testing
  const REPO = "olzie/portfolio", BRANCH = "main";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = n => (n ?? 0).toLocaleString("ru-RU");
  const toast = msg => { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 3200); };
  const showErr = msg => { const e = $("#err"); e.textContent = msg; e.hidden = !msg; };

  /* ---------- tabs ---------- */
  const go = id => {
    $$(".tab").forEach(b => b.classList.toggle("is-on", b.dataset.tab === id));
    $$(".pane").forEach(p => p.classList.toggle("is-on", p.id === id));
    history.replaceState(null, "", "#" + id);
    if (id === "leads") loadLeads();
    if ((id === "overview" || id === "engage") && last) draw(last);   // charts redraw at the width they now have
    if (id === "cases") initCases();
  };
  $$(".tab").forEach(b => b.addEventListener("click", () => go(b.dataset.tab)));

  /* ---------- names ---------- */
  const caseName = id => id === "tenders" ? "Тендери й дрібні задачі" : ((window.CASES || []).find(c => c.id === id) || {}).name || id;
  const BLOCK = { hero: "Первый экран", numbers: "Цифры", cases: "Кейсы", skills: "Навыки", contact: "Контакты" };
  const CLICK = {
    cta_mail: "Синяя кнопка → почта", mail: "Почта в доке", call: "Запись на звонок", linkedin: "LinkedIn", telegram: "Telegram",
    cv_open: "Открыли CV", cv_download_en: "Скачали CV (EN)", cv_download_ua: "Скачали CV (UA)", cv_lang_en: "CV: переключили на EN", cv_lang_ua: "CV: переключили на UA",
    chat_open: "Открыли чат", chat_send: "Отправили бриф в Telegram", nav_talk: "Кнопка Let's talk в шапке", lang_en: "Сайт на EN", lang_uk: "Сайт на UA"
  };
  const COUNTRY = new Intl.DisplayNames(["ru"], { type: "region" });
  const country = c => { try { return COUNTRY.of(c); } catch (e) { return c; } };

  /* ---------- tooltip ---------- */
  const tip = $("#tip");
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + "px"; tip.style.top = (y - r.height - 12) + "px"; };
  const hideTip = () => { tip.hidden = true; };

  /* ---------- charts: one series, brand blue ---------- */
  function rows(el, list, { label, value, max, extra } = {}) {
    if (!list.length) { el.innerHTML = `<p class="empty">Пока нет данных</p>`; return; }
    const m = max || Math.max(...list.map(value), 1);
    el.innerHTML = `<div class="rows">${list.map(x => `<div class="r"><span title="${esc(label(x))}">${esc(label(x))}</span><div class="track"><div class="fill" style="width:${(value(x) / m * 100).toFixed(1)}%"></div></div><span class="v">${extra ? extra(x) : `<b>${fmt(value(x))}</b>`}</span></div>`).join("")}</div>`;
  }
  function columns(el, data, { label, value, title }) {
    if (!data.length) { el.innerHTML = `<p class="empty">Пока нет данных</p>`; return; }
    const W = Math.max(320, Math.round(el.clientWidth || 600)), H = W < 700 ? 220 : 240, pl = 44, pb = 28, pt = 10, n = data.length;   // drawn at the card's real width, so the axis text keeps its size
    const max = Math.max(...data.map(value), 1), nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
    const band = (W - pl) / n, bw = Math.min(24, band * .7);
    const y = v => H - pb - (v / nice) * (H - pb - pt);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`;
    for (let i = 0; i <= 4; i++) { const v = nice / 4 * i, yy = y(v); s += `<line class="grid" x1="${pl}" x2="${W}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl - 8}" y="${yy + 3}" text-anchor="end">${fmt(Math.round(v))}</text>`; }
    const every = Math.ceil(n / 10);
    data.forEach((d, i) => {
      const cx = pl + band * i + band / 2, v = value(d), top = y(v), h = H - pb - top;
      if (h > 0) s += `<path class="col" data-i="${i}" d="M${cx - bw / 2},${H - pb} V${top + Math.min(4, h)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - pb} Z"/>`;
      s += `<rect class="hit" data-i="${i}" x="${pl + band * i}" y="${pt}" width="${band}" height="${H - pb - pt}"/>`;
      if (i % every === 0) s += `<text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(label(d, true))}</text>`;
    });
    el.innerHTML = s + "</svg>";
    el.querySelectorAll(".hit").forEach(r => {
      const i = +r.dataset.i, col = el.querySelector(`.col[data-i="${i}"]`);
      r.addEventListener("mousemove", e => { col && col.classList.add("is-h"); showTip(`${esc(label(data[i]))}: <b>${fmt(value(data[i]))}</b>`, e.clientX, e.clientY); });
      r.addEventListener("mouseleave", () => { col && col.classList.remove("is-h"); hideTip(); });
    });
  }

  /* ---------- stats ---------- */
  async function api(path, opt) {
    const r = await fetch(API + path, { ...opt });
    if (r.status === 403) throw new Error("Нет доступа. Войди через Cloudflare Access заново (обнови страницу).");
    if (!r.ok) throw new Error("Сервер статистики не ответил (" + r.status + "). Проверь, что Worker подключён.");
    return r.json();
  }
  async function loadStats() {
    const days = +$("#period").value;
    let s;
    try { s = await api("/api/admin/stats?days=" + days); showErr(""); }
    catch (e) { showErr(e.message); return; }
    last = s; draw(s);
  }
  let last = null;
  function draw(s) {
    const days = s.days;
    const clicks = Object.fromEntries(s.clicks.map(c => [c.k, c]));
    const cv = ((clicks.cv_download_en || {}).n || 0) + ((clicks.cv_download_ua || {}).n || 0);
    const caseOpens = s.cases.reduce((a, c) => a + c.n, 0);
    const delta = s.prevVisits ? Math.round((s.visits - s.prevVisits) / s.prevVisits * 100) : null;
    $("#tiles").innerHTML = [
      ["Визиты", fmt(s.visits), delta === null ? "" : `<i class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "+" : ""}${delta}% к прошлым ${days} дн.</i>`],
      ["Заявки из чата", fmt(s.leads), ""],
      ["Скачали CV", fmt(cv), `<i>открыли ${fmt((clicks.cv_open || {}).n || 0)}</i>`],
      ["Открыли кейсы", fmt(caseOpens), ""]
    ].map(([a, b, c]) => `<div class="tile"><small>${a}</small><b>${b}</b>${c}</div>`).join("");
    // every day of the period, zeros included, so gaps are visible
    const map = Object.fromEntries(s.perDay.map(d => [d.d, d.n])), daysArr = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); daysArr.push({ d, n: map[d] || 0 }); }
    const dm = d => new Date(d + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
    columns($("#perDay"), daysArr, { label: (x) => dm(x.d), value: x => x.n, title: "Визиты по дням" });
    rows($("#refs"), s.refs, { label: x => x.k === "(direct)" ? "Напрямую / приложения" : x.k, value: x => x.n });
    rows($("#utms"), s.utms, { label: x => x.k + (x.c ? " · " + x.c : ""), value: x => x.n });
    rows($("#countries"), s.countries, { label: x => country(x.k), value: x => x.n });
    rows($("#devices"), s.devices.filter(x => x.k), { label: x => ({ mobile: "Телефон", tablet: "Планшет", desktop: "Компьютер" }[x.k] || x.k), value: x => x.n });
    rows($("#langs"), s.langs.filter(x => x.k), { label: x => ({ en: "Английский", uk: "Украинский" }[x.k] || x.k), value: x => x.n });
    // funnel: share of visits that reached each block, with the drop from the block above
    const base = Math.max(s.visits, 1);
    rows($("#funnel"), s.funnel, {
      label: x => BLOCK[x.block] || x.block, value: x => x.reached, max: base,
      extra: (x) => { const i = s.funnel.indexOf(x), pct = Math.round(x.reached / base * 100), prev = i ? s.funnel[i - 1].reached : 0, drop = i && prev ? Math.round((prev - x.reached) / prev * 100) : 0; return `<b>${pct}%</b> · ${fmt(x.reached)}${drop > 0 ? `<span class="drop">−${drop}%</span>` : ""}`; }
    });
    rows($("#dwell"), s.funnel, { label: x => BLOCK[x.block] || x.block, value: x => x.avgSeconds, extra: x => `<b>${x.avgSeconds} с</b>` });
    const dep = Object.fromEntries(s.depth.map(d => [d.b, d.n])), depArr = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(b => ({ b, n: dep[b] || 0 }));
    // "reached at least X%": sum of the buckets from X up
    const atLeast = depArr.map((d, i) => ({ b: d.b, n: depArr.slice(i).reduce((a, x) => a + x.n, 0) }));
    columns($("#depth"), atLeast, { label: (x, short) => short ? x.b + "%" : `дошли до ${x.b}%`, value: x => x.n, title: "Глубина прокрутки" });
    rows($("#clickList"), s.clicks, { label: x => CLICK[x.k] || x.k, value: x => x.n, extra: x => `<b>${fmt(x.n)}</b> · ${fmt(x.v)} виз.` });
    rows($("#caseList"), s.cases, { label: x => caseName(x.k), value: x => x.n });
  }
  $("#period").addEventListener("change", loadStats);

  /* ---------- leads ---------- */
  const ST = { new: "Новая", talking: "В работе", won: "Договорились", lost: "Не сложилось" };
  async function loadLeads() {
    let list;
    try { list = await api("/api/admin/leads"); showErr(""); } catch (e) { showErr(e.message); return; }
    const fresh = list.filter(l => l.status === "new").length;
    $("#leadBadge").hidden = !fresh; $("#leadBadge").textContent = fresh;
    if (!list.length) { $("#leadList").innerHTML = `<div class="card"><p class="empty">Пока заявок нет.</p></div>`; return; }
    $("#leadList").innerHTML = list.map(l => `
      <div class="card lead" data-id="${l.id}">
        <div class="lead__h"><span class="when">${new Date(l.ts * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          ${l.country ? `<span>${esc(country(l.country))}</span>` : ""}<span>${l.lang === "uk" ? "UA" : "EN"}</span>${l.device ? `<span>${esc(l.device)}</span>` : ""}
          ${l.ref || l.utm_source ? `<span>из ${esc(l.utm_source || l.ref)}</span>` : ""}
          ${l.sent ? `<span class="tag ok">Отправил в Telegram</span>` : `<span class="tag">Не отправил</span>`}</div>
        <div class="lead__b"><div><small>Что нужно</small>${esc(l.need)}</div><div><small>Рынок</small>${esc(l.market)}</div><div><small>Когда</small>${esc(l.start)}</div></div>
        <p class="lead__msg">${esc(l.message)}</p>
        <div class="lead__f">
          <select data-k="status">${Object.entries(ST).map(([k, v]) => `<option value="${k}"${l.status === k ? " selected" : ""}>${v}</option>`).join("")}</select>
          <textarea data-k="note" placeholder="Заметка">${esc(l.note)}</textarea>
          <button class="btn btn--danger btn--sm" data-del>Удалить</button>
        </div>
      </div>`).join("");
  }
  $("#leadList").addEventListener("change", async e => {
    const card = e.target.closest(".lead"); if (!card || !e.target.dataset.k) return;
    try { await api("/api/admin/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: +card.dataset.id, [e.target.dataset.k]: e.target.value }) }); toast("Сохранено"); }
    catch (err) { toast(err.message); }
  });
  $("#leadList").addEventListener("click", async e => {
    if (!e.target.matches("[data-del]")) return;
    const card = e.target.closest(".lead");
    if (!confirm("Удалить заявку насовсем?")) return;
    await api("/api/admin/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: +card.dataset.id, delete: true }) });
    card.remove();
  });

  /* ---------- cases: GitHub ---------- */
  let token = localStorage.getItem("olz_gh") || "";
  const gh = async (path, opt = {}) => {
    const r = await fetch("https://api.github.com/repos/" + REPO + path, { ...opt, headers: { authorization: "Bearer " + token, accept: "application/vnd.github+json", ...(opt.body ? { "content-type": "application/json" } : {}) } });
    if (r.status === 401) throw new Error("GitHub не принял токен. Проверь его или создай новый.");
    if (r.status === 404) throw new Error("GitHub не видит репозиторий. У токена должен быть доступ к olzie/portfolio.");
    if (!r.ok) throw new Error("GitHub ответил ошибкой " + r.status);
    return r.json();
  };
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
  const b64enc = str => { const b = new TextEncoder().encode(str); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
  const bytesB64 = b => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };

  let D = null, files = {}, removed = new Set(), sel = null, started = false, dirty = false;
  const setDirty = v => { dirty = v; $("#publish").disabled = !v; $("#dirty").textContent = v ? "Есть неопубликованные изменения" : ""; };
  addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  async function initCases() {
    $("#ghForget").hidden = !token;
    if (!token || started) return;
    started = true;
    try {
      const f = await gh(`/contents/js/cases.js?ref=${BRANCH}`);
      const w = {}; new Function("window", b64dec(f.content))(w);           // the site's own data file, from its own repo
      D = { cases: w.CASES, tenders: w.CASES_TENDERS, small: w.CASES_SMALL_ORDER || [], shots: w.CASES_SHOTS || {}, ar: w.LOGO_AR || {} };
      $("#ghCard").hidden = true; $("#caseEditor").hidden = false;
      renderList();
    } catch (e) { started = false; toast(e.message); $("#ghCard").hidden = false; }
  }
  $("#ghSave").addEventListener("click", () => { const v = $("#ghToken").value.trim(); if (!v) return; token = v; localStorage.setItem("olz_gh", v); $("#ghToken").value = ""; initCases(); });
  $("#ghForget").addEventListener("click", () => { localStorage.removeItem("olz_gh"); token = ""; started = false; $("#ghForget").hidden = true; $("#caseEditor").hidden = true; $("#ghCard").hidden = false; });

  const logoSrc = c => (files[`logo:${c.id}`] && files[`logo:${c.id}`].url) || (c.logo ? "../" + c.logo : "");
  const shotSrc = (id, s) => (s.url) || `../assets/cases/shots/${s[0]}`;
  function renderList() {
    const order = [...D.cases].sort((a, b) => (a.top || 9) - (b.top || 9) || (b.y || 0) - (a.y || 0));
    $("#clist").innerHTML = order.map(c => `<button class="ci${sel === c.id ? " is-on" : ""}" data-id="${esc(c.id)}"><span class="lg" style="background:${esc(c.color)}">${logoSrc(c) ? `<img src="${esc(logoSrc(c))}" alt="">` : `<i>${esc(c.name.slice(0, 2))}</i>`}</span><span><b>${esc(c.name)}</b><small>${esc((c.en || {}).meta || "")}</small></span>${c.top ? `<span class="mk">Топ ${c.top}</span>` : c.small ? `<span class="mk">в строке</span>` : ""}</button>`).join("")
      + `<button class="ci${sel === "__tenders" ? " is-on" : ""}" data-id="__tenders"><span class="lg" style="background:${esc(D.tenders.color)}"><i>T</i></span><span><b>${esc(D.tenders.en.name)}</b><small>${D.tenders.items.length} проектов</small></span></button>`;
  }
  $("#clist").addEventListener("click", e => { const b = e.target.closest(".ci"); if (!b) return; sel = b.dataset.id; renderList(); sel === "__tenders" ? renderTenders() : renderForm(); });

  const field = (label, path, val, cls = "", type = "text", extra = "") => `<label class="${cls}">${label}${type === "textarea" ? `<textarea data-p="${path}" ${extra}>${esc(val)}</textarea>` : `<input type="${type}" data-p="${path}" value="${esc(val)}" ${extra}>`}</label>`;
  function langBlock(c, L) {
    const d = c[L] || (c[L] = { meta: "", line: "", body: "", key: null, stats: [], did: [] });
    return `<div class="f">
      ${field("Мета: индустрия · годы · страна", `${L}.meta`, d.meta, "w4")}
      ${field("Строка в списке", `${L}.line`, d.line, "w4")}
      ${field("Описание", `${L}.body`, d.body, "w4", "textarea")}
      ${field("Главная цифра", `${L}.key.0`, d.key ? d.key[0] : "", "", "text", 'placeholder="1M"')}
      ${field("Подпись к ней", `${L}.key.1`, d.key ? d.key[1] : "", "w2", "text", 'placeholder="reach in peak season"')}
      <span></span>
      ${field("Что делала (теги через запятую)", `${L}.did`, (d.did || []).join(", "), "w4")}
    </div>
    <h3>Статистика в окне кейса</h3>
    <div class="stats">${(d.stats || []).map((s, i) => `<div class="s"><input data-p="${L}.stats.${i}.0" value="${esc(s[0])}" placeholder="208K"><input data-p="${L}.stats.${i}.1" value="${esc(s[1])}" placeholder="monthly reach"><button class="btn btn--ghost btn--sm" data-rmstat="${L}.${i}">✕</button></div>`).join("")}</div>
    <div style="margin-top:8px"><button class="btn btn--ghost btn--sm" data-addstat="${L}">+ Цифра</button></div>`;
  }
  let lang = "en";
  function renderForm() {
    const c = D.cases.find(x => x.id === sel); if (!c) return;
    const shots = D.shots[c.id] || [];
    $("#form").innerHTML = `
      <h3>Основное</h3>
      <div class="f">
        ${field("Название", "name", c.name, "w2")}
        <label>Цвет плитки<input type="color" data-p="color" value="${esc(c.color || "#13204a")}"></label>
        ${field("Год (для сортировки)", "y", c.y, "", "number", 'step="0.1"')}
        <label>Место<select data-p="top"><option value="">Обычный список</option>${[1, 2, 3].map(n => `<option value="${n}"${c.top === n ? " selected" : ""}>Топ ${n}</option>`).join("")}</select></label>
        <label class="chk"><input type="checkbox" data-p="small" ${c.small ? "checked" : ""}>Только в бегущей строке</label>
        <label class="w2">Логотип (белый SVG)<div class="logo-prev" style="background:${esc(c.color)}">${logoSrc(c) ? `<img src="${esc(logoSrc(c))}" alt="">` : `<span class="hint">нет</span>`}</div><input type="file" accept=".svg,image/svg+xml" data-logo><span class="hint">Без логотипа плитка покажет название текстом.</span></label>
      </div>
      <div class="lt"><button class="btn btn--sm${lang === "en" ? " btn--blue" : ""}" data-lang="en">EN</button><button class="btn btn--sm${lang === "uk" ? " btn--blue" : ""}" data-lang="uk">UA</button></div>
      ${langBlock(c, lang)}
      <h3>Работы (картинки в окне кейса)</h3>
      <div class="shots">${shots.map((s, i) => `<div class="shot"><img src="${esc(shotSrc(c.id, s))}" alt="">${s.url ? `<span class="new">новая</span>` : ""}<div class="ctl"><button data-mv="${i}:-1" title="Левее">‹</button><button data-rmshot="${i}" title="Убрать">✕</button><button data-mv="${i}:1" title="Правее">›</button></div></div>`).join("")}
        <label class="addshot">+ Картинка<br>JPG, PNG, WEBP<input type="file" accept="image/*" multiple hidden data-shots></label></div>
      <p class="hint">Картинки сжимаются в WEBP до 800 px по длинной стороне прямо здесь, перед загрузкой.</p>
      <h3>Опасная зона</h3>
      <button class="btn btn--danger btn--sm" data-delcase>Удалить кейс</button>`;
  }
  function renderTenders() {
    const T = D.tenders;
    $("#form").innerHTML = `
      <h3>Окно «Тендери й дрібні задачі»</h3>
      <div class="f">
        ${field("Название EN", "t.en.name", T.en.name, "w2")}${field("Название UA", "t.uk.name", T.uk.name, "w2")}
        ${field("Мета EN", "t.en.meta", T.en.meta, "w2")}${field("Мета UA", "t.uk.meta", T.uk.meta, "w2")}
        ${field("Строка EN", "t.en.line", T.en.line, "w4")}${field("Строка UA", "t.uk.line", T.uk.line, "w4")}
      </div>
      <h3>Проекты</h3>
      ${T.items.map((x, i) => `<div class="f" style="margin-bottom:10px">${field("Бренд", `ti.${i}.name`, x.name)}${field("Что делала EN", `ti.${i}.en`, x.en)}${field("Что делала UA", `ti.${i}.uk`, x.uk)}<label class="chk"><button class="btn btn--ghost btn--sm" data-rmtender="${i}">Убрать</button></label></div>`).join("")}
      <button class="btn btn--ghost btn--sm" data-addtender>+ Проект</button>`;
  }

  // writes from the form into the data
  const setPath = (o, path, v) => { const k = path.split("."); let x = o; for (let i = 0; i < k.length - 1; i++) { if (x[k[i]] == null) x[k[i]] = /^\d+$/.test(k[i + 1]) ? [] : {}; x = x[k[i]]; } x[k[k.length - 1]] = v; };
  $("#form").addEventListener("input", e => {
    const p = e.target.dataset.p; if (!p) return;
    if (sel === "__tenders") {
      if (p.startsWith("ti.")) { const [, i, k] = p.split("."); D.tenders.items[+i][k] = e.target.value; }
      else setPath(D.tenders, p.slice(2), e.target.value);
      setDirty(true); return;
    }
    const c = D.cases.find(x => x.id === sel);
    let v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (p === "y") v = parseFloat(v) || 0;
    if (p === "top") { v = v ? +v : undefined; D.cases.forEach(x => { if (v && x !== c && x.top === v) delete x.top; }); }
    if (/\.did$/.test(p)) v = v.split(",").map(s => s.trim()).filter(Boolean);
    if (/\.key\.\d$/.test(p)) { const L = p.split(".")[0]; c[L].key = c[L].key || ["", ""]; c[L].key[+p.slice(-1)] = v; if (!c[L].key[0] && !c[L].key[1]) c[L].key = null; setDirty(true); return; }
    if (p === "small") { if (v) { c.small = true; if (!D.small.includes(c.id)) D.small.push(c.id); } else { delete c.small; D.small = D.small.filter(x => x !== c.id); } setDirty(true); return; }
    if (v === undefined) { delete c[p]; } else setPath(c, p, v);
    if (p === "name" || p === "color" || p === "top") renderList();
    setDirty(true);
  });
  $("#form").addEventListener("click", async e => {
    const t = e.target;
    if (t.dataset.lang) { lang = t.dataset.lang; renderForm(); return; }
    if (t.matches("[data-addtender]")) { D.tenders.items.push({ id: "t" + Date.now().toString(36), name: "", logo: null, en: "", uk: "" }); renderTenders(); setDirty(true); return; }
    if (t.dataset.rmtender) { D.tenders.items.splice(+t.dataset.rmtender, 1); renderTenders(); setDirty(true); return; }
    const c = D.cases.find(x => x.id === sel); if (!c) return;
    if (t.dataset.addstat) { const L = t.dataset.addstat; (c[L].stats = c[L].stats || []).push(["", ""]); renderForm(); setDirty(true); }
    if (t.dataset.rmstat) { const [L, i] = t.dataset.rmstat.split("."); c[L].stats.splice(+i, 1); renderForm(); setDirty(true); }
    if (t.dataset.rmshot) { const arr = D.shots[c.id], [s] = arr.splice(+t.dataset.rmshot, 1); if (!s.url) removed.add("assets/cases/shots/" + s[0]); else delete files["shot:" + s[0]]; if (!arr.length) delete D.shots[c.id]; renderForm(); setDirty(true); }
    if (t.dataset.mv) { const [i, d] = t.dataset.mv.split(":").map(Number), arr = D.shots[c.id], j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; renderForm(); setDirty(true); }
    if (t.matches("[data-delcase]")) {
      if (!confirm(`Удалить кейс «${c.name}» с сайта? Его картинки и логотип тоже удалятся при публикации.`)) return;
      (D.shots[c.id] || []).forEach(s => { if (!s.url) removed.add("assets/cases/shots/" + s[0]); });
      if (c.logo && !files["logo:" + c.id]) removed.add(c.logo.split("?")[0]);
      delete D.shots[c.id]; delete D.ar[c.id]; D.small = D.small.filter(x => x !== c.id);
      D.cases = D.cases.filter(x => x !== c); sel = null; renderList(); $("#form").innerHTML = `<p class="sub">Выбери кейс слева.</p>`; setDirty(true);
    }
  });
  $("#form").addEventListener("change", async e => {
    const c = D.cases.find(x => x.id === sel); if (!c) return;
    if (e.target.matches("[data-logo]")) {
      const f = e.target.files[0]; if (!f) return;
      const txt = await f.text();
      if (!/<svg[\s>]/i.test(txt) || /<script|on\w+\s*=/i.test(txt)) { toast("Нужен SVG без скриптов"); return; }
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml").documentElement;
      const vb = (doc.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
      const w = vb.length === 4 ? vb[2] : parseFloat(doc.getAttribute("width")), h = vb.length === 4 ? vb[3] : parseFloat(doc.getAttribute("height"));
      if (w && h) D.ar[c.id] = Math.round(w / h * 1000) / 1000;
      const v = Date.now().toString(36);
      files["logo:" + c.id] = { path: `assets/cases/logos/${c.id}.svg`, b64: b64enc(txt), url: URL.createObjectURL(new Blob([txt], { type: "image/svg+xml" })) };
      removed.delete(`assets/cases/logos/${c.id}.svg`);
      c.logo = `assets/cases/logos/${c.id}.svg?v=${v}`;
      renderForm(); renderList(); setDirty(true);
    }
    if (e.target.matches("[data-shots]")) {
      const arr = D.shots[c.id] || (D.shots[c.id] = []);
      for (const f of e.target.files) {
        try {
          const { blob, w, h } = await toWebp(f);
          const n = nextShotName(c.id), b = new Uint8Array(await blob.arrayBuffer());
          files["shot:" + n] = { path: "assets/cases/shots/" + n, b64: bytesB64(b) };
          const s = [n, w, h]; s.url = URL.createObjectURL(blob); arr.push(s);
          removed.delete("assets/cases/shots/" + n);
        } catch (err) { toast("Не получилось прочитать " + f.name); }
      }
      renderForm(); setDirty(true);
    }
  });
  const nextShotName = id => { let k = 1; const used = new Set(Object.values(D.shots).flat().map(s => s[0])); while (used.has(`${id}-${k}.webp`) && !removed.has(`assets/cases/shots/${id}-${k}.webp`)) k++; return `${id}-${k}.webp`; };
  async function toWebp(file) {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 800 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise(r => cv.toBlob(r, "image/webp", .84));
    if (!blob || blob.type !== "image/webp") throw new Error("webp");
    return { blob, w, h };
  }

  $("#addCase").addEventListener("click", () => {
    const name = prompt("Название бренда"); if (!name) return;
    let id = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "case";
    while (D.cases.some(c => c.id === id)) id += "x";
    const blank = { meta: "", line: "", body: "", key: null, stats: [], did: [] };
    D.cases.push({ id, name, logo: null, color: "#13204a", y: new Date().getFullYear(), en: { ...blank }, uk: { ...blank, stats: [], did: [] } });
    sel = id; renderList(); renderForm(); setDirty(true);
  });

  /* ---------- publish: one commit with cases.js, new pictures, removals and a version bump ---------- */
  function caseFile() {
    const clean = c => { const o = {}; for (const [k, v] of Object.entries(c)) if (v !== undefined) o[k] = v; return o; };
    const shots = {}; for (const [k, arr] of Object.entries(D.shots)) shots[k] = arr.map(s => [s[0], s[1], s[2]]);
    return `/* Cases outside iGaming. Every case from the portfolio, in both languages. Edited in /admin: changes here by hand
   are fine, the admin page reads this file back.
   logo: white SVG of the brand's own logo, shown on the brand colour (null = name set in type).
   small: shown in the running line, not in the list. y: when (bigger = newer). top: place in the top 3. key: the number shown in the list (null = none).
   stats: numbers that roll in like slot reels when a case opens. did: what I did, shown as tags. */
const caseLogo = n => \`assets/cases/logos/\${n}.svg?v=2\`;
window.CASES = ${JSON.stringify(D.cases.map(clean), null, 2)};

/* pitches and short jobs inside bigger accounts: one window, like the "Other" pages in Notion */
window.CASES_TENDERS = ${JSON.stringify(D.tenders, null, 2)};
/* small cases follow the tenders in the running line, in this order */
window.CASES_SMALL_ORDER = ${JSON.stringify(D.small)};

/* work examples: [file, width, height], shown in the case view */
window.CASES_SHOTS = ${JSON.stringify(shots, null, 1)};

// logo proportions (width / height of each SVG), so every logo can be given the same visual weight
window.LOGO_AR = ${JSON.stringify(D.ar)};
`;
  }
  $("#publish").addEventListener("click", async () => {
    const btn = $("#publish"); btn.disabled = true; btn.textContent = "Публикую…";
    try {
      const ref = await gh(`/git/ref/heads/${BRANCH}`), head = ref.object.sha;
      const commit = await gh(`/git/commits/${head}`);
      const idx = await gh(`/contents/index.html?ref=${BRANCH}`);
      // the site loads every script and style with ?v=…; a new value makes browsers fetch the new cases at once
      const html = b64dec(idx.content), m = html.match(/js\/cases\.js\?v=([\w-]+)/);
      const ver = new Date().toISOString().slice(0, 16).replace(/\D/g, "");
      const newHtml = m ? html.split("?v=" + m[1]).join("?v=" + ver) : html;
      const tree = [{ path: "js/cases.js", mode: "100644", type: "blob", content: caseFile() }];
      if (newHtml !== html) tree.push({ path: "index.html", mode: "100644", type: "blob", content: newHtml });
      for (const f of Object.values(files)) {
        const blob = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: f.b64, encoding: "base64" }) });
        tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      for (const p of removed) tree.push({ path: p, mode: "100644", type: "blob", sha: null });
      const t = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
      const c = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "Cases: update from admin", tree: t.sha, parents: [head] }) });
      await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: c.sha }) });
      files = {}; removed = new Set();
      Object.values(D.shots).forEach(a => a.forEach(s => { delete s.url; }));
      setDirty(false); toast("Опубликовано. Сайт обновится примерно через минуту.");
      if (sel && sel !== "__tenders") renderForm();
    } catch (e) {
      toast(/422|409/.test(e.message) ? "Репозиторий изменился, пока ты редактировала. Обнови страницу и повтори." : e.message);
      setDirty(true);
    } finally { btn.textContent = "Опубликовать на сайте"; btn.disabled = !dirty; }
  });

  /* ---------- start ---------- */
  loadStats();
  api("/api/admin/leads").then(l => { const n = l.filter(x => x.status === "new").length; $("#leadBadge").hidden = !n; $("#leadBadge").textContent = n; }).catch(() => {});
  const first = location.hash.slice(1);
  if (first && $("#" + first)) go(first);
})();
