/** Run with `npm test -w pipeline`. No network: GitHub is faked. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpenMonitorIssues, newestBySource, nextPage, parseMarker, type MonitorIssue } from './monitor-issues.js';

const marker = (source: string, extra: Record<string, unknown> = {}) =>
  `<!-- monitor: ${JSON.stringify({ source, url: `https://example.gov/${source}`, jurisdiction: 'US', paths: [`content/federal/${source}.yaml`], severity: 'normal', summary: `Page changed: ${source}`, detected: '2026-11-01', ...extra })} -->`;
const issue = (number: number, source: string | null): MonitorIssue => ({
  number, html_url: `https://github.com/o/r/issues/${number}`,
  body: source ? `**Page changed**\n\n<details>diff</details>\n\n${marker(source)}` : 'A hand-written issue with no marker',
});

test('parseMarker reads the source id and ignores bodies without a valid marker', () => {
  assert.equal(parseMarker(issue(1, 'orr-v-trump-aclu').body)?.source, 'orr-v-trump-aclu');
  assert.equal(parseMarker('no marker here'), null);
  assert.equal(parseMarker(null), null);
  assert.equal(parseMarker('<!-- monitor: {not json} -->'), null);
  assert.equal(parseMarker('<!-- monitor: {"url":"x"} -->'), null, 'a marker without a source id is not usable');
});

test('source ids match exactly, not by prefix', () => {
  const byId = newestBySource([issue(1, 'ca-dmv'), issue(2, 'ca-dmv-forms')]);
  assert.equal(byId.get('ca-dmv')?.issue.number, 1);
  assert.equal(byId.get('ca-dmv-forms')?.issue.number, 2);
});

test('newestBySource keeps the highest-numbered issue per source', () => {
  const byId = newestBySource([issue(557, 'orr'), issue(105, 'orr'), issue(318, 'orr'), issue(9, 'other'), issue(10, null)]);
  assert.equal(byId.size, 2);
  assert.equal(byId.get('orr')?.issue.number, 557);
  assert.equal(byId.get('other')?.issue.number, 9);
});

test('nextPage reads rel="next" from a GitHub Link header', () => {
  const link = '<https://api.github.com/repositories/1/issues?page=3>; rel="next", <https://api.github.com/repositories/1/issues?page=8>; rel="last"';
  assert.equal(nextPage(link), 'https://api.github.com/repositories/1/issues?page=3');
  assert.equal(nextPage('<https://x/issues?page=1>; rel="prev"'), null);
  assert.equal(nextPage(null), null);
});

/** Fake GitHub: serves `all` newest-first, 100 per page, with Link headers like the real API. */
function fakeGitHub(all: (MonitorIssue & { pull_request?: unknown })[]) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    const page = Number(url.searchParams.get('page') ?? 1);
    const pages = Math.max(1, Math.ceil(all.length / 100));
    const next = new URL(url); next.searchParams.set('page', String(page + 1));
    const headers = new Headers(page < pages ? { link: `<${next}>; rel="next"` } : {});
    return new Response(JSON.stringify(all.slice((page - 1) * 100, page * 100)), { status: 200, headers });
  }) as typeof fetch;
  return { impl, calls };
}

test('fetchOpenMonitorIssues finds an issue past the first 100 (the duplicate-issue bug)', async () => {
  // 250 open issues, newest first. The one for "orr" is the oldest, on page 3, where per_page=100 never looked.
  const all = Array.from({ length: 249 }, (_, k) => issue(1000 - k, `source-${k}`)).concat(issue(105, 'orr'));
  const { impl, calls } = fakeGitHub(all);
  const issues = await fetchOpenMonitorIssues('o/r', 't', impl);
  assert.equal(calls.length, 3);
  assert.equal(issues.length, 250);
  assert.equal(newestBySource(issues).get('orr')?.issue.number, 105);
});

test('fetchOpenMonitorIssues drops pull requests and fails loudly on API errors', async () => {
  const { impl } = fakeGitHub([issue(2, 'a'), { ...issue(3, 'b'), pull_request: {} }]);
  assert.deepEqual((await fetchOpenMonitorIssues('o/r', 't', impl)).map((i) => i.number), [2]);

  const failing = (async () => new Response('rate limited', { status: 403 })) as unknown as typeof fetch;
  await assert.rejects(fetchOpenMonitorIssues('o/r', 't', failing), /GitHub 403/);
});
