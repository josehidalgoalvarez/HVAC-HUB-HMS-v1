/**
 * Build marker representation emitted at build time into /version.json
 */
export interface VersionInfo {
  version: string;
  builtAt: number;
  commitHash: string;
  entryBundle?: string;
}

// Injected at build time by Vite define, with fallback
declare const __APP_VERSION_INFO__: VersionInfo | undefined;

export const APP_CURRENT_VERSION: VersionInfo =
  typeof __APP_VERSION_INFO__ !== 'undefined'
    ? __APP_VERSION_INFO__
    : {
        version: 'dev',
        builtAt: Date.now(),
        commitHash: 'dev',
        entryBundle: 'dev',
      };

/**
 * Fetch the latest version.json from the server with cache-busting.
 * Returns null if network fails or offline — callers must stay silent.
 */
export async function fetchServerVersion(): Promise<VersionInfo | null> {
  // If browser reports offline, stay silent immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as VersionInfo;
    if (!data || typeof data.version !== 'string') {
      return null;
    }

    return data;
  } catch (err) {
    // Network failure, timeout, or parse error -> stay silent
    return null;
  }
}

/**
 * Determine if server version represents a newer build than what's currently running.
 */
export function isNewerVersion(current: VersionInfo, server: VersionInfo): boolean {
  if (!server || !current) return false;
  // Dev mode or matching version string means no update
  if (server.version === 'dev' || current.version === 'dev') return false;
  return server.version !== current.version;
}
