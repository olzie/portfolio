/* Simple dictionary-based language switch.
   Every element with data-i18n="key" gets its innerHTML from the active language.
   Add a language: copy the "en" object, translate, add a button in the header. */
window.I18N = {
  en: {
    "loader.name": "OLHA AKIMOVA",
    "loader.loading": "LOADING",
    "loader.tz": "LOCAL TIME",
    "loader.boot": "BOOTING PORTFOLIO",
    "nav.talk": "Let’s talk",
    "nav.menu": "Menu",
    "menu.home": "Home",
    "menu.numbers": "Numbers",
    "menu.cases": "Cases",
    "menu.skills": "Skills",
    "menu.contact": "Contact",
    "menu.soon": "More blocks coming soon",
    "hero.first": "OLHA",
    "hero.last": "AKIMOVA",
    "hero.role": "SENIOR <em>SMM</em> MANAGER",
    "hero.cta": "Let’s work <br>together",
    "hero.l2": "STRATEGY",
    "hero.l3": "CONTENT",
    "hero.l4": "GROWTH",
    "hero.sr": "Olha Akimova — Senior SMM Manager",
    "hero.n1": "SENIOR SMM MANAGER. <br>5+ YEARS IN SOCIAL. <br>7 MARKETS.",
    "hero.n2": "iGAMING SINCE 2024. <br>LATAM &amp; AFRICA. <br>LAUNCHES FROM ZERO.",
    "hero.n3": "STRATEGY → CONTENT → <br>COMMUNITY → GROWTH. <br>END TO END.",
    "hero.scroll": "SCROLL TO EXPLORE",
    "next.note": "// NEXT BLOCK: NUMBERS — IN PROGRESS",
    "status": ["INIT_ASSETS", "LOADING_CAT", "CALIBRATING_REACH", "SYNCING_MARKETS", "READY"]
  },
  uk: {
    "loader.name": "ОЛЬГА АКІМОВА",
    "loader.loading": "ЗАВАНТАЖЕННЯ",
    "loader.tz": "ЛОКАЛЬНИЙ ЧАС",
    "loader.boot": "ЗАПУСК ПОРТФОЛІО",
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
    "hero.role": "SENIOR <em>SMM</em> MANAGER",
    "hero.cta": "Попрацюймо <br>разом",
    "hero.l2": "СТРАТЕГІЯ",
    "hero.l3": "КОНТЕНТ",
    "hero.l4": "РІСТ",
    "hero.sr": "Ольга Акімова — Senior SMM Manager",
    "hero.n1": "SENIOR SMM MANAGER. <br>5+ РОКІВ У СОЦМЕРЕЖАХ. <br>7 РИНКІВ.",
    "hero.n2": "iGAMING З 2024 РОКУ. <br>LATAM І АФРИКА. <br>ЗАПУСКИ З НУЛЯ.",
    "hero.n3": "СТРАТЕГІЯ → КОНТЕНТ → <br>КОМ’ЮНІТІ → РІСТ. <br>ВІД ІДЕЇ ДО РЕЗУЛЬТАТУ.",
    "hero.scroll": "ГОРТАЙ ДАЛІ",
    "next.note": "// НАСТУПНИЙ БЛОК: ЦИФРИ — У РОБОТІ",
    "status": ["ІНІЦІАЛІЗАЦІЯ", "ЗАВАНТАЖУЮ КОТА", "РАХУЮ ОХОПЛЕННЯ", "СИНХРОНІЗУЮ РИНКИ", "ГОТОВО"]
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
};

(function initLang() {
  let lang = new URLSearchParams(location.search).get("lang");
  if (!lang) { try { lang = localStorage.getItem("akimova-lang"); } catch (e) {} }
  if (!lang) lang = (navigator.language || "").toLowerCase().startsWith("uk") ? "uk" : "en";
  if (!window.I18N[lang]) lang = "en";
  window.setLang(lang);
})();
