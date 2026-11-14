export type ClientErrorSource = 'boundary' | 'window' | 'unhandledrejection';

export interface ClientErrorInput {
  source: ClientErrorSource;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
}

export interface ClientErrorPayload {
  source: ClientErrorSource;
  message: string;
  stack?: string;
  component_stack?: string;
  route: string;
  app_version: string;
  user_agent: string;
}

const DEDUP_WINDOW_MS = 60_000;
const MAX_SESSION_REPORTS = 5;

let cachedVersion: string | null = null;
let versionFetchPromise: Promise<string> | null = null;
let sessionReportCount = 0;
const recentErrors = new Map<string, number>();

export function resetClientErrorReporterForTests(): void {
  sessionReportCount = 0;
  recentErrors.clear();
  cachedVersion = 'test-version';
}

async function getAppVersion(): Promise<string> {
  if (cachedVersion !== null) return cachedVersion;
  if (!versionFetchPromise) {
    versionFetchPromise = (typeof fetch === 'function'
      ? fetch('/version.json', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d && typeof d.version === 'string' ? d.version : 'unknown'))
          .catch(() => 'unknown')
      : Promise.resolve('unknown')
    ).then((v) => {
      cachedVersion = v;
      return v;
    });
  }
  return versionFetchPromise;
}

function getCurrentRoute(): string {
  try {
    const activeView = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pt_activeView') : null;
    if (activeView) return activeView;
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hash || window.location.pathname || '/';
  }
  return '/';
}

async function defaultPost(payload: ClientErrorPayload): Promise<void> {
  const { apiClient } = await import('../src/api/client');
  await apiClient.post('/api/client-errors', payload);
}

export async function reportClientError(
  input: ClientErrorInput,
  postFn: (payload: ClientErrorPayload) => Promise<unknown> = defaultPost
): Promise<boolean> {
  try {
    if (sessionReportCount >= MAX_SESSION_REPORTS) {
      return false;
    }

    const message = String(input.message || 'Unknown error').slice(0, 2000);
    const route = String(input.route || getCurrentRoute()).slice(0, 255);
    const dedupKey = `${message}::${route}`;
    const now = Date.now();
    const lastSent = recentErrors.get(dedupKey);
    if (lastSent !== undefined && now - lastSent < DEDUP_WINDOW_MS) {
      return false;
    }

    recentErrors.set(dedupKey, now);
    sessionReportCount += 1;

    const appVersion = await getAppVersion();
    const payload: ClientErrorPayload = {
      source: input.source,
      message,
      ...(input.stack ? { stack: String(input.stack).slice(0, 4000) } : {}),
      ...(input.componentStack ? { component_stack: String(input.componentStack).slice(0, 4000) } : {}),
      route,
      app_version: String(appVersion).slice(0, 64),
      user_agent: (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'unknown').slice(0, 255),
    };

    await postFn(payload);
    return true;
  } catch {
    return false;
  }
}

let initialized = false;

export function initClientErrorReporting(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const prevOnError = window.onerror;
  window.onerror = function (message, _source, _lineno, _colno, error) {
    void reportClientError({
      source: 'window',
      message: typeof message === 'string' ? message : String(message),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (typeof prevOnError === 'function') {
      return prevOnError.apply(this, arguments as unknown as [string | Event, string?, number?, number?, Error?]);
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;
    void reportClientError({
      source: 'unhandledrejection',
      message,
      stack,
    });
  });
}
