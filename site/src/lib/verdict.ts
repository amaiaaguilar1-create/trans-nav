/**
 * Verdicts: the answer layer. Every document answers separate questions (update the name? change the gender marker?),
 * and each gets its own row with a status, a one-word answer and a short qualifier. One collapsed status per document
 * hides that a name can change while the marker cannot, so nothing on the site shows a document with a single status.
 */
import type { Locale } from '../i18n/ui';
import type { DocumentGuide, StateGenderAffirmingCareOverview } from '../types/content';
import { tx, type Status } from './text';

export interface VerdictRow {
  key: string;
  /** Label for the question, e.g. "Update your name". */
  label: string;
  /** Short label for compact layouts and table headers, e.g. "Name". */
  short: string;
  /** Glossary term id to define the label in place. */
  term?: string;
  status: Status;
  /** One or two words: Yes, No, Limited, In court, Unclear (or a kind-specific word). */
  answer: string;
  /** Qualifier: which options, what you need. Optional. */
  detail?: string;
}

const ANSWER: Record<Status, [string, string]> = {
  available: ['Yes', 'Sí'], restricted: ['Limited', 'Limitado'], prohibited: ['No', 'No'], litigation: ['In court', 'En tribunales'], unclear: ['Unclear', 'Poco claro'],
};
const CARE: Record<Status, [string, string]> = {
  available: ['Allowed', 'Permitida'], restricted: ['Limited', 'Limitada'], prohibited: ['Banned', 'Prohibida'], litigation: ['In court', 'En tribunales'], unclear: ['Unclear', 'Poco claro'],
};
export const answerWord = (s: Status, locale: Locale, kind: 'doc' | 'care' = 'doc') => { const [en, es] = (kind === 'care' ? CARE : ANSWER)[s]; return tx(locale, en, es); };

const NEED: Record<string, [string, string]> = {
  self_attestation: ['your own signed form', 'tu propia declaración firmada'],
  provider_letter_any: ['a letter from a provider', 'una carta de un proveedor'],
  provider_letter_limited: ['a letter from a doctor', 'una carta de un médico'],
  court_order: ['a court order', 'una orden judicial'],
  amended_birth_certificate: ['an amended birth certificate', 'un acta de nacimiento enmendada'],
  surgery_proof: ['proof of surgery', 'prueba de cirugía'],
};

const list = (items: string[], locale: Locale) => new Intl.ListFormat(locale === 'es' ? 'es' : 'en', { style: 'long', type: 'disjunction' }).format(items);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "M, F, or X with your own signed form" / "Cannot be changed" / "Requirements unclear". */
export function markerDetail(g: Pick<DocumentGuide, 'status' | 'markers_available' | 'requirement_type'>, locale: Locale): string | undefined {
  if (g.status === 'prohibited' || g.requirement_type === 'prohibited') return tx(locale, 'Cannot be changed right now', 'No se puede cambiar por ahora');
  // Unclear: never present a route as if it works. Litigation: whatever works today may change.
  if (g.status === 'unclear') return tx(locale, 'No written policy; see details', 'Sin política escrita; mira los detalles');
  const d = markerRoute(g, locale);
  if (!d || g.status !== 'litigation') return d;
  const lower = /^(With|Con|Se) /.test(d) ? d.charAt(0).toLowerCase() + d.slice(1) : d; // keep marker letters (M, F, X) capitalized
  return tx(locale, `For now: ${lower}`, `Por ahora: ${lower}`);
}

function markerRoute(g: Pick<DocumentGuide, 'status' | 'markers_available' | 'requirement_type'>, locale: Locale): string | undefined {
  const need = g.requirement_type && NEED[g.requirement_type] ? tx(locale, ...NEED[g.requirement_type]) : undefined;
  const opts = g.markers_available?.length ? list(g.markers_available, locale) : undefined;
  if (opts && need) return tx(locale, `${opts} with ${need}`, `${opts} con ${need}`);
  if (need) return cap(tx(locale, `with ${need}`, `con ${need}`));
  if (opts) return tx(locale, `${opts} offered`, `Se ofrece ${opts}`);
  if (g.requirement_type === 'unclear') return tx(locale, 'Requirements are unclear', 'Requisitos poco claros');
  return undefined;
}

function nameChangeDetail(g: DocumentGuide, locale: Locale): string | undefined {
  const part = (v: 'yes' | 'no' | 'conditional' | undefined, yes: [string, string], no: [string, string], cond: [string, string]) =>
    v === 'yes' ? tx(locale, ...yes) : v === 'no' ? tx(locale, ...no) : v === 'conditional' ? tx(locale, ...cond) : undefined;
  const parts = [
    part(g.publication?.required, ['newspaper notice required', 'se exige aviso en periódico'], ['no newspaper notice', 'sin aviso en periódico'], ['newspaper notice sometimes', 'aviso en periódico a veces']),
    part(g.hearing?.required, ['court hearing required', 'se exige audiencia'], ['no hearing', 'sin audiencia'], ['hearing sometimes', 'audiencia a veces']),
  ].filter(Boolean) as string[];
  return parts.length ? cap(parts.join(', ')) : undefined;
}

/** What a name answer means in practice, without claiming more than the status says. */
function nameDetail(s: Status, locale: Locale): string | undefined {
  return {
    available: tx(locale, 'After your legal name change', 'Después de tu cambio legal de nombre'),
    restricted: undefined,
    prohibited: tx(locale, 'Cannot be changed right now', 'No se puede cambiar por ahora'),
    litigation: tx(locale, 'Changing because of a court case', 'Cambiando por un caso judicial'),
    unclear: tx(locale, 'No clear rule; see details', 'Sin regla clara; mira los detalles'),
  }[s];
}

