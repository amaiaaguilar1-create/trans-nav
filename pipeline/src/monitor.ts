/**
 * Source monitor. For every entry in sources/registry.yaml due at this frequency:
 *   1. fetch (plain HTTP; escalate to headless Chromium if blocked; never fetch `manual` sources)
 *   2. normalize to text and compare with the committed snapshot in sources/snapshots/
 *   3. for changed sources, ask Claude whether the change affects what our content says
 *   4. open or update a GitHub issue per relevant change (label: monitor)
 *   5. write a run report to sources/reports/<date>.md
 *
 * Usage:
 *   npm run monitor -w pipeline -- --frequency weekly            # scheduled run
 *   npm run monitor -w pipeline -- --only CA --dry-run           # local test, no Claude, no issues
 *   npm run monitor -w pipeline -- --limit 50
 *
 * Env: ANTHROPIC_API_KEY (classification), GITHUB_TOKEN + GITHUB_REPOSITORY (issues). Both optional;
 * without them the run still updates snapshots and writes the report.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import YAML from 'yaml';
import { createTwoFilesPatch } from 'diff';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Browser } from 'playwright';
import { ROOT } from './paths.js';

// ---------- args ----------
const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const FREQ = (arg('frequency') ?? 'all') as 'daily' | 'weekly' | 'monthly' | 'all';
const ONLY = arg('only')?.toUpperCase();
const LIMIT = Number(arg('limit') ?? Infinity);
const DRY = args.includes('--dry-run');
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- types & state ----------
type Source = {
  id: string; url: string; title?: string; kind: string; fetch: 'auto' | 'plain' | 'browser' | 'manual';
  frequency: 'daily' | 'weekly' | 'monthly'; linked_content: string[]; jurisdiction?: string;
  severity_hint?: 'critical' | 'normal' | 'low'; note?: string;
};
type SourceState = { hash?: string; last_checked?: string; last_changed?: string; last_status?: string; method?: string };

const SNAP_DIR = path.join(ROOT, 'sources/snapshots');
const STATE_FILE = path.join(SNAP_DIR, 'state.json');
fs.mkdirSync(SNAP_DIR, { recursive: true });
const state: Record<string, SourceState> = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};

const registry = (YAML.parse(fs.readFileSync(path.join(ROOT, 'sources/registry.yaml'), 'utf8')) as { sources: Source[] }).sources;
const due = registry
  .filter((s) => FREQ === 'all' || s.frequency === FREQ || (FREQ === 'weekly' && s.frequency === 'daily'))
  .filter((s) => !ONLY || s.jurisdiction === ONLY || s.linked_content.some((p) => p.includes(`/${ONLY}/`)))
  .slice(0, LIMIT);

// ---------- fetching ----------
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const BLOCK_MARKERS = /just a moment|attention required|access denied|verify you are human|request unsuccessful|captcha|_incapsula_resource|pardon our interruption|request rejected/i;
const isPdfBytes = (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-';

let browser: Browser | null = null;
async function getBrowser() {
  if (!browser) {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

type Fetched = { status: number; body: string; bytes?: Buffer; method: 'plain' | 'browser'; blocked: boolean };

async function fetchPlain(s: Source): Promise<Fetched> {
  const r = await fetch(s.url, { headers: { 'user-agent': UA, accept: '*/*', 'accept-language': 'en-US,en' }, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  const buf = Buffer.from(await r.arrayBuffer());
  const isPdf = isPdfBytes(buf); // trust the bytes, not the URL: bot walls serve HTML at .pdf URLs
  const body = isPdf ? '' : buf.toString('utf8');
  const blocked = [401, 403, 429, 503].includes(r.status) || (!isPdf && r.status === 200 && (body.length < 5000 && BLOCK_MARKERS.test(body) || (s.kind === 'pdf')));
  return { status: r.status, body, bytes: isPdf ? buf : undefined, method: 'plain', blocked };
}

