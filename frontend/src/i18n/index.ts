import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage can be unavailable (privacy mode); fall through to navigator.
  }
  const navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  if (navigatorLanguage.startsWith('de')) return 'de';
  if (navigatorLanguage.startsWith('fr')) return 'fr';
  return 'en';
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