/** The questions a document guide answers, in a fixed order: name first, then marker. */
export function docVerdict(g: DocumentGuide, locale: Locale, opts: { expanded?: boolean } = {}): VerdictRow[] {
  if (g.guide_type === 'name_change') {
    const name: VerdictRow = { key: 'name', label: tx(locale, 'Change your legal name', 'Cambiar tu nombre legal'), short: tx(locale, 'Name', 'Nombre'), status: g.status, answer: answerWord(g.status, locale), detail: nameChangeDetail(g, locale) };
    if (!opts.expanded) return [name];
    // Expanded (top of the name-change guide): the burdens people worry about each get their own answer.
    const burden = (v: 'yes' | 'no' | 'conditional'): [Status, string] => v === 'no' ? ['available', tx(locale, 'Not required', 'No se exige')] : v === 'yes' ? ['restricted', tx(locale, 'Required', 'Se exige')] : ['restricted', tx(locale, 'Sometimes', 'A veces')];
    const rows: VerdictRow[] = [{ ...name, detail: undefined }];
    if (g.publication) { const [st, a] = burden(g.publication.required); rows.push({ key: 'publication', label: tx(locale, 'Newspaper notice', 'Aviso en periódico'), short: tx(locale, 'Newspaper', 'Periódico'), term: 'publication', status: st, answer: a }); }
    if (g.hearing) { const [st, a] = burden(g.hearing.required); rows.push({ key: 'hearing', label: tx(locale, 'Court hearing', 'Audiencia'), short: tx(locale, 'Hearing', 'Audiencia'), status: st, answer: a }); }
    if (g.confidentiality) rows.push({ key: 'sealing', label: tx(locale, 'Keep the record private', 'Mantener el expediente privado'), short: tx(locale, 'Private record', 'Expediente privado'), term: 'sealing', status: g.confidentiality.sealing_available ? 'available' : 'unclear', answer: g.confidentiality.sealing_available ? tx(locale, 'Possible', 'Posible') : tx(locale, 'Not offered', 'No se ofrece') });
    return rows;
  }
  const rows: VerdictRow[] = [];
  if (!g.name_change_status) rows.push({ key: 'name', label: tx(locale, 'Update your name', 'Actualizar tu nombre'), short: tx(locale, 'Name', 'Nombre'), status: 'unclear', answer: answerWord('unclear', locale), detail: tx(locale, 'Not covered in this guide yet', 'Esta guía aún no lo cubre') });
  else rows.push({ key: 'name', label: tx(locale, 'Update your name', 'Actualizar tu nombre'), short: tx(locale, 'Name', 'Nombre'), status: g.name_change_status, answer: answerWord(g.name_change_status, locale), detail: nameDetail(g.name_change_status, locale) });
  rows.push({ key: 'marker', label: tx(locale, 'Change your gender marker', 'Cambiar tu marcador de género'), short: tx(locale, 'Gender marker', 'Marcador de género'), term: 'gender-marker', status: g.status, answer: answerWord(g.status, locale), detail: markerDetail(g, locale) });
  return rows;
}

const yesNo = (v: 'yes' | 'no' | 'partial' | 'unclear' | boolean | undefined): Status | undefined =>
  v === true || v === 'yes' ? 'available' : v === false || v === 'no' ? 'prohibited' : v === 'partial' ? 'restricted' : v === 'unclear' ? 'unclear' : undefined;

export function careVerdict(c: StateGenderAffirmingCareOverview, locale: Locale, opts: { coverage?: boolean } = {}): VerdictRow[] {
  const rows: VerdictRow[] = [
    { key: 'adult', label: tx(locale, 'Care for adults', 'Atención para adultos'), short: tx(locale, 'Adults', 'Adultos'), status: c.adult_care.status, answer: answerWord(c.adult_care.status, locale, 'care') },
    { key: 'minor', label: tx(locale, 'Care for people under 18', 'Atención para menores de 18'), short: tx(locale, 'Under 18', 'Menores de 18'), status: c.minor_care.status, answer: answerWord(c.minor_care.status, locale, 'care') },
  ];
  if (!opts.coverage) return rows;
  const program = c.medicaid.program_name ?? 'Medicaid';
  const covers = (v: 'yes' | 'no' | 'partial' | 'unclear') => ({ yes: tx(locale, 'Covered', 'Cubierto'), no: tx(locale, 'Not covered', 'No cubierto'), partial: tx(locale, 'Partly', 'En parte'), unclear: tx(locale, 'Unclear', 'Poco claro') })[v];
  const hrt = yesNo(c.medicaid.covers_hrt), surg = yesNo(c.medicaid.covers_surgery);
  if (hrt) rows.push({ key: 'hrt', label: tx(locale, `${program} pays for hormones`, `${program} paga hormonas`), short: tx(locale, 'Hormones', 'Hormonas'), status: hrt, answer: covers(c.medicaid.covers_hrt) });
  if (surg) rows.push({ key: 'surgery', label: tx(locale, `${program} pays for surgery`, `${program} paga cirugía`), short: tx(locale, 'Surgery', 'Cirugía'), status: surg, answer: covers(c.medicaid.covers_surgery) });
  if (c.private_insurance) {
    const p = yesNo(c.private_insurance.nondiscrimination_protection)!;
    rows.push({ key: 'private', label: tx(locale, 'Private plans must cover care', 'Los planes privados deben cubrir la atención'), short: tx(locale, 'Private insurance', 'Seguro privado'), status: p === 'available' ? p : 'unclear', answer: p === 'available' ? tx(locale, 'Yes, by law', 'Sí, por ley') : tx(locale, 'No state rule', 'Sin regla estatal') });
  }
  return rows;
}
