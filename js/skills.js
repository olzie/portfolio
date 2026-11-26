/* Skills block: six glass panels stand on a lit stage (the same black studio as the first block).
   Scrolling slides them sideways; the one under the spotlight turns to face you and lights up.

   Performance: the panels move every frame, so nothing on them makes the browser repaint while they
   move. No backdrop blur (there is only black behind them) and no -webkit-box-reflect; the reflection
   is a flipped copy that moves with its panel, and the "lit" glow is a layer whose opacity changes.
   When the panels have settled, the loop stops writing styles. */
(() => {
  const section = document.getElementById("skills");
  if (!section) return;
  const track = section.querySelector(".sk-track"), num = section.querySelector("#skNum"), bar = section.querySelector("#skBar");
  const lang = () => (window.currentLang === "uk" ? "uk" : "en");
  const SK = {
    en: [
      ["Strategy", "Positioning, content systems, channel launches from zero, end-to-end SMM direction.", ["Notion", "Jira", "Trello"]],
      ["AI production", "AI video, virtual creators and content automation. 2× output with the same team.", ["Claude", "Midjourney", "Seedance", "Nano Banana"]],
      ["Content", "Reels, TikTok, carousels and stories, localised for 7 languages at once.", ["Figma", "Canva", "CapCut", "Premiere Pro", "Final Cut Pro", "Lightroom"]],
      ["Community", "Telegram and WhatsApp: VIP chats, promo drops, engagement and retention flows.", ["Telegram", "WhatsApp"]],
      ["Influencers", "Creator collaborations and contract-based ambassadors.", ["TrendHero"]],
      ["Analytics", "KPIs, reporting and growth experiments that feed the next plan.", ["Meta Business Suite", "TrendHero"]]
    ],
    uk: [
      ["Стратегія", "Позиціонування, контент-системи, запуск каналів з нуля, SMM-напрям від початку до кінця.", ["Notion", "Jira", "Trello"]],
      ["AI-продакшн", "AI-відео, віртуальні кріейтори й автоматизація контенту. Удвічі більше контенту тією ж командою.", ["Claude", "Midjourney", "Seedance", "Nano Banana"]],
      ["Контент", "Reels, TikTok, каруселі й сторіс, локалізовані одразу на 7 мов.", ["Figma", "Canva", "CapCut", "Premiere Pro", "Final Cut Pro", "Lightroom"]],
      ["Ком'юніті", "Telegram і WhatsApp: VIP-чати, промо-дропи, залучення й утримання.", ["Telegram", "WhatsApp"]],
      ["Інфлюенсери", "Колаборації з кріейторами та амбасадори за контрактом.", ["TrendHero"]],
      ["Аналітика", "KPI, звіти й експерименти з росту, з яких складається наступний план.", ["Meta Business Suite", "TrendHero"]]
    ]
  };
  const N = SK.en.length, pad = n => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inner = (s, i) => `<div class="sk-n mono"><b>${pad(i + 1)}</b><span>/ ${pad(N)}</span></div>
      <div class="sk-big" aria-hidden="true">${pad(i + 1)}</div>
      <h3 class="sk-t">${s[0]}</h3><p class="sk-d mono">${s[1]}</p>
      <div class="sk-chips">${s[2].map(x => `<span>${x}</span>`).join("")}</div>`;
  let panels = [], mx = 0, sx = 0, cam = 0, last = null, cur = -1;
  function render() {
    track.innerHTML = SK[lang()].map((s, i) => `<article class="sk-panel" data-i="${i}" tabindex="0" aria-label="${pad(i + 1)} ${s[0]}">
      <div class="sk-face"><div class="sk-in">${inner(s, i)}</div></div>
      <div class="sk-refl" aria-hidden="true"><div class="sk-face"><div class="sk-in">${inner(s, i)}</div></div></div>
    </article>`).join("");
    panels = [...track.children];
    last = null; cur = -1;                          // force one full write
  }
  render();
  window.addEventListener("langchange", render);

  /* click a neighbouring panel to bring it under the spotlight: the block is scroll-driven,
     so this scrolls the page to the spot where that panel is the lit one */
  const go = i => {
    i = clamp(i, 0, N - 1);
    const top = section.getBoundingClientRect().top + scrollY, len = section.offsetHeight - innerHeight;
    const y = top + len * (i / (N - 1));
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 }); else scrollTo({ top: y, behavior: "smooth" });
  };
  track.addEventListener("click", e => { const p = e.target.closest(".sk-panel"); if (p) go(+p.dataset.i); });
  track.addEventListener("keydown", e => { const p = e.target.closest(".sk-panel"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(+p.dataset.i); } });
  const progress = () => { const r = section.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
  const near = () => { const r = section.getBoundingClientRect(); return r.bottom > -100 && r.top < innerHeight + 100; };
  const hover = matchMedia("(hover:hover)").matches;
  if (hover) section.addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; });
  section.addEventListener("pointerleave", () => { mx = 0; });

  function frame() {
    if (near()) {
      const goal = progress() * (N - 1);
      cam += (goal - cam) * .14; if (Math.abs(goal - cam) < .0005) cam = goal;
      sx += (mx - sx) * .08; if (Math.abs(mx - sx) < .0005) sx = mx;
      const key = cam.toFixed(4) + "|" + sx.toFixed(4) + "|" + innerWidth;
      if (key !== last) {                           // nothing moved: write nothing
        last = key;
        const pw = panels[0] ? panels[0].offsetWidth : 320, SP = pw * .7;   // neighbours tuck in behind the lit panel
        const c = Math.round(cam);
        panels.forEach((el, i) => {
          const d = i - cam, ad = Math.abs(d);
          const x = d * SP + Math.sign(d) * Math.min(ad, 1) * SP * .18;
          const ry = clamp(-d * 38, -58, 58) + sx * 10, z = -Math.min(ad, 3) * 170;
          el.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
          const op = clamp(1.15 - ad * .38, 0, 1);
          el.style.opacity = op.toFixed(3);
          el.style.visibility = op < .03 ? "hidden" : "visible";   // panels too far to see are not drawn at all
          el.style.zIndex = 100 - Math.round(ad * 10);
        });
        if (c !== cur) {
          cur = c;
          panels.forEach((el, i) => el.classList.toggle("is-on", i === c));
          num.textContent = pad(c + 1);
        }
        bar.style.transform = `scaleX(${(cam / (N - 1)).toFixed(4)})`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
