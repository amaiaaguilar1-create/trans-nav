import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const SCHEMA_DIR = path.join(ROOT, 'schema');
export const SOURCES_DIR = path.join(ROOT, 'sources');
export const SITE_TYPES_OUT = path.join(ROOT, 'site', 'src', 'types', 'content.d.ts');

/** Map a repo-relative content path to the schema that governs it. */
export function schemaFor(relPath: string): string | null {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'content/glossary.yaml') return 'glossary.json';
  if (p.startsWith('content/orgs/')) return 'org.json';
  if (p.startsWith('content/federal/')) return 'guide.json';
  if (p.startsWith('content/states/')) {
    const base = path.posix.basename(p);
    if (p.includes('/local/')) return 'local.json';
    if (base === 'meta.yaml') return 'state-meta.json';
    if (base === 'care.yaml') return 'care.json';
    return 'guide.json';
  }
  if (p === 'sources/registry.yaml') return 'source-registry.json';
  return null;
}