async function fetchBrowser(s: Source): Promise<Fetched> {
  const b = await getBrowser();
  const ctx = await b.newContext({ userAgent: UA, locale: 'en-US' });
  const page = await ctx.newPage();
  try {
    if (s.kind === 'pdf') {
      // Pass the site's bot check on its home page first, then download the PDF with the resulting cookies.
      await page.goto(new URL(s.url).origin, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(4000);
      const r = await ctx.request.get(s.url, { timeout: 45_000 });
      const buf = Buffer.from(await r.body());
      return isPdfBytes(buf)
        ? { status: r.status(), body: '', bytes: buf, method: 'browser', blocked: false }
        : { status: r.status(), body: buf.toString('utf8'), method: 'browser', blocked: true };
    }
    const r = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(3000); // let JS-rendered pages and challenge redirects settle
    const html = await page.content();
    const title = await page.title();
    const status = r?.status() ?? 0;
    return { status, body: html, method: 'browser', blocked: [401, 403, 429].includes(status) || BLOCK_MARKERS.test(title) };
  } finally {
    await ctx.close();
  }
}

async function fetchSource(s: Source): Promise<Fetched> {
  if (s.fetch === 'browser') return fetchBrowser(s);
  const plain = await fetchPlain(s).catch((e) => ({ status: 0, body: String(e), method: 'plain' as const, blocked: true }));
  if (!plain.blocked || s.fetch === 'plain' || s.kind === 'json_api') return plain;
  return fetchBrowser(s).catch(() => plain);
}

// ---------- normalization ----------
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head|nav|footer|header|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d|\/section|\/article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
    // drop lines that change on every request and never matter
    .filter((l) => l && !/^(page last (updated|reviewed)|last (updated|modified)|copyright|©)/i.test(l) && !/^\d{1,2}:\d{2}/.test(l))
    .join('\n');
}

async function normalize(s: Source, f: Fetched): Promise<string> {
  if (f.bytes) {
    // Compare extracted text, not bytes: many servers regenerate PDFs with new metadata on each request.
    try {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const { text } = await extractText(await getDocumentProxy(new Uint8Array(f.bytes)), { mergePages: true });
      const t = String(text).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
      if (t.length > 50) return t;
    } catch { /* scanned or malformed PDF: fall back to a byte hash */ }
    return `PDF sha256 ${crypto.createHash('sha256').update(f.bytes).digest('hex')}`;
  }
  if (s.kind === 'json_api') {
    try {
      const j = JSON.parse(f.body) as { results?: Record<string, unknown>[] };
      return (j.results ?? []).map((d) => [d.publication_date, d.type, d.document_number, d.title, d.html_url].join(' | ')).join('\n');
    } catch { return f.body; }
  }
  return htmlToText(f.body);
}

// ---------- classification ----------
const Classification = z.object({
  relevant: z.boolean().describe('True if the change could make any statement in our content wrong or incomplete.'),
  severity: z.enum(['critical', 'normal', 'low']).describe('critical: availability changed (now prohibited/allowed), a law or court order took effect, a form was withdrawn. normal: fees, form versions, addresses, steps. low: wording only.'),
  summary: z.string().describe('One or two plain sentences on what changed.'),
  what_to_check: z.string().describe('What the human reviewer should verify or edit in our content, naming the file and field.'),
});
type Classified = z.infer<typeof Classification>;

const anthropic = !DRY && process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

function contextFor(s: Source): string {
  return s.linked_content.slice(0, 6).map((rel) => {
    try {
      const d = YAML.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as { status?: string; status_summary?: { en: string }; sources?: { url: string; quote?: string }[] };
      const quote = d.sources?.find((x) => x.url === s.url)?.quote;
      return `- ${rel} (status: ${d.status ?? 'n/a'})\n  Our summary: ${d.status_summary?.en?.trim() ?? '(none)'}\n  Quote we rely on from this source: ${quote ?? '(none recorded)'}`;
    } catch { return `- ${rel}`; }
  }).join('\n');
}

