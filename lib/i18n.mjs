// Language choice, plural forms and sentence filling. No DOM here.

export const LANGUAGES = ['en', 'ru', 'pl'];
const LOCALES = { en: 'en-GB', ru: 'ru-RU', pl: 'pl-PL' };

export function pickLanguage(search, preferred = []) {
  const asked = new URLSearchParams(search).get('lang');
  if (LANGUAGES.includes(asked)) return asked;
  for (const tag of preferred) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (LANGUAGES.includes(primary)) return primary;
  }
  return 'en';
}

export function fill(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

/** forms is {one, few, many, other}; `other` is the fallback. */
export function plural(lang, count, forms) {
  const category = new Intl.PluralRules(LOCALES[lang] || LOCALES.en).select(count);
  return fill(forms[category] ?? forms.other, { n: count });
}

/** Per key: the translation when there is one, otherwise English. */
export function translator(lang, dictionary, english) {
  return (key, values = {}) => {
    const entry = dictionary?.[key] ?? english[key];
    if (entry === undefined) return undefined;
    if (typeof entry === 'string') return fill(entry, values);
    const used = dictionary?.[key] ? lang : 'en';
    return fill(plural(used, values.n ?? 0, entry), values);
  };
}

export function formatDate(lang, date) {
  return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Two-line month label; the year shows on the first drawn column and on every January. */
export function monthLabel(lang, key, isFirst) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return { month: key, year: '' };
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const month = new Intl.DateTimeFormat(LOCALES[lang], { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
  return { month, year: isFirst || match[2] === '01' ? match[1] : '' };
}
