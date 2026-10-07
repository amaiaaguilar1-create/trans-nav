/**
 * The route: the order most people update their documents in, with each stop resolved for one state.
 * Used by the state hub (the whole route), and by guides (step N of M, next and previous stop).
 */
import type { Locale } from '../i18n/ui';
import type { DocumentGuide } from '../types/content';
import { t } from '../i18n/ui';
import { lt, localePath, guideSlug, type StateBundle } from './content';
import { tx, firstSentence, type Status } from './text';

export type StopKey = 'name_change' | 'social_security' | 'drivers_license' | 'passport' | 'birth_certificate';
export interface Stop { key: StopKey; title: string; href: string; status: Status; note: string; scope: string; federal: boolean }

export function routeFor(state: StateBundle, federal: DocumentGuide[], locale: Locale): Stop[] {
  const _ = t(locale);
  const base = `states/${state.code.toLowerCase()}`;
  const name = lt(state.meta.name, locale);
  const fed = (type: string) => federal.find((f) => f.guide_type === type);
  const g = state.guides;
  const stops: Stop[] = [];
  if (g.name_change) stops.push({ key: 'name_change', title: _('guide.name_change'), href: localePath(locale, `${base}/${guideSlug.name_change}`), status: g.name_change.status, note: firstSentence(lt(g.name_change.status_summary, locale)), scope: tx(locale, 'State court', 'Tribunal estatal'), federal: false });
  const ssa = fed('social_security');
  if (ssa) stops.push({ key: 'social_security', title: _('guide.social_security'), href: localePath(locale, 'federal/social-security'), status: ssa.status, note: tx(locale, 'Update your name here next. The sex field cannot be changed right now.', 'Actualiza tu nombre aquí después. El campo de sexo no se puede cambiar por ahora.'), scope: tx(locale, 'Federal', 'Federal'), federal: true });
  if (g.drivers_license) stops.push({ key: 'drivers_license', title: _('guide.drivers_license'), href: localePath(locale, `${base}/${guideSlug.drivers_license}`), status: g.drivers_license.status, note: firstSentence(lt(g.drivers_license.status_summary, locale)), scope: tx(locale, 'State', 'Estatal'), federal: false });
  const pp = fed('passport');
  if (pp) stops.push({ key: 'passport', title: _('guide.passport'), href: localePath(locale, 'federal/passport'), status: pp.status, note: tx(locale, 'Name changes work. New passports show sex at birth while the case is in court.', 'Los cambios de nombre funcionan. Los pasaportes nuevos muestran el sexo al nacer mientras el caso sigue en tribunales.'), scope: tx(locale, 'Federal', 'Federal'), federal: true });
  if (g.birth_certificate) stops.push({ key: 'birth_certificate', title: _('guide.birth_certificate'), href: localePath(locale, `${base}/${guideSlug.birth_certificate}`), status: g.birth_certificate.status, note: firstSentence(lt(g.birth_certificate.status_summary, locale)), scope: tx(locale, `If born in ${name}`, `Si naciste en ${name}`), federal: false });
  return stops;
}