async function classify(s: Source, diffText: string): Promise<Classified | null> {
  if (!anthropic) return null;
  const res = await anthropic.messages.parse({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system:
      'You review changes to official web pages that a public guide for transgender people cites. The guide explains legal name changes, gender marker changes on IDs and birth certificates, and gender-affirming care, per US jurisdiction. Decide if the page change affects anything the guide says. Ignore navigation, banners, dates, cookie notices, and formatting. Be conservative: a missed legal change harms people, but noise wastes the single volunteer reviewer\'s time.',
    messages: [{
      role: 'user',
      content: `Source: ${s.title ?? s.url}\nURL: ${s.url}\nJurisdiction: ${s.jurisdiction ?? 'n/a'}\n\nOur content that cites this source:\n${contextFor(s)}\n\nChange (unified diff of the page text, truncated):\n${diffText.slice(0, 12_000)}`,
    }],
    output_config: { format: zodOutputFormat(Classification) },
  });
  return res.parsed_output ?? null;
}

// ---------- GitHub issues ----------
const GH = process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY && !DRY ? { token: process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPOSITORY } : null;
async function gh(pathname: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.github.com/repos/${GH!.repo}${pathname}`, {
    ...init, headers: { authorization: `Bearer ${GH!.token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${pathname}: ${await r.text()}`);
  return r.json();
}
let openIssues: { number: number; body: string }[] | null = null;
async function reportIssue(s: Source, c: Classified, diffText: string) {
  if (!GH) return undefined;
  openIssues ??= (await gh('/issues?state=open&labels=monitor&per_page=100')) as { number: number; body: string }[];
  const marker = { source: s.id, url: s.url, jurisdiction: s.jurisdiction ?? 'US', paths: s.linked_content, severity: c.severity, summary: c.summary, detected: TODAY };
  const body = [
    `**${c.summary}**`, '', `Source: ${s.url}`, `Affects: ${s.linked_content.map((p) => '`' + p + '`').join(', ') || '(no content file linked)'}`, '',
    `**What to check:** ${c.what_to_check}`, '', '<details><summary>Diff</summary>', '', '```diff', diffText.slice(0, 50_000), '```', '</details>', '',
    `Close this issue after updating the content (or if no change is needed). The site shows "change detected, under review" on affected pages while it is open.`,
    '', `<!-- monitor: ${JSON.stringify(marker)} -->`,
  ].join('\n');
  const existing = openIssues.find((i) => i.body?.includes(`"source":"${s.id}"`));
  if (existing) {
    await gh(`/issues/${existing.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `Changed again on ${TODAY}.\n\n${body}` }) });
    return existing.number;
  }
  const created = (await gh('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: `[${s.jurisdiction ?? 'US'}] ${c.severity === 'critical' ? '⚠️ ' : ''}${c.summary.slice(0, 110)}`,
      body, labels: ['monitor', `severity:${c.severity}`, `jurisdiction:${s.jurisdiction ?? 'US'}`],
    }),
  })) as { number: number };
  openIssues.push({ number: created.number, body });
  return created.number;
}

// ---------- run ----------
type Result = { s: Source; outcome: 'baseline' | 'unchanged' | 'changed' | 'blocked' | 'broken' | 'error' | 'manual'; method?: string; status?: number; c?: Classified | null; issue?: number; err?: string };
const results: Result[] = [];

async function processSource(s: Source) {
  const st = (state[s.id] ??= {});
  if (s.fetch === 'manual') { results.push({ s, outcome: 'manual' }); return; }
  try {
    const f = await fetchSource(s);
    st.last_checked = TODAY; st.last_status = String(f.status); st.method = f.method;
    if ([404, 410].includes(f.status)) { results.push({ s, outcome: 'broken', method: f.method, status: f.status }); return; }
    if (f.blocked || f.status >= 400) { results.push({ s, outcome: 'blocked', method: f.method, status: f.status }); return; }
    const text = await normalize(s, f);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const snapFile = path.join(SNAP_DIR, `${s.id}.txt`);
    if (!st.hash) {
      st.hash = hash; fs.writeFileSync(snapFile, text);
      results.push({ s, outcome: 'baseline', method: f.method, status: f.status }); return;
    }
    if (st.hash === hash) { results.push({ s, outcome: 'unchanged', method: f.method, status: f.status }); return; }
    const prev = fs.existsSync(snapFile) ? fs.readFileSync(snapFile, 'utf8') : '';
    const diffText = createTwoFilesPatch('before', 'after', prev, text, '', '', { context: 2 });
    let c: Classified | null = null;
    try { c = await classify(s, diffText); } catch (e) { console.warn(`classify failed ${s.url}: ${e}`); }
    // Without a classifier, treat government/legal source changes as needing a look.
    if (!anthropic && !DRY) c = { relevant: s.severity_hint !== 'low', severity: s.severity_hint ?? 'normal', summary: `Page changed: ${s.title ?? s.url}`, what_to_check: 'Classifier not configured; review the diff.' };
    const issue = c?.relevant ? await reportIssue(s, c, diffText) : undefined;
    st.hash = hash; st.last_changed = TODAY; fs.writeFileSync(snapFile, text);
    results.push({ s, outcome: 'changed', method: f.method, status: f.status, c, issue });
  } catch (e) {
    results.push({ s, outcome: 'error', err: String(e).slice(0, 200) });
  }
}

