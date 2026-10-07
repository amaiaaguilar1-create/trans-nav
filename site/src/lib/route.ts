/**
 * The route: the order most people update their documents in, with each stop resolved for one state.
 * Used by the state hub (the whole route), by guides (where you are, next and previous stop), and by federal guides
 * reached from a state (the `?from=` link carries the state so the route continues; nothing is stored).
 */
import type { Locale } from '../i18n/ui';
import type { DocumentGuide } from '../types/content';
import { t } from '../i18n/ui';
import { lt, localePath, guideSlug, type StateBundle } from './content';
import { tx, firstSentence } from './text';
import { docVerdict, type VerdictRow } from './verdict';

export type StopKey = 'name_change' | 'social_security' | 'drivers_license' | 'passport' | 'birth_certificate';
export interface Stop { key: StopKey; title: string; short: string; href: string; note: string; scope: string; federal: boolean; verdict: VerdictRow[] }

/** A guide's place on one state's route. */
export interface RouteContext { stops: Stop[]; current: string; state: string; hub: string }

export function routeFor(state: StateBundle, federal: DocumentGuide[], locale: Locale): Stop[] {
  const _ = t(locale);
  const code = state.code.toLowerCase();
  const base = `states/${code}`;
  const name = lt(state.meta.name, locale);
  const fed = (type: string) => federal.find((f) => f.guide_type === type);
  const fedHref = (slug: string) => `${localePath(locale, `federal/${slug}`)}?from=${code}`;
  const g = state.guides;
  const stops: Stop[] = [];
  const add = (key: StopKey, guide: DocumentGuide | undefined, title: string, short: string, href: string, scope: string, federal = false, note?: string) => {
    if (guide) stops.push({ key, title, short, href, scope, federal, note: note ?? firstSentence(lt(guide.status_summary, locale)), verdict: docVerdict(guide, locale) });
  };
  add('name_change', g.name_change, _('guide.name_change'), tx(locale, 'Name change', 'Cambio de nombre'), localePath(locale, `${base}/${guideSlug.name_change}`), tx(locale, 'State court', 'Tribunal estatal'));
  add('social_security', fed('social_security'), _('guide.social_security'), tx(locale, 'Social Security', 'Seguro Social'), fedHref('social-security'), tx(locale, 'Federal, same in every state', 'Federal, igual en todos los estados'), true);
  add('drivers_license', g.drivers_license, _('guide.drivers_license'), tx(locale, 'License or ID', 'Licencia o ID'), localePath(locale, `${base}/${guideSlug.drivers_license}`), tx(locale, `${name} DMV`, `DMV de ${name}`));
  add('passport', fed('passport'), _('guide.passport'), tx(locale, 'Passport', 'Pasaporte'), fedHref('passport'), tx(locale, 'Federal, same in every state', 'Federal, igual en todos los estados'), true);
  add('birth_certificate', g.birth_certificate, _('guide.birth_certificate'), tx(locale, 'Birth certificate', 'Acta de nacimiento'), localePath(locale, `${base}/${guideSlug.birth_certificate}`), tx(locale, `Only if born in ${name}`, `Solo si naciste en ${name}`));
  return stops;
}
