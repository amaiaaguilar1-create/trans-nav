/**
 * Reading open `monitor` issues back from GitHub. Shared by monitor.ts (de-duplication: one open issue per source)
 * and build-changes.ts (the "change detected, under review" notices), so both agree on which issue stands for a source.
 *
 * Each monitor issue body ends with a hidden marker, `<!-- monitor: {"source":"<id>",...} -->`. The `source` field is
 * the registry id, which never changes, so it is the de-duplication key. Titles are not: they come from the summary.
 */

export type MonitorMarker = {
  source: string; url: string; jurisdiction: string; paths: string[]; severity: string; summary: string; detected: string;
};
export type MonitorIssue = { number: number; html_url: string; body: string | null; pull_request?: unknown };

const MARKER_RE = /<!-- monitor: (\{.*\}) -->/g;

/** The marker from an issue body, or null if the body has none or it is malformed. Uses the last marker in the body. */
export function parseMarker(body: string | null | undefined): MonitorMarker | null {
  if (!body) return null;
  const last = [...body.matchAll(MARKER_RE)].at(-1);
  if (!last) return null;
  try {
    const m = JSON.parse(last[1]) as Partial<MonitorMarker>;
    return typeof m.source === 'string' && m.source ? (m as MonitorMarker) : null;
  } catch {
    return null;
  }
}

/** One issue per source: the newest (highest number), which carries the latest diff. Issues without a marker are skipped. */
export function newestBySource<T extends MonitorIssue>(issues: T[]): Map<string, { issue: T; marker: MonitorMarker }> {
  const out = new Map<string, { issue: T; marker: MonitorMarker }>();
  for (const issue of issues) {
    const marker = parseMarker(issue.body);
    if (!marker) continue;
    const prev = out.get(marker.source);
    if (!prev || issue.number > prev.issue.number) out.set(marker.source, { issue, marker });
  }
  return out;
}

/** The `rel="next"` URL from a GitHub `Link` header, if any. */
export function nextPage(link: string | null): string | null {
  for (const part of link?.split(',') ?? []) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

const MAX_PAGES = 200; // 20,000 issues. Past this, fail loudly instead of de-duplicating against a partial list.

/**
 * Every open issue labeled `monitor`, following pagination to the end. Throws on any API error or if the list is
 * longer than MAX_PAGES: a partial list is exactly what let the monitor open duplicate issues before.
 */
export async function fetchOpenMonitorIssues(repo: string, token: string, fetchImpl: typeof fetch = fetch): Promise<MonitorIssue[]> {
  const issues: MonitorIssue[] = [];
  let url: string | null = `https://api.github.com/repos/${repo}/issues?state=open&labels=monitor&per_page=100`;
  for (let page = 0; url; page++) {
    if (page >= MAX_PAGES) throw new Error(`More than ${MAX_PAGES * 100} open monitor issues; refusing to work from a partial list`);
    const r: Response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(`GitHub ${r.status} ${url}: ${await r.text()}`);
    const batch = (await r.json()) as MonitorIssue[];
    issues.push(...batch.filter((i) => !i.pull_request)); // the issues endpoint also returns pull requests
    url = nextPage(r.headers.get('link'));
  }
  return issues;
}
