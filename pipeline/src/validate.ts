/**
 * Validates every YAML file under content/ (and sources/registry.yaml) against its JSON Schema,
 * then runs cross-reference checks that JSON Schema can't express:
 *  - every `sources: [id]` reference resolves to this document's `sources[]`
 *  - every step's `forms`/`fees` ids resolve
 *  - every source id is unique within a document
 *  - org references (`org:` / `telehealth_hrt`) resolve to content/orgs
 *  - state meta `guides` / `cities` point at files that exist
 *  - `review.es_status: reviewed` requires `es` on every LocalizedText
 * Exits 1 on any error. Run: npm run validate
 */
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadContent, loadSchemas, type ContentFile } from './load.js';
import { schemaFor, ROOT } from './paths.js';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);

const schemas = loadSchemas();
for (const [name, schema] of Object.entries(schemas)) {
  // Register under the bare filename so relative `$ref: "common.json#/..."` resolves.
  ajv.addSchema({ ...schema, $id: name });
}

const errors: string[] = [];
const err = (file: string, msg: string) => errors.push(`${file}: ${msg}`);

const files = loadContent();
const orgIds = new Set(
  files.filter((f) => f.rel.startsWith('content/orgs/') && f.data).map((f) => (f.data as { id: string }).id),
);

// ---- helpers -------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Depth-first walk yielding every object with its JSON-pointer-ish path. */
function* objects(node: unknown, at = ''): Generator<[Obj, string]> {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* objects(node[i], `${at}[${i}]`);
  } else if (isObj(node)) {
    yield [node, at];
    for (const [k, v] of Object.entries(node)) yield* objects(v, at ? `${at}.${k}` : k);
  }
}

function isLocalizedText(o: Obj): boolean {
  const keys = Object.keys(o);
  return typeof o.en === 'string' && keys.every((k) => k === 'en' || k === 'es');
}

// ---- per-file checks -----------------------------------------------------

