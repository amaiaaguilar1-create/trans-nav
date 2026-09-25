# Design system

Trans Resource Navigator is a trust-first public information site. Visitors are trans people, often on phones, often with little money, sometimes somewhere hostile. The design is calm, discreet, and legible: nothing on screen signals the subject from across a room, and the quick exit is always one tap or two Escape presses away.

Tokens live in `site/src/styles/global.css`. Change them there, never inline.

## Method

Swiss method throughout: grid first, hierarchy from type and space, flush left, structure before containers, no decoration that does not inform.

- **Grid:** 1200px max, 24px gutters (16px under 480px), reading measure 62ch. Guides use a two-column doc layout (content plus a sticky "On this page" list) from 1040px up.
- **Dials:** variance 3, motion 2, density 4.

## Type

One family: **Atkinson Hyperlegible Next**, self-hosted through `@fontsource-variable` (never Google Fonts: that would send visitors' IP addresses to Google). It was designed for low-vision readers, and its slashed zero is deliberate. Body 17px / 1.6. Scale ratio 1.25: 13, 15, 17, 21, 26, 30-40, 34-52px.

## Color

Restrained. Neutrals tinted slightly toward the accent, one accent (deep ink blue) for links, the primary action, focus, and current location, and five status roles that always pair color with an icon and a word:

| Status | Meaning | Icon |
|---|---|---|
| available | Possible today | check |
| restricted | Limited (surgery proof, court order first, narrow providers) | triangle |
| prohibited | Not possible | circle x |
| litigation | Changing in court | scale |
| unclear | Unwritten or inconsistent | question |

Light and dark themes are both designed; dark follows `prefers-color-scheme`. Every text pair meets WCAG AA in both.

## Shape and depth

Controls 6px radius, panels 8px, chips fully rounded. Flat with 1px hairlines. No shadows except the floating mobile quick-exit button. No colored stripes on cards or alerts.

## Information architecture

- **Home:** state picker, the usual order of steps, federal status, compare, help paying, how we verify.
- **State:** climate, overview, then every change in the order people do it, mixing state and federal rows, then local help and statewide organizations.
- **Guide:** an answer block (status, summary, key facts, verification line) first, then steps, forms, costs and waivers, requirements, minors, next steps, free help, laws, and sources.
- **Care:** the same answer-first shape, plus health centers near you, telehealth, clinics and funds, and paying for care.
- **Compare:** one table of every jurisdiction, filterable.

## Components

`AnswerBlock`, `StatusChip`, `Steps`, `Forms` (disclosure rows), `Fees` (table), `ResourceCard` (a flat list row, never a nested card), `Toc`, `StatesGrid` (filterable list), `HealthCenters`, `ChangeNotice`, `Sources`, `Cite`. Icons come from one inline family (`Icon.astro`), drawn with a 2px stroke on a 24px grid.

## Floors

- Touch targets of at least 24px everywhere and 44px for primary controls.
- No horizontal scroll at 320px.
- Visible focus rings.
- `prefers-reduced-motion` respected; the only motion is chevron rotation and hover color changes.
- axe finds no WCAG 2.2 AA violations on the sampled pages.

Before shipping design changes, check at 320px, 390px, and 1440px wide, in both light and dark.
