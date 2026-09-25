import type { Locale } from '../i18n/ui';

/** Inline bilingual copy for site chrome added in the redesign. */
export const tx = (locale: Locale, en: string, es: string) => (locale === 'es' ? es : en);

/** First sentence of a paragraph, for compact summaries. Falls back to a word-boundary cut. */
export function firstSentence(s: string | undefined, max = 180): string {
  if (!s) return '';
  const clean = s.replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  const m = clean.match(/^(.{30,}?[.!?])(\s|$)/);
  const out = m ? m[1] : clean;
  if (out.length <= max) return out;
  const cut = out.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

export type Status = 'available' | 'restricted' | 'prohibited' | 'litigation' | 'unclear';

export const statusShort: Record<Status, { en: string; es: string }> = {
  available: { en: 'Possible', es: 'Posible' },
  restricted: { en: 'Limited', es: 'Limitado' },
  prohibited: { en: 'Not possible', es: 'No es posible' },
  litigation: { en: 'In court', es: 'En tribunales' },
  unclear: { en: 'Unclear', es: 'Poco claro' },
};

export const requirementLabel: Record<string, { en: string; es: string }> = {
  self_attestation: { en: 'Your own signed form', es: 'Tu propia declaración firmada' },
  provider_letter_any: { en: 'Letter from a provider', es: 'Carta de un proveedor' },
  provider_letter_limited: { en: 'Letter from a doctor', es: 'Carta de un médico' },
  court_order: { en: 'Court order', es: 'Orden judicial' },
  amended_birth_certificate: { en: 'Amended birth certificate', es: 'Acta de nacimiento enmendada' },
  surgery_proof: { en: 'Proof of surgery', es: 'Prueba de cirugía' },
  prohibited: { en: 'Not allowed', es: 'No permitido' },
  unclear: { en: 'Unclear', es: 'Poco claro' },
};
