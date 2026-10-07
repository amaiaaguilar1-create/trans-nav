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

Controls 6px radius, panels 8px, chips fully rounded, route nodes circular. Flat with 1px hairlines, used to separate groups, not every row. No shadows except floating layers: the mobile quick-exit button and term definitions. No colored stripes on cards or alerts. No imagery: nothing on screen should signal the topic from across a room (a deliberate override of image-led guidance).

## Information architecture

### The answer model (the rule everything else follows)
Every document answers **separate questions**, and each question gets its own answer. Never collapse a document into one status: "Not possible" on a passport hid that the name can change while the marker cannot.

| Document | Questions (in this order) |
|---|---|
| Name change (court) | Change your legal name; newspaper notice; court hearing; keep the record private |
| License, birth certificate, federal IDs | Update your name; change your gender marker (with options M/F/X and what proof you need) |
| Care | Care for adults; care for under 18; Medicaid pays for hormones; for surgery; private plans must cover |

The model lives in `lib/verdict.ts` (`docVerdict`, `careVerdict`, `markerDetail`) and renders through `Verdict.astro` in two variants: **full** (tinted answer cells at the top of a guide) and **compact** (label, answer, qualifier rows in lists, the route, Next stop). Answer words are fixed: Yes, Limited, No, In court, Unclear (care: Allowed, Limited, Banned). Qualifiers never claim more than the data says.

### Three layers on every page
1. **Answer** (always visible): verdict, one plain summary, the facts people plan around (cost, how to apply, wait), how verified.
2. **How** (open sections): steps, costs and fee waivers, free help. On care pages: health centers near you, telehealth, clinics and funds, paying for care.
3. **Detail** (folds): forms, requirements, minors, after you finish, tips, laws; on care, the full legal rules. Each fold previews its contents in its summary so people can decide without opening. Any link into a fold (contents, citations, step form links, URL hash) opens it; "Open all" opens a group; printing opens everything.

### Orientation
- **The route** (`lib/route.ts`): name change, Social Security, license, passport, birth certificate. The state hub draws it with each stop's verdict; guides show a **stepper** (Step N of 5 in State) and end with **Next stop**, which previews the next document's answers.
- Federal guides reached from a state carry `?from=<code>` in the link and continue that state's route. Nothing is stored on the device.
- **Terms** (`Term.astro`): gender marker, self-attestation, shield law, publication, sealing and the other glossary terms open a definition in place (native popover; never inside a link or summary).

### Pages
- **Home:** one question (which state) beside a federal table with separate Name and Gender marker columns; every state; the route; real counts next to Compare; help paying and how we verify.
- **State:** climate strip; overview; your documents in order (route with verdicts); care (adult and under-18 answers); local help beside statewide organizations.
- **Guide:** stepper, answer layer, court case callout (effect today visible, case detail one tap down), how it works, steps, costs, free help, More detail folds, Next stop, sources (collapsed).
- **Care:** answer layer with coverage, then find care, then paying, then the rules in detail.
- **Federal:** a key point that name and marker follow different rules, then each document with both answers.
- **Compare:** a key point (names are possible everywhere; markers are where states differ), columns grouped by question (Name, Gender marker, Care, Protection), a "Show what you need" layer, sticky state column, empty state.

## Components

`AnswerBlock`, `Verdict` (full or compact), `Term`, `Fold`, `RouteStepper`, `StatusChip` (chip or mark), `Route`, `NextStop`, `StatePicker`, `Steps`, `Forms` (disclosure rows), `Fees` (table), `ResourceCard` (a flat list row, never a nested card), `Toc`, `StatesGrid` (filterable list), `HealthCenters`, `ChangeNotice`, `Sources`, `Cite`. Icons come from one inline family (`Icon.astro`), drawn with a 2px stroke on a 24px grid.

## Floors

- Touch targets of at least 24px everywhere and 44px for primary controls.
- No horizontal scroll at 320px.
- Visible focus rings.
- `prefers-reduced-motion` respected. The only motion: a 160ms cross-page fade (view transitions), button press scale, the Next stop arrow nudge, chevron rotation, and hover color changes.
- No em or en dashes in UI copy, and no runs of middle dots as separators.
- axe finds no WCAG 2.2 AA violations on the sampled pages.

Before shipping design changes, check at 320px, 390px, and 1440px wide, in both light and dark.
