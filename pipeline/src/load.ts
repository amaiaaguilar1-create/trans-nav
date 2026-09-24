import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { CONTENT_DIR, ROOT, SCHEMA_DIR } from './paths.js';

export interface ContentFile {
  /** Repo-relative path with forward slashes, e.g. content/states/CA/name-change.yaml */
  rel: string;
  abs: string;
  data: unknown;
  parseError?: string;
}

export function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.ya?ml$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

export function loadContent(): ContentFile[] {
  const files = [...walk(CONTENT_DIR), path.join(ROOT, 'sources', 'registry.yaml')].filter((f) => fs.existsSync(f));
  return files.map((abs) => {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    try {
      return { rel, abs, data: YAML.parse(fs.readFileSync(abs, 'utf8')) };
    } catch (e) {
      // Surface YAML syntax errors as ordinary validation failures instead of a crash.
      return { rel, abs, data: undefined, parseError: (e as Error).message.split('\n')[0] };
    }
  });
}

export function loadSchemas(): Record<string, object> {
  const out: Record<string, object> = {};
  for (const f of fs.readdirSync(SCHEMA_DIR)) {
    if (f.endsWith('.json')) out[f] = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8'));
  }
  return out;
}
