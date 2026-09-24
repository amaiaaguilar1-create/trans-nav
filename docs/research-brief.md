# Research and drafting brief: one jurisdiction

You are drafting the content for ONE US jurisdiction (state, DC, or territory) of the Trans Resource Navigator. Real people with little money will use this to change their name, update their documents, and find hormone therapy and care. Wrong information causes harm. Work from primary sources, say plainly when something is not possible, and flag anything you could not confirm.

Today's date is given in your task. Use it for `accessed` and `last_verified`.

## Files to produce

All under `content/states/<CODE>/` (CODE is the two-letter postal code, uppercase). Copy the structure of the California files in `content/states/CA/`, which are the gold standard. Schemas are in `schema/` (`guide.json`, `state-meta.json`, `care.json`, `local.json`; shared definitions in `common.json`). Read them before writing.

1. `meta.yaml` (schema: state-meta.json). `code`, bilingual `name`, `kind` (state | district | territory), `overview`, `climate` (id_documents and care: protective | mixed | restrictive; `shield_law` true/false), `guides` listing exactly the guide files you created, `cities` listing exactly the local files you created, 2 to 4 `key_resources` (statewide legal aid, LGBTQ center, hotline), `sources`.
2. `name-change.yaml` (schema: guide.json, `guide_type: name_change`).
3. `drivers-license.yaml` (`guide_type: drivers_license`).
4. `birth-certificate.yaml` (`guide_type: birth_certificate`).
5. `care.yaml` (schema: care.json).
6. `local/<city-slug>.yaml` (schema: local.json) for the largest metro area. Add a second city only if the state has two major metros with distinct trans services (e.g., TX: houston and dallas or austin; FL: miami and orlando or tampa; NY: new-york-city; PA: philadelphia and pittsburgh). Slug is lowercase kebab-case.

## What to research, per file