function checkFile(f: ContentFile) {
  if (f.parseError) return err(f.rel, `YAML parse error: ${f.parseError}`);
  const schemaName = schemaFor(f.rel);
  if (!schemaName) return err(f.rel, 'no schema mapped for this path (see pipeline/src/paths.ts)');
  const validate = ajv.getSchema(schemaName);
  if (!validate) return err(f.rel, `schema ${schemaName} not loaded`);

  if (!validate(f.data)) {
    for (const e of validate.errors ?? []) {
      err(f.rel, `${e.instancePath || '/'} ${e.message ?? ''}${e.params ? ' ' + JSON.stringify(e.params) : ''}`);
    }
    return; // cross-ref checks assume structural validity
  }

  const doc = f.data as Obj;

  // Source ids: unique, and every `sources: [..]` ref resolves.
  const sourceList = Array.isArray(doc.sources) ? (doc.sources as Obj[]) : [];
  const sourceIds = new Set<string>();
  for (const s of sourceList) {
    if (typeof s.id === 'string') {
      if (sourceIds.has(s.id)) err(f.rel, `duplicate source id "${s.id}"`);
      sourceIds.add(s.id);
    }
  }
  const formIds = new Set((Array.isArray(doc.forms) ? (doc.forms as Obj[]) : []).map((x) => String(x.id)));
  const feeIds = new Set((Array.isArray(doc.fees) ? (doc.fees as Obj[]) : []).map((x) => String(x.id)));
  const usedSources = new Set<string>();

  for (const [o, at] of objects(doc)) {
    if (at === '' ) continue; // top-level `sources` is the list itself, not a ref
    if (Array.isArray(o.sources) && o.sources.every((x) => typeof x === 'string')) {
      for (const id of o.sources as string[]) {
        usedSources.add(id);
        if (!sourceIds.has(id)) err(f.rel, `${at}.sources references unknown source id "${id}"`);
      }
    }
    if (Array.isArray(o.forms) && at.startsWith('steps') || (Array.isArray(o.forms) && at === 'fee_waiver') || (Array.isArray(o.forms) && at === 'minors')) {
      for (const id of o.forms as string[]) if (!formIds.has(id)) err(f.rel, `${at}.forms references unknown form id "${id}"`);
    }
    if (Array.isArray(o.fees) && at.startsWith('steps')) {
      for (const id of o.fees as string[]) if (!feeIds.has(id)) err(f.rel, `${at}.fees references unknown fee id "${id}"`);
    }
    if (typeof o.org === 'string' && !orgIds.has(o.org)) err(f.rel, `${at}.org references unknown org "${o.org}"`);
  }
  if (Array.isArray(doc.telehealth_hrt)) {
    for (const id of doc.telehealth_hrt as string[]) if (!orgIds.has(id)) err(f.rel, `telehealth_hrt references unknown org "${id}"`);
  }
  // Org files cite at the document level (their `sources` back the whole record), so skip the per-claim check there.
  if (schemaName !== 'org.json') {
    for (const id of sourceIds) if (!usedSources.has(id)) err(f.rel, `source "${id}" is declared but never cited (delete it or cite it)`);
  }

  // Translation completeness.
  const review = isObj(doc.review) ? doc.review : null;
  if (review?.es_status === 'reviewed') {
    for (const [o, at] of objects(doc)) {
      if (isLocalizedText(o) && typeof o.es !== 'string') err(f.rel, `${at} is missing "es" but review.es_status is "reviewed"`);
    }
  }

  // State meta: guides and cities exist on disk.
  if (schemaName === 'state-meta.json') {
    const dir = path.dirname(f.abs);
    const guideFile: Record<string, string> = {
      name_change: 'name-change.yaml',
      drivers_license: 'drivers-license.yaml',
      birth_certificate: 'birth-certificate.yaml',
      care: 'care.yaml',
    };
    for (const g of (doc.guides as string[]) ?? []) {
      if (!fs.existsSync(path.join(dir, guideFile[g]))) err(f.rel, `guides lists "${g}" but ${guideFile[g]} does not exist`);
    }
    for (const c of (doc.cities as string[]) ?? []) {
      if (!fs.existsSync(path.join(dir, 'local', `${c}.yaml`))) err(f.rel, `cities lists "${c}" but local/${c}.yaml does not exist`);
    }
    if (doc.code !== path.basename(dir)) err(f.rel, `code "${doc.code}" does not match directory name "${path.basename(dir)}"`);
  }

  // Guides: jurisdiction must match directory; guide_type must match filename.
  if (schemaName === 'guide.json' && f.rel.startsWith('content/states/')) {
    const state = f.rel.split('/')[2];
    if (doc.jurisdiction !== state) err(f.rel, `jurisdiction "${doc.jurisdiction}" does not match directory "${state}"`);
    const expected = path.basename(f.rel, '.yaml').replace(/-/g, '_');
    if (doc.guide_type !== expected) err(f.rel, `guide_type "${doc.guide_type}" does not match filename (expected "${expected}")`);
  }
  if (schemaName === 'guide.json' && f.rel.startsWith('content/federal/') && doc.jurisdiction !== 'US') {
    err(f.rel, `federal guides must have jurisdiction "US"`);
  }
  if (schemaName === 'local.json') {
    const state = f.rel.split('/')[2];
    if (doc.jurisdiction !== state) err(f.rel, `jurisdiction "${doc.jurisdiction}" does not match directory "${state}"`);
    if (doc.slug !== path.basename(f.rel, '.yaml')) err(f.rel, `slug "${doc.slug}" does not match filename`);
  }
}

for (const f of files) checkFile(f);

if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s) in ${files.length} file(s):\n`);
  for (const e of errors) console.error('  ' + e);
  console.error('');
  process.exit(1);
}
console.log(`✔ ${files.length} content file(s) valid (${path.relative(process.cwd(), ROOT) || '.'})`);
