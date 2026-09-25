/**
 * Writes sources/changes.json from open GitHub issues labeled `monitor`. The site reads this at build time and
 * shows "change detected, under review" on affected pages. Runs in the deploy workflow; with no token it writes [].
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';

type Change = { issue: number; url: string; jurisdiction: string; paths: string[]; severity: string; summary: string; detected: string };
const out: Change[] = [];
const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
  for (let page = 1; page < 20; page++) {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues?state=open&labels=monitor&per_page=100&page=${page}`, {
      headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
    const issues = (await r.json()) as { number: number; html_url: string; body: string | null }[];
    for (const i of issues) {
      const m = i.body?.match(/<!-- monitor: (\{.*\}) -->/);
      if (!m) continue;
      const d = JSON.parse(m[1]);
      out.push({ issue: i.number, url: i.html_url, jurisdiction: d.jurisdiction, paths: d.paths ?? [], severity: d.severity, summary: d.summary, detected: d.detected });
    }
    if (issues.length < 100) break;
  }
}
fs.writeFileSync(path.join(ROOT, 'sources/changes.json'), JSON.stringify(out, null, 1));
console.log(`✔ ${out.length} open monitored change(s)`);
