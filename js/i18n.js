/* Simple dictionary-based language switch.
   Every element with data-i18n="key" gets its innerHTML from the active language.
   Add a language: copy the "en" object, translate, add a button in the header. */
window.I18N = {
  en: {
    "nav.talk": "Let’s talk",
    "nav.menu": "Menu",
    "menu.home": "Home",
    "menu.numbers": "Numbers",
    "menu.cases": "Cases",
    "menu.skills": "Skills",
    "menu.contact": "Contact",
    "menu.soon": "More blocks coming soon",
    "hero.first": "OLGA",
    "hero.last": "AKIMOVA",
    "hero.role": "SENIOR <em>SMM</em> SPECIALIST",
    "hero.cta": "Let’s work <br>together",
    "hero.l2": "STRATEGY",
    "hero.l3": "CONTENT",
    "hero.l4": "GROWTH",
    "hero.sr": "Olga Akimova — Senior SMM Specialist",
    "hero.t1": "ROLE",
    "hero.n1": "SENIOR SMM SPECIALIST. <br>6+ YEARS IN SOCIAL. <br>EX-TEAM LEAD.",
    "hero.t2": "iGAMING",
    "hero.n2": "2+ YEARS IN iGAMING. <br>BRAZIL, AFRICA, TURKEY. <br>LAUNCHES FROM ZERO.",
    "hero.t3": "AI",
    "hero.n3": "AI CONTENT &amp; AUTOMATION. <br>VIRTUAL CREATORS. <br>2× OUTPUT, SAME TEAM.",
    "hero.scroll": "SCROLL TO EXPLORE",
    "next.note": "// NEXT BLOCK: NUMBERS — IN PROGRESS",
  },
  uk: {
    "nav.talk": "Поговорімо",
    "nav.menu": "Меню",
    "menu.home": "Головна",
    "menu.numbers": "Цифри",
    "menu.cases": "Кейси",
    "menu.skills": "Навички",
    "menu.contact": "Контакти",
    "menu.soon": "Нові блоки вже в роботі",
    "hero.first": "ОЛЬГА",
    "hero.last": "АКІМОВА",
    "hero.role": "SENIOR <em>SMM</em> SPECIALIST",
    "hero.cta": "Попрацюймо <br>разом",
    "hero.l2": "СТРАТЕГІЯ",
    "hero.l3": "КОНТЕНТ",
    "hero.l4": "РІСТ",
    "hero.sr": "Ольга Акімова — Senior SMM Specialist",
    "hero.t1": "РОЛЬ",
    "hero.n1": "SENIOR SMM SPECIALIST. <br>6+ РОКІВ У СОЦМЕРЕЖАХ. <br>У МИНУЛОМУ — TEAM LEAD.",
    "hero.t2": "iGAMING",
    "hero.n2": "2+ РОКИ В iGAMING. <br>БРАЗИЛІЯ, АФРИКА, ТУРЕЧЧИНА. <br>ЗАПУСКИ З НУЛЯ.",
    "hero.t3": "AI",
    "hero.n3": "AI-КОНТЕНТ І АВТОМАТИЗАЦІЯ. <br>ВІРТУАЛЬНІ КРЕАТОРИ. <br>×2 КОНТЕНТУ БЕЗ НОВИХ ЛЮДЕЙ.",
    "hero.scroll": "ГОРТАЙ ДАЛІ",
    "next.note": "// НАСТУПНИЙ БЛОК: ЦИФРИ — У РОБОТІ",
  }
};

window.setLang = function (lang) {
  const dict = window.I18N[lang] || window.I18N.en;
  document.documentElement.lang = lang === "uk" ? "uk" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = dict[el.dataset.i18n];
    if (typeof v === "string") el.innerHTML = v;
  });
  document.querySelectorAll(".lang__btn").forEach(b => b.classList.toggle("is-active", b.dataset.lang === lang));
  const sw = document.querySelector(".lang");
  if (sw) sw.dataset.active = lang;
  try { localStorage.setItem("akimova-lang", lang); } catch (e) {}
  window.currentLang = lang;
  window.dispatchEvent(new Event("langchange"));
};

(function initLang() {
  let lang = new URLSearchParams(location.search).get("lang");
  if (!lang) { try { lang = localStorage.getItem("akimova-lang"); } catch (e) {} }
  if (!lang) lang = (navigator.language || "").toLowerCase().startsWith("uk") ? "uk" : "en";
  if (!window.I18N[lang]) lang = "en";
  window.setLang(lang);
})();
