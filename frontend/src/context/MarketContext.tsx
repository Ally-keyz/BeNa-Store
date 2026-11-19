import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n, { type Language } from '@/i18n';
import { getLocalization } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { readStorage, writeStorage } from '@/lib/storage';
import type { LocalizationInfo } from '@/types';

const COUNTRY_KEY = 'bena.country';
const DEFAULT_COUNTRY = 'DE';

export interface MarketContextValue {
  country: string;
  language: Language;
  setCountry: (country: string) => void;
  setLanguage: (language: Language) => void;
  localization: LocalizationInfo | undefined;
  isLoading: boolean;
  countries: Array<{ isoCode: string; name: string; currency: string }>;
  /** Uppercase ISO codes for the backend (`?country=DE&language=DE`). */
  marketParams: { country: string; language: string };
  /** Intl locale for money/date formatting. */
  formatLocale: string;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const [country, setCountryState] = useState<string>(() => readStorage(COUNTRY_KEY) ?? DEFAULT_COUNTRY);
  const [language, setLanguageState] = useState<Language>(() => {
    const current = i18nInstance.language;
    return current === 'de' ? 'de' : 'en';
  });

  const localizationQuery = useQuery({
    queryKey: queryKeys.localization({ country }),
    queryFn: async () => (await getLocalization({ country, language: language.toUpperCase() })).data,
    staleTime: 10 * 60_000,
  });

  const setCountry = useCallback((next: string) => {
    const normalized = next.toUpperCase();
    setCountryState(normalized);
    writeStorage(COUNTRY_KEY, normalized);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void i18n.changeLanguage(next);
  }, []);

  // Keep state in sync if another component changes i18next directly.
  useEffect(() => {
    const onChange = (next: string) => setLanguageState(next === 'de' ? 'de' : 'en');
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);

  const countries = useMemo(
    () =>
      (localizationQuery.data?.availableCountries ?? []).map((item) => ({
        isoCode: item.isoCode,
        name: item.name,
        currency: item.currency.isoCode,
      })),
    [localizationQuery.data],
  );

  const value = useMemo<MarketContextValue>(
    () => ({
      country,
      language,
      setCountry,
      setLanguage,
      localization: localizationQuery.data,
      isLoading: localizationQuery.isLoading,
      countries,
      marketParams: { country, language: language.toUpperCase() },
      formatLocale: language === 'de' ? 'de-DE' : 'en-IE',
    }),
    [country, language, setCountry, setLanguage, localizationQuery.data, localizationQuery.isLoading, countries],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketContextValue {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used inside <MarketProvider>');
  return context;
}