### Name change
- Governing statute and the court (which court, which county: residence? birth?). Link the statute on the state legislature's site.
- Official petition forms: form numbers, names, direct URLs to the court system's PDFs or self-help pages. If forms are county-specific, link the statewide self-help page and the largest county's forms. Write `how_to_fill` tips for the main petition only where the form has trans-relevant choices (reason for change, publication waiver, sealing request).
- Publication: required? statute? waiver for safety or for gender-identity changes? how to request? (`publication` section).
- Hearing: required or discretionary? (`hearing`).
- Fingerprints or background check (`background_check`).
- Fees: filing, publication (typical range), certified copies. Fee waiver form and eligibility (`fees`, `fee_waiver`).
- Sealing or confidentiality of the record (`confidentiality`).
- Minors (`minors`): who must consent, notice to the other parent.
- Timeline, `after` (order of updating SSA, DMV, birth certificate, passport), `tips`.
- `local_help`: 3 to 6 statewide or major-city legal aid orgs, name-change clinics (law schools, bar associations, LGBTQ centers), and fee-assistance funds. Verify each exists on its own website.
- `statutes`, `related_links` (A4TE's page for the state at transequality.org/documents/<state>-identity-documents or similar; note its last-updated date; Namesake if MA or RI), `sources`.
- `status`: available if a standard petition works for trans people; restricted if there are unusual barriers (mandatory publication with no waiver, fingerprinting, judicial hostility documented); unclear if the law is silent and practice varies.

### Driver's license / state ID
- Current requirement to change the sex marker: `requirement_type` (self_attestation | provider_letter_any | provider_letter_limited | court_order | amended_birth_certificate | surgery_proof | prohibited | unclear) and `markers_available` (which of M, F, X).
- Exact DMV/BMV/MVD form (number, name, URL), who may sign a provider letter, whether it can be done online, by mail, or in person, and the fee for a duplicate/corrected card and ID. Cite the agency's fee page.
- Name change on the card: required documents (`name_change_status` almost always available).
- Any 2025-2026 law or policy change (several states banned marker changes or voided prior ones: check KS, TX, FL, IN, TN, ID, MT, OK, IA, AR, ND, WV, WY, AL, MS, and others). If prohibited, `status: prohibited` and explain what happens to existing cards with changed markers.
- Statutes/regulations, `litigation` if a case is active, `pending_bills` only if a bill has passed at least one chamber in the current session.

### Birth certificate
- Statute and vital records agency. `requirement_type`, `markers_available`, whether a court order is needed, whether a new certificate is issued or the old one amended (and whether the original is sealed), fees for amendment and copies, processing time, forms with URLs, whether name changes can be made with the same request.
- If the state prohibits changes (about ten do), `status: prohibited`, explain, and note whether previously amended certificates were voided (Kansas did in 2026).
- Note that the person must have been born in this state; point people born elsewhere to their birth state.

### Care
- `adult_care.status`: available in most states; restricted where laws limit adult care (e.g., Medicaid bans, public-funds bans, age 19 or 21 thresholds, provider restrictions); note any active litigation.
- `minor_care.status`: prohibited in states with bans on care for minors (about 27 states); include the statute, effective date, exceptions, penalties for providers, and whether the ban is enjoined. `available` where legal; note shield laws.
- `medicaid`: program name; does it cover HRT and surgery (yes | no | partial | unclear); explicit exclusion statute or policy if any; how to apply URL.
- `private_insurance`: does state law prohibit exclusions? complaint URL at the state insurance department.
- `telehealth_hrt`: ids from `content/orgs/` that serve this state. Plume serves all states; FOLX serves AZ CA CO CT DE FL GA IL IN KS KY MA MD MI MN MO MT NV NJ NM NY NC OH OR PA RI SC TN TX UT VA WA WI; QueerDoc serves AK CA FL HI ID MT OR UT WA WY; planned-parenthood everywhere (availability varies by affiliate). Also QueerMed for many Southern states if you can confirm on queermed.com.
- `resources`: 5 to 10 entries: informed-consent clinics and FQHCs with trans health programs in the major metros, Planned Parenthood affiliates that offer hormone therapy (with minimum age), state or city government programs (PrEP assistance, Medicaid enrollment help), LGBTQ centers with health navigation, funds (`org: point-of-pride`, `org: genderbands`), Trans Health Project for insurance appeals, HRSA health center finder. Set `verification` honestly: `official_source` (government), `org_website` (you read the org's own page), `community_reported`, or `unverified`.
- `statutes`, `litigation`, `pending_bills`, `sources`.

### Local (largest metro)
- `court`: where name change petitions are filed locally, self-help center URL, local filing fee if it differs from the state figure.
- `resources`: 6 to 12 entries across pillars: legal aid and name-change clinics, informed-consent HRT clinics and FQHCs, sexual health (PrEP, STI testing) clinics, mental health (LGBTQ centers, peer support), funds, hotlines. Public business addresses only.

## Source rules

- Prefer, in order: state statutes and regulations on the legislature's site; the court system's self-help and forms pages; the DMV and vital records agency pages; the Medicaid agency; county court pages; then organizations' own pages for their services.
- Cross-check against the Movement Advancement Project map (mapresearch.org/equality-map/identity-document-laws-and-policies and /healthcare-laws-and-policies) and A4TE's state page, but do not copy their text and do not cite them as the source for a fee or form number. If they disagree with a primary source, use the primary source and mention the disagreement in `review.notes`.
- Every `sources[]` entry needs `id` (kebab-case), `url`, `title`, `kind`, `accessed`, and, when possible, a short `quote` supporting the claim. Every source must be cited at least once via a `sources: [id]` array somewhere in the file. Every `sources: [id]` reference must exist.
- If a page could not be fetched (some government sites block automated access), say so in `review.notes`, cite a secondary source, and lower `confidence`.
- Do not invent fees, form numbers, or URLs. Prefer omitting a field to guessing. Check that URLs you cite actually resolve.

## Status vocabulary

- `available`: the change can be made today by a trans person under normal conditions.
- `restricted`: possible only under narrow conditions (surgery proof, court order first, provider letter from a narrow list, age limits).
- `prohibited`: not possible.
- `litigation`: availability is actively changing because of a court order or stay; the banner must explain what applies right now.
- `unclear`: the law is silent, unwritten, or inconsistently applied.

## Writing

- Plain language, second person, short paragraphs. Markdown allowed in prose: bold, lists, links. No HTML.
- Provide `es` translations for `status_summary`, `summary`, every step `title`, and `after`. Other `es` fields are welcome but optional. Set `review.es_status: machine_draft`.
- `review`: `status: draft`, `verified_by: ai-draft`, `confidence` low | medium | high, `last_verified` = today, and `notes` listing every unverified item for the human reviewer.
- Neutral wording about hostile states: describe what the law does and cite it.

## YAML pitfalls (the validator will fail otherwise)

- Any scalar containing `: ` (colon space) or starting with `*`, `&`, `[`, `{`, `>`, `|`, `#`, `"`, `'` must be a block scalar (`>-` or `|`) or quoted.
- Dates are quoted strings: `"2026-09-24"`.
- `sources`, `forms`, `fees`, `steps`, `resources` item ids: lowercase kebab-case (form ids may keep agency casing like `NC-200` or `DL 329S`).
- Step `forms:` and `fees:` arrays reference ids that exist in the file's `forms`/`fees` lists.
- `org:` and `telehealth_hrt` reference ids that exist in `content/orgs/` (plume, folx, queerdoc, planned-parenthood, point-of-pride, trans-lifeline, genderbands, a4te, namesake, transgender-law-center).
- `additionalProperties` is false everywhere: only use fields that appear in the schema.
- `jurisdiction` must equal the directory code; `guide_type` must match the filename with underscores.

## Validate before you finish

From the repo root run `npm run validate`. Fix every error that names a path under your `content/states/<CODE>/`. Errors in other states' paths belong to other agents; ignore them. Do not run `git commit` or `git push`. Do not edit any file outside your jurisdiction's directory.

## Report

End with a short report: which files you wrote, the `status` of each guide and of adult/minor care, the two or three most important facts a reviewer must double-check, and any source you could not load.
