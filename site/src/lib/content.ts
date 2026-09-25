import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';
import type { DocumentGuide as Guide, StateMetadata, StateGenderAffirmingCareOverview, CityMetroResources, NationalOrMultiStateOrganization } from '../types/content';

export type LocalizedText = { en: string; es?: string };

/** Pick the right language, falling back to English. */
export function lt(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return (locale === 'es' && text.es) || text.en;
}

export const GUIDE_TYPES = ['name_change', 'drivers_license', 'birth_certificate'] as const;
export type StateGuideType = (typeof GUIDE_TYPES)[number];
export const guideSlug: Record<StateGuideType | 'care', string> = {
  name_change: 'name-change',
  drivers_license: 'drivers-license',
  birth_certificate: 'birth-certificate',
  care: 'care',
};

export interface StateBundle {
  code: string;
  meta: StateMetadata;
  guides: Partial<Record<StateGuideType, Guide>>;
  care?: StateGenderAffirmingCareOverview;
  cities: CityMetroResources[];
}

export async function loadStates(): Promise<StateBundle[]> {
  const files = await getCollection('stateFiles');
  const locals = await getCollection('localFiles');
  const byState = new Map<string, StateBundle>();
  for (const f of files) {
    const [codeLower, name] = f.id.split('/');
    const code = codeLower.toUpperCase();
    const bundle = byState.get(code) ?? { code, meta: undefined as unknown as StateMetadata, guides: {}, cities: [] };
    if (name === 'meta') bundle.meta = f.data as StateMetadata;
    else if (name === 'care') bundle.care = f.data as StateGenderAffirmingCareOverview;
    else bundle.guides[name.replace(/-/g, '_') as StateGuideType] = f.data as Guide;
    byState.set(code, bundle);
  }
  for (const l of locals) {
    const code = l.id.split('/')[0].toUpperCase();
    byState.get(code)?.cities.push(l.data as CityMetroResources);
  }
  return [...byState.values()].filter((b) => b.meta).sort((a, b) => a.code.localeCompare(b.code));
}

export async function loadFederal(): Promise<Guide[]> {
  const files = await getCollection('federal');
  return files.map((f) => f.data as Guide);
}

export async function loadOrgs(): Promise<Map<string, NationalOrMultiStateOrganization>> {
  const files = await getCollection('orgs');
  return new Map(files.map((f) => [(f.data as NationalOrMultiStateOrganization).id, f.data as NationalOrMultiStateOrganization]));
}

/** Days since last verification; used for the "overdue" badge. */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / 86_400_000);
}
export const OVERDUE_DAYS = 90;

/** Site base path from astro.config (e.g. "/trans-nav/" on GitHub Pages, "/" on a custom domain). Always ends with "/". */
export const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';

export function localePath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const suffix = clean ? `${clean}/` : '';
  return locale === 'en' ? `${BASE}${suffix}` : `${BASE}es/${suffix}`;
}

// ---------- monitored changes under review ----------
import fs from 'node:fs';
import nodePath from 'node:path';

export interface OpenChange { issue: number; url: string; jurisdiction: string; paths: string[]; severity: string; summary: string; detected: string }
let changesCache: OpenChange[] | null = null;
/** Open `monitor` issues, written to sources/changes.json by the deploy workflow. Empty locally. */
export function openChanges(): OpenChange[] {
  if (changesCache) return changesCache;
  // Builds run from site/; import.meta.url points into the bundle, so resolve from the working directory.
  const f = nodePath.resolve(process.cwd(), '../sources/changes.json');
  try { changesCache = JSON.parse(fs.readFileSync(f, 'utf8')) as OpenChange[]; } catch { changesCache = []; }
  return changesCache;
}
/** Repo-relative content path for a guide, matching the paths recorded on monitor issues. */
export function guidePath(g: { jurisdiction: string; guide_type: string }): string {
  const slug = g.guide_type.replace(/_/g, '-');
  return g.jurisdiction === 'US' ? `content/federal/${slug}.yaml` : `content/states/${g.jurisdiction}/${slug}.yaml`;
}
export function changesFor(path: string): OpenChange[] {
  return openChanges().filter((c) => c.paths.includes(path));
}
