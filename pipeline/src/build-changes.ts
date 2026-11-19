/**
 * Writes sources/changes.json from open GitHub issues labeled `monitor`. The site reads this at build time and
 * shows "change detected, under review" on affected pages. Runs in the deploy workflow; with no token it writes [].
 *
 * One entry per source: if a source somehow has several open issues, only the newest is listed, the same issue the
 * monitor comments on when that source changes again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';
import { fetchOpenMonitorIssues, newestBySource } from './monitor-issues.js';

type Change = { issue: number; url: string; jurisdiction: string; paths: string[]; severity: string; summary: string; detected: string };
const out: Change[] = [];
const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
  const bySource = newestBySource(await fetchOpenMonitorIssues(GITHUB_REPOSITORY, GITHUB_TOKEN));
  for (const { issue: i, marker: d } of bySource.values()) {
    out.push({ issue: i.number, url: i.html_url, jurisdiction: d.jurisdiction, paths: d.paths ?? [], severity: d.severity, summary: d.summary, detected: d.detected });
  }
  out.sort((a, b) => b.issue - a.issue); // newest first, as the API returned them before
}
fs.writeFileSync(path.join(ROOT, 'sources/changes.json'), JSON.stringify(out, null, 1));
console.log(`✔ ${out.length} open monitored change(s)`);
