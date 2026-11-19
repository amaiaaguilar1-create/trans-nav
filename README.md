# Trans Resource Navigator

Name changes, gender marker updates, and gender-affirming care, for every US state and for federal documents, kept current.

- **Structured content** lives in `content/` as YAML, validated against `schema/*.json`.
- **Site** (`site/`) is an Astro static site in English and Spanish, deployed to GitHub Pages.
- **Pipeline** (`pipeline/`) validates content, generates types, and runs two jobs on GitHub Actions: the source monitor (federal sources daily, everything else weekly; it opens a GitHub issue labeled `monitor` when a cited page changes) and the monthly HRSA health center ingest.

Read `docs/editorial-policy.md` before reviewing content. The full plan is in the project planning notes.

## Develop

```sh
nvm use            # Node 24
npm install
npm run validate   # schema + cross-reference checks on content/
npm run dev        # Astro dev server (site/)
npm run build      # static build to site/dist
npm test -w pipeline            # unit tests for the pipeline scripts
npm run gen-types -w pipeline   # regenerate site/src/types/content.d.ts after editing schema/
```

## Add a state

1. Create `content/states/XX/meta.yaml` plus any of `name-change.yaml`, `drivers-license.yaml`, `birth-certificate.yaml`, `care.yaml`, and `local/<city>.yaml`.
2. Every claim needs a `sources: [id]` pointing at that file's `sources[]` list.
3. `npm run validate` must pass. Open a PR; the site shows the page as "Draft" until a reviewer flips `review.status` to `reviewed`.

## Privacy

No accounts, no third-party trackers, no stored chat logs. See `/privacy` on the site.
