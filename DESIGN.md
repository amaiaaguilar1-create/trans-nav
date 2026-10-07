# Design system

Trans Resource Navigator is a trust-first public information site. Visitors are trans people, often on phones, often with little money, sometimes somewhere hostile. The design is calm, discreet, and legible: nothing on screen signals the subject from across a room, and the quick exit is always one tap or two Escape presses away.

Tokens live in `site/src/styles/global.css`. Change them there, never inline.

## Method

Swiss method throughout: grid first, hierarchy from type and space, flush left, structure before containers, no decoration that does not inform.

- **Grid:** 1200px max, 24px gutters (16px under 480px), reading measure 62ch. Guides use a two-column doc layout (content plus a sticky "On this page" list) from 1040px up.
- **Dials:** variance 4, motion 2, density 5.
- **Organizing idea: the route.** The product is a sequence (court order, Social Security, license, passport, birth certificate). One connected path component (`Route.astro`, built from `lib/route.ts`) carries it on the home page, every state hub, and every guide ("Step N of 5" plus a Next stop block). Do not add pages that break the route without linking back into it.

## Type

One family: **Atkinson Hyperlegible Next**, self-hosted through `@fontsource-variable` (never Google Fonts: that would send visitors' IP addresses to Google). It was designed for low-vision readers, and its slashed zero is deliberate. Body 17px / 1.6. Scale ratio 1.25: 13, 15, 17, 21, 26, 30-40, 34-52px, plus 36-56px for the home hero only. Headlines stay at two lines or fewer on desktop.

## Color

Restrained. Neutrals tinted slightly toward the accent, one accent (deep ink blue) for links, the primary action, focus, and current location, and five status roles that always pair color with an icon and a word. A status renders as a filled **chip** only for the one primary status on a page (the answer block); everywhere else (rows, the route, tables) it is a **mark**: icon plus colored word, no fill.

| Status | Meaning | Icon |
|---|---|---|
| available | Possible today | check |
| restricted | Limited (surgery proof, court order first, narrow providers) | triangle |
| prohibited | Not possible | circle x |
| litigation | Changing in court | scale |
| unclear | Unwritten or inconsistent | question |

Light and dark themes are both designed; dark follows `prefers-color-scheme`. Every text pair meets WCAG AA in both.

## Shape and depth

Controls 6px radius, panels 8px, chips fully rounded, route nodes circular. Flat with 1px hairlines, used to separate groups, not every row. No shadows except the floating mobile quick-exit button. No colored stripes on cards or alerts. No imagery: nothing on screen should signal the topic from across a room (a deliberate override of image-led guidance).

## Information architecture

- **Home:** hero (one question: which state) beside a live federal-status panel; every state and territory; the route; real counts computed from content next to Compare; help paying and how we verify.
- **State:** climate strip, overview, your documents as the route (state and federal stops mixed, in order), care for adults and under 18, then local help beside statewide organizations.
- **Guide:** "Step N of 5 in <state>", an answer block (status, summary, key facts, verification line), then steps, forms, costs and waivers, requirements, minors, next steps, free help, laws, a Next stop block, and sources (collapsed; citations open them).
- **Care:** the same answer-first shape, plus health centers near you, telehealth, clinics and funds, and paying for care.
- **Compare:** one table of every jurisdiction, filterable.

## Components

`AnswerBlock`, `StatusChip` (chip or mark), `Route`, `NextStop`, `StatePicker`, `Steps`, `Forms` (disclosure rows), `Fees` (table), `ResourceCard` (a flat list row, never a nested card), `Toc`, `StatesGrid` (filterable list), `HealthCenters`, `ChangeNotice`, `Sources`, `Cite`. Icons come from one inline family (`Icon.astro`), drawn with a 2px stroke on a 24px grid.

## Floors

- Touch targets of at least 24px everywhere and 44px for primary controls.
- No horizontal scroll at 320px.
- Visible focus rings.
- `prefers-reduced-motion` respected. The only motion: a 160ms cross-page fade (view transitions), button press scale, the Next stop arrow nudge, chevron rotation, and hover color changes.
- No em or en dashes in UI copy, and no runs of middle dots as separators.
- axe finds no WCAG 2.2 AA violations on the sampled pages.

Before shipping design changes, check at 320px, 390px, and 1440px wide, in both light and dark.
