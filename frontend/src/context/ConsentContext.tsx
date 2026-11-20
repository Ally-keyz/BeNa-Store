import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readStorage, writeStorage } from '@/lib/storage';
import { setAnalyticsEnabled } from '@/lib/analytics';

const CONSENT_KEY = 'bena.consent.v1';
const CONSENT_VERSION = 1;

export interface ConsentCategories {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  version: number;
  decidedAt: string;
  categories: ConsentCategories;
}

export interface ConsentContextValue {
  consent: ConsentRecord | null;
  hasDecided: boolean;
  analytics: boolean;
  marketing: boolean;
  saveConsent: (categories: Pick<ConsentCategories, 'analytics' | 'marketing'>) => void;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readConsent(): ConsentRecord | null {
  const raw = readStorage(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION || !parsed.categories) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * GDPR-style consent gate.
 *
 * Nothing non-essential (analytics, marketing pixels, third-party embeds) may
 * load before consent. This app currently ships no trackers; future integrations
 * MUST read `analytics`/`marketing` from this context before loading anything.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    setAnalyticsEnabled(consent?.categories.analytics ?? false);
    return () => setAnalyticsEnabled(false);
  }, [consent]);

  const saveConsent = useCallback(
    (categories: Pick<ConsentCategories, 'analytics' | 'marketing'>) => {
      const record: ConsentRecord = {
        version: CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
        categories: { essential: true, analytics: categories.analytics, marketing: categories.marketing },
      };
      setConsent(record);
      writeStorage(CONSENT_KEY, JSON.stringify(record));
      setIsPreferencesOpen(false);
    },
    [],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasDecided: Boolean(consent),
      analytics: consent?.categories.analytics ?? false,
      marketing: consent?.categories.marketing ?? false,
      saveConsent,
      isPreferencesOpen,
      openPreferences: () => setIsPreferencesOpen(true),
      closePreferences: () => setIsPreferencesOpen(false),
    }),
    [consent, saveConsent, isPreferencesOpen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used inside <ConsentProvider>');
  return context;
}
