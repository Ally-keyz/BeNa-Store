/**
 * Consent-gated analytics (audit #22).
 *
 * This is intentionally a local event sink rather than a third-party script:
 * no network request, cookie or pixel is created. A future provider adapter
 * must still call through this module, so events remain gated by consent.
 * Never pass emails, names, cart ids or other personal data as properties.
 */
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number | boolean | null>;
  at: string;
}

const MAX_EVENTS = 100;
let enabled = false;
const events: AnalyticsEvent[] = [];

export function setAnalyticsEnabled(next: boolean): void {
  enabled = next;
  if (!next) events.length = 0;
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function trackEvent(
  name: string,
  properties: Record<string, string | number | boolean | null> = {},
): void {
  if (!enabled) return;
  events.push({ name, properties, at: new Date().toISOString() });
  if (events.length > MAX_EVENTS) events.shift();
}

/** Test/debug helper. Events are cleared immediately when consent is withdrawn. */
export function getAnalyticsEvents(): AnalyticsEvent[] {
  return events.map((event) => ({ ...event, properties: { ...event.properties } }));
}
