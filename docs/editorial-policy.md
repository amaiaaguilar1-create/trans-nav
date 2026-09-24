# Editorial policy

This is what "verified" means on the site, and how content moves from draft to published.

## Principles

1. **Primary sources first.** Every process claim (form, fee, requirement, deadline) must cite an official source: a court, agency, statute, regulation, or docket. Advocacy-organization guides are cross-checks, not sources of truth.
2. **Say what is not possible.** When a change is prohibited or frozen (as federal sex markers are in 2026), the page says so plainly at the top. We never imply a path exists when it does not.
3. **Show the date.** Every page shows `last_verified`. After 90 days without re-verification the badge turns to "verification overdue" automatically.
4. **Draft is public but labeled.** AI-drafted pages ship with a yellow "Draft, not yet human-verified" notice and a pointer to A4TE's guide, rather than being hidden. Broad coverage with honest labeling beats a blank page.
5. **Link, don't copy.** We link to A4TE, MAP, Namesake, Erin Reed's map, and local orgs with attribution. We do not reproduce their content.
6. **No private addresses.** Resources list only public business addresses that appear on the organization's own site or an official listing.
7. **Neutral wording on hostile states.** `climate` fields use protective / mixed / restrictive. Pages describe what the law does, cite it, and point to help.

## Review states

| `review.status` | Meaning |
|---|---|
| `draft` | Written by the research pipeline or a contributor; not yet checked claim by claim. |
| `reviewed` | A named reviewer opened every cited source and confirmed each claim on the date in `last_verified`. |

`review.es_status`: `missing` → `machine_draft` (AI translation, shown with a notice) → `reviewed` (a Spanish-speaking reviewer checked it).

## Reviewing a page

1. Open the PR. For each `sources[]` entry, open the URL and confirm it still says what the `quote` says.
2. Check every fee against the cited fee schedule. Check every form number against the agency's forms page.
3. Read `review.notes`: the drafter lists what it could not confirm. Resolve each item or leave it noted.
4. Set `review.status: reviewed`, `verified_by: <your GitHub handle>`, `last_verified: <today>`. Merge.

## When the monitor opens a PR

The weekly monitor opens a PR labeled with the jurisdiction and a severity:

- `critical`: a status changed (available → prohibited, a form was withdrawn, a court order took effect). Review within 48 hours.
- `normal`: fees, addresses, wording. Review within the week.
- `low`: cosmetic page changes on a cited source. Batch.

While a monitor PR is open, the affected page shows "change detected, under review".

## Reporting

Anyone can report outdated information from the footer link. Reports become GitHub issues and are triaged the same way.
