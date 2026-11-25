# Olga Akimova — SMM portfolio

Personal portfolio landing of **Olga Akimova**, Senior SMM Manager.

Plain HTML/CSS/JS, no build step. Hosted on GitHub Pages.

## Stack
- [GSAP 3](https://gsap.com) + ScrollTrigger: scroll scenes
- [Lenis](https://github.com/darkroomengineering/lenis): smooth scroll
- Fonts (self-hosted): Unbounded, JetBrains Mono, Manrope

## Structure
```
index.html        page markup
css/style.css     styles and tokens (colors at the top in :root)
js/i18n.js        texts for every language (EN / UA)
js/main.js        loader, header, menu, hero scroll scene
assets/cat/       8 turntable frames of the mascot (f0 = front)
assets/fonts/     woff2 fonts, latin + cyrillic
vendor/           GSAP, ScrollTrigger, Lenis
```

## Blocks
- [x] 1. Loader, header with EN/UA switch, hero with rotating cat
- [ ] 2. Numbers
- [ ] 3. Brands
- [ ] 4. Cases
- [ ] 5. Skills
- [ ] 6. Markets
- [ ] 7. Contact

## Edit texts
All texts live in `js/i18n.js`, one object per language. Keys match `data-i18n="…"` in `index.html`.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000
