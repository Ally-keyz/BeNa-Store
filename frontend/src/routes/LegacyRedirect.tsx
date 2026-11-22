import { Navigate, useParams } from 'react-router-dom';
import { legacyRedirectPath, type LegacyRouteKind } from '@/config/legacyRoutes';
import { NotFoundPage } from './NotFoundPage';

interface LegacyRedirectProps {
  kind: LegacyRouteKind;
}

/**
 * Client-side fallback for Shopify-era `/pages/*` and `/policies/*` URLs.
 * Render serves real 301 redirects for known handles (see render.yaml); this
 * route covers local development and deployments where those rules are absent.
 */
export function LegacyRedirect({ kind }: LegacyRedirectProps) {
  const { handle = '' } = useParams();
  const target = legacyRedirectPath(kind, handle);

  if (!target) return <NotFoundPage />;

  return <Navigate to={target} replace />;
}