// Run hosts in parallel, one request at a time per host with a polite delay.
const byHost = new Map<string, Source[]>();
for (const s of due) { const h = (() => { try { return new URL(s.url).hostname; } catch { return 'invalid'; } })(); byHost.set(h, [...(byHost.get(h) ?? []), s]); }
const queues = [...byHost.values()];
const CONCURRENCY = 8;
let next = 0;
async function worker() {
  while (next < queues.length) {
    const q = queues[next++];
    for (const s of q) { await processSource(s); await new Promise((r) => setTimeout(r, 1500)); }
  }
}
console.log(`Monitoring ${due.length} source(s) across ${queues.length} host(s)${DRY ? ' (dry run)' : ''}...`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await (browser as Browser | null)?.close();
fs.writeFileSync(STATE_FILE, JSON.stringify(Object.fromEntries(Object.entries(state).sort()), null, 1));

// ---------- report ----------
const by = (o: Result['outcome']) => results.filter((r) => r.outcome === o);
const lines = [
  `# Monitor run ${TODAY} (${FREQ}${ONLY ? `, ${ONLY}` : ''})`, '',
  `| Outcome | Count |`, `|---|---|`,
  ...(['changed', 'unchanged', 'baseline', 'broken', 'blocked', 'error', 'manual'] as const).map((o) => `| ${o} | ${by(o).length} |`), '',
  `Fetched with a headless browser: ${results.filter((r) => r.method === 'browser').length}`, '',
  '## Relevant changes', '',
  ...by('changed').filter((r) => r.c?.relevant).map((r) => `- **${r.s.jurisdiction ?? 'US'}** [${r.c!.severity}] ${r.c!.summary} (${r.s.url})${r.issue ? ` → #${r.issue}` : ''}`), '',
  '## Changed but judged irrelevant', '',
  ...by('changed').filter((r) => r.c && !r.c.relevant).map((r) => `- ${r.s.jurisdiction ?? 'US'}: ${r.s.url}`), '',
  '## Broken links (page gone; fix the URL in content)', '',
  ...by('broken').map((r) => `- ${r.s.jurisdiction ?? 'US'}: ${r.s.url} (HTTP ${r.status}) in ${r.s.linked_content.join(', ')}`), '',
  '## Blocked (check by hand)', '',
  ...by('blocked').map((r) => `- ${r.s.jurisdiction ?? 'US'}: ${r.s.url} (HTTP ${r.status}, via ${r.method})`),
  ...by('manual').map((r) => `- ${r.s.jurisdiction ?? 'US'}: ${r.s.url} (manual: ${r.s.note ?? ''})`), '',
  '## Errors', '',
  ...by('error').map((r) => `- ${r.s.url}: ${r.err}`),
];
const REPORT_DIR = path.join(ROOT, 'sources/reports');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportFile = path.join(REPORT_DIR, `${TODAY}-${FREQ}${ONLY ? '-' + ONLY : ''}.md`);
fs.writeFileSync(reportFile, lines.join('\n') + '\n');
console.log(lines.slice(0, 12).join('\n'));
console.log(`Report: ${path.relative(ROOT, reportFile)}`);
