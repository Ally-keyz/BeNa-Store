import { useStorefrontSocket } from '@/hooks/useStorefrontSocket';

/** Mounts the optional public socket listener once for the whole app. */
export function StorefrontSocketBridge() {
  useStorefrontSocket();
  return null;
}
