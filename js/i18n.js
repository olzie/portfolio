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
    "hero.n1": "<span class=\"hud__dup\">SENIOR SMM SPECIALIST. <br></span>6+ YEARS IN SOCIAL. <br>EX-TEAM LEAD.",
    "hero.t2": "iGAMING",
    "hero.n2": "2+ YEARS IN iGAMING. <br>LATAM, AFRICA, TURKEY. <br>LAUNCHES FROM ZERO.",
    "hero.t3": "AI",
    "hero.n3": "AI CONTENT &amp; AUTOMATION. <br>VIRTUAL CREATORS. <br>2× OUTPUT, SAME TEAM.",
    "hero.scroll": "SCROLL TO EXPLORE",
    "nums.tag": "02 · Numbers",
    "nums.title": "Results, <br>briefly",
    "nums.note": "The iGaming brands are under NDA, <br>so no names here.",
    "nums.big": "Organic views on one video",
    "nums.c1": "Organic reach per month <br>on one project",
    "nums.c2": "Views in the first month <br>of a new page",
    "nums.c3": "Page reach growth <br>in a little over a year",
    "nums.c4": "Page visits growth <br>over the same time",
    "nums.c5": "Instagram followers <br>growth",
    "nums.c6": "Languages I ran content <br>in at the same time",
    "cases.title": "Outside <br>iGaming",
    "cases.note": "2020–2024",
    "cases.brands": "brands",
    "cases.tenders": "tenders",
    "cases.also": "Tenders and <br>smaller projects",
    "cases.did": "What I did",
    "cases.top": "Top 3 by numbers",
    "cases.example": "example",
    "cases.more": "Show all",
    "cases.less": "Show less",
    "cases.rest": "Everything else, newest first",
    "cases.prev": "Previous",
    "cases.next": "Next",
    "cases.open": "Open case",
    "next.note": "// NEXT BLOCK: CONTACT — IN PROGRESS",
    "skills.title": "Skills",
    "skills.note": "What I do, from strategy to reports",
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
    "hero.n1": "<span class=\"hud__dup\">SENIOR SMM SPECIALIST. <br></span>6+ РОКІВ У СОЦМЕРЕЖАХ. <br>У МИНУЛОМУ — TEAM LEAD.",
    "hero.t2": "iGAMING",
    "hero.n2": "2+ РОКИ В iGAMING. <br>LATAM, АФРИКА, ТУРЕЧЧИНА. <br>ЗАПУСКИ З НУЛЯ.",
    "hero.t3": "AI",
    "hero.n3": "AI-КОНТЕНТ І АВТОМАТИЗАЦІЯ. <br>ВІРТУАЛЬНІ КРЕАТОРИ. <br>×2 КОНТЕНТУ БЕЗ НОВИХ ЛЮДЕЙ.",
    "hero.scroll": "ГОРТАЙ ДАЛІ",
    "nums.tag": "02 · Цифри",
    "nums.title": "Коротко <br>про результати",
    "nums.note": "iGaming-бренди під NDA, <br>тому без назв.",
    "nums.big": "Органічних переглядів одного відео",
    "nums.c1": "Органічного охоплення на місяць <br>на одному проєкті",
    "nums.c2": "Переглядів за перший місяць <br>нової сторінки",
    "nums.c3": "Зростання охоплення сторінки <br>трохи більше ніж за рік",
    "nums.c4": "Зростання відвідувань сторінки <br>за той самий час",
    "nums.c5": "Зростання кількості <br>підписників в Instagram",
    "nums.c6": "Мов, якими я вела <br>контент одночасно",
    "cases.title": "Поза <br>iGaming",
    "cases.note": "2020–2024",
    "cases.brands": "брендів",
    "cases.tenders": "тендерів",
    "cases.also": "Тендери й <br>менші проєкти",
    "cases.did": "Що робила",
    "cases.top": "Топ-3 за цифрами",
    "cases.example": "приклад",
    "cases.more": "Показати всі",
    "cases.less": "Згорнути",
    "cases.rest": "Решта, від нових до старих",
    "cases.prev": "Назад",
    "cases.next": "Далі",
    "cases.open": "Відкрити кейс",
    "next.note": "// НАСТУПНИЙ БЛОК: КОНТАКТИ — У РОБОТІ",
    "skills.title": "Навички",
    "skills.note": "Що я роблю, від стратегії до звітів",
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
