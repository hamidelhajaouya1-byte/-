/**
 * Environment Detection Utility for Review vs Production isolation.
 * Ensures admin tools, quick demo buttons, and dev features are strictly
 * isolated to REVIEW/Development environments and completely hidden in Production.
 */

export function isReviewEnvironment() {
  // 1. Explicit Vite dev mode
  if (typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.MODE === 'development')) {
    return true;
  }

  // 2. Custom environment variables
  if (typeof import.meta !== 'undefined') {
    const appEnv = import.meta.env?.VITE_APP_ENV;
    if (appEnv === 'review' || appEnv === 'development' || appEnv === 'staging') {
      return true;
    }
  }

  // 3. Browser environment checking (Hostnames & URL params)
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || '';
    const search = window.location.search || '';

    // Local development hosts
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) {
      return true;
    }

    // AI Studio Dev preview runtime
    if (host.includes('ais-dev-') || host.includes('webcontainer')) {
      return true;
    }

    // Explicit review flag in URL query (for reviewer access)
    if (search.includes('review=true') || search.includes('mode=review') || search.includes('env=review')) {
      return true;
    }
  }

  return false;
}

export function isProductionEnvironment() {
  return !isReviewEnvironment();
}
