/**
 * Single source of truth for brand identity, contact details and public URLs.
 *
 * TODO(owner): confirm the values below. The logo reads "BeNa SheGrows Coffee"
 * while the store is "BeNa Origins"; the backend fixtures contain several
 * inconsistent business names/emails (audit finding #6). Until confirmed, all
 * pages read from this ONE module so a fix lands everywhere at once.
 */

export const BRAND = {
  /** Public-facing trading name. */
  name: 'BeNa Origins',
  /** Value on the logo; used only where the logo appears with its own text. */
  logoName: 'BeNa SheGrows Coffee',
  /** Legal entity name for Impressum/legal pages. TODO: confirm. */
  legalName: 'BeNa Origins UG (haftungsbeschränkt)',
  /** Single official contact email. TODO: confirm (fixtures use several). */
  contactEmail: 'support@benaorigins.de',
  /** Single official support/orders email. TODO: confirm. */
  ordersEmail: 'support@benaorigins.de',
  /** Physical address placeholders for the legal notice. TODO: real values. */
  address: {
    street: 'Musterstraße 1',
    city: '00000 Berlin',
    country: 'Deutschland',
  },
  slogan: 'Taste of Rwanda',
  /** Social URLs. TODO: real values. */
  social: {
    instagram: 'https://instagram.com/benaorigins',
    facebook: 'https://facebook.com/benaorigins',
    tiktok: 'https://tiktok.com/@benaorigins',
  },
} as const;

/** Public environment config (all values are safe to bundle). */
export const env = {
  /**
   * Backend REST base. Empty string = same-origin (`/api/v1`), which the Vite
   * dev proxy and any production reverse proxy forward to the backend.
   */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1',
  /** Socket.IO origin. Empty string = same-origin. */
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string | undefined) || '',
  /** Canonical public site origin (SEO canonical/JSON-LD links). */
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://benaorigins.de',
} as const;

/** True when the app is running in a local/dev build. */
export const IS_DEV = import.meta.env.DEV;

export type { };
