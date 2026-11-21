/**
 * Public, build-time configuration. No secrets may ever be added here.
 *
 * Default identity values come from the owner-supplied store details. They are
 * still overridable with VITE_* variables for deployments; never add secrets.
 */
const publicEnv = import.meta.env;

function read(name: string, fallback: string): string {
  const value = publicEnv[name] as string | undefined;
  return value?.trim() || fallback;
}

/** Public environment config (all values are safe to bundle). */
export const env = {
  apiBaseUrl: read('VITE_API_BASE_URL', '/api/v1'),
  socketUrl: read('VITE_SOCKET_URL', ''),
  siteUrl: read('VITE_SITE_URL', 'https://benaorigins.de'),
};

export const BRAND = {
  name: read('VITE_BRAND_NAME', 'BeNa Store'),
  logoName: read('VITE_BRAND_LOGO_NAME', 'BeNa SheGrows Coffee'),
  legalName: read('VITE_LEGAL_NAME', 'BeNa Store'),
  contactEmail: read('VITE_CONTACT_EMAIL', 'store@benaorigins.de'),
  ordersEmail: read('VITE_ORDERS_EMAIL', 'store@benaorigins.de'),
  address: {
    street: read('VITE_ADDRESS_STREET', 'Am Galgenköppel 4'),
    city: read('VITE_ADDRESS_CITY', '34289 Zierenberg'),
    country: read('VITE_ADDRESS_COUNTRY', 'Germany'),
  },
  slogan: read('VITE_BRAND_SLOGAN', 'Taste of Rwanda'),
  social: {
    instagram: read('VITE_SOCIAL_INSTAGRAM', 'https://www.instagram.com/benaorigins/'),
    whatsapp: read('VITE_SOCIAL_WHATSAPP', 'https://chat.whatsapp.com/CndIu3wGBVgJsgi7Q6Q6Xi'),
  },
} as const;

export const IS_DEV = publicEnv.DEV === true;

export type {};
