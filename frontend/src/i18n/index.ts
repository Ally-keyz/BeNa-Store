import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageFromTags } from './detect';
import en from './en';
import de from './de';
import fr from './fr';

export const SUPPORTED_LANGUAGES = ['de', 'en', 'fr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'bena.lang';

function isLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.some((code) => code === value);
}

export function detectLanguage(): Language {
  // An explicit choice made with the language switch wins on later visits.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage can be unavailable (privacy mode); fall through to navigator.
  }

  if (typeof navigator === 'undefined') return 'en';

  // Use the full ordered preference list, not only the primary tag. This covers
  // devices whose first language is unsupported but whose second is German,
  // English or French.
  const tags =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  return languageFromTags(tags) ?? 'en';
}

const initialLanguage = detectLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
});

function syncDocumentLanguage(language: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

syncDocumentLanguage(initialLanguage);

i18n.on('languageChanged', (language) => {
  syncDocumentLanguage(language);
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage failures.
  }
});

export default i18n;
