/**
 * Ingests HRSA's public list of health center sites (federally qualified health centers and look-alikes) into
 * site/public/data/health-centers/<STATE>.json for the care pages. These centers must see patients regardless of
 * insurance or ability to pay and charge on a sliding scale; many, not all, offer gender-affirming hormone therapy.
 * Source: https://data.hrsa.gov/data/download (Health Center Service Delivery and Look-Alike Sites). Public domain.
 * Run: npm run ingest:hrsa -w pipeline   (monthly workflow)
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { ROOT } from '../paths.js';

const URL_CSV = 'https://data.hrsa.gov/DataDownload/DD_Files/Health_Center_Service_Delivery_and_LookAlike_Sites.csv';
const OUT = path.join(ROOT, 'site/public/data/health-centers');

const res = await fetch(URL_CSV, { headers: { 'user-agent': 'Mozilla/5.0 (trans-nav data ingest)' }, signal: AbortSignal.timeout(180_000) });
if (!res.ok) throw new Error(`HRSA download failed: ${res.status}`);
const rows = parse(await res.text(), { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];

// Keep walk-in-able permanent clinics. Drop school-based, carceral, nursing-home, and domestic-violence-shelter
// sites (not open to the public, or confidential), plus mobile and seasonal sites whose locations move.
const EXCLUDE_SETTINGS = /school|correctional|carceral|nursing home|domestic violence/i;
// Also drop back-office sites that appear in the list but do not see patients.
const BACK_OFFICE = /administrat|information technology|\bIT\b|billing|warehouse|corporate office|call center|headquarters/i;
const keep = rows.filter((r) =>
  !BACK_OFFICE.test(r['Site Name'] ?? '') &&
  r['Site Status Description'] === 'Active' &&
  r['Health Center Location Type Description'] === 'Permanent' &&
  !EXCLUDE_SETTINGS.test(r['Health Center Service Delivery Site Location Setting Description'] ?? ''),
);

const phone = (p: string) => { const d = (p ?? '').replace(/\D/g, ''); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : p || undefined; };
const web = (w: string) => { if (!w) return undefined; const u = w.trim(); return /^https?:\/\//i.test(u) ? u : `https://${u}`; };

const byState = new Map<string, unknown[]>();
for (const r of keep) {
  const st = r['Site State Abbreviation'];
  if (!/^[A-Z]{2}$/.test(st)) continue;
  const lon = Number(r['Geocoding Artifact Address Primary X Coordinate']);
  const lat = Number(r['Geocoding Artifact Address Primary Y Coordinate']);
  byState.set(st, [...(byState.get(st) ?? []), {
    n: r['Site Name'], o: r['Health Center Name'], a: r['Site Address'], c: r['Site City'], z: (r['Site Postal Code'] ?? '').slice(0, 5),
    co: r['Complete County Name'] || undefined, p: phone(r['Site Telephone Number']), w: web(r['Site Web Address']),
    h: Number(r['Operating Hours per Week']) || undefined,
    lat: Number.isFinite(lat) && lat !== 0 ? Math.round(lat * 1e4) / 1e4 : undefined,
    lon: Number.isFinite(lon) && lon !== 0 ? Math.round(lon * 1e4) / 1e4 : undefined,
  }]);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const fetched = new Date().toISOString().slice(0, 10);
for (const [st, sites] of byState) {
  (sites as { c: string; n: string }[]).sort((x, y) => x.c.localeCompare(y.c) || x.n.localeCompare(y.n));
  fs.writeFileSync(path.join(OUT, `${st}.json`), JSON.stringify({ source: URL_CSV, fetched, count: sites.length, sites }));
}
console.log(`✔ ${keep.length} of ${rows.length} sites kept, ${byState.size} states/territories → site/public/data/health-centers/`);
