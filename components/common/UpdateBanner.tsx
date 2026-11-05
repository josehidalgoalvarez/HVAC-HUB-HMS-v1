import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APP_CURRENT_VERSION, fetchServerVersion, isNewerVersion, VersionInfo } from '../../utils/version';

interface UpdateBannerProps {
  /** Check interval in milliseconds. Default: 5 minutes (300,000ms). */
  checkIntervalMs?: number;
  /** Optional custom fetcher for testing/simulation. */
  customVersionFetcher?: () => Promise<VersionInfo | null>;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  checkIntervalMs = 5 * 60 * 1000,
  customVersionFetcher,
}) => {
  const DISMISSED_VERSION_KEY = 'hvachome-dismissed-version';

  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return false;
    } catch {
      return false;
    }
  });
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const checkForUpdate = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      const serverVer = customVersionFetcher
        ? await customVersionFetcher()
        : await fetchServerVersion();

      if (serverVer && isNewerVersion(APP_CURRENT_VERSION, serverVer)) {
        setServerVersion(serverVer.version);
        // Check per-version dismissal in localStorage
        let dismissedVer: string | null = null;
        try {
          dismissedVer = localStorage.getItem(DISMISSED_VERSION_KEY);
        } catch {
          // localStorage disabled / private mode
        }

        if (dismissedVer === serverVer.version) {
          // User already dismissed this specific server version: do not show banner
          setHasUpdate(false);
          setIsDismissed(true);
        } else {
          // Server version is genuinely new or not yet dismissed
          setHasUpdate(true);
          setIsDismissed(false);
        }
      } else {
        setHasUpdate(false);
      }
    } catch {
      // Offline or network error: stay completely silent
    } finally {
      isCheckingRef.current = false;
    }
  }, [customVersionFetcher]);

  useEffect(() => {
    // 1. Initial check shortly after mount (delayed to let app hydrate without friction)
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    // 2. Periodic background check
    const intervalId = setInterval(() => {
      checkForUpdate();
    }, checkIntervalMs);

    // 3. Check on window focus / visibility change (user returns to app)
    const handleFocus = () => {
      checkForUpdate();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdate, checkIntervalMs]);

  const handleReload = async () => {
    setIsReloading(true);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // (a) Call registration.update()
          await registration.update().catch(() => {});

          // (b) If a waiting worker exists, post SKIP_WAITING and WAIT for controllerchange
          if (registration.waiting) {
            const waitingWorker = registration.waiting;
            const controllerChanged = new Promise<void>((resolve) => {
              const onChange = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onChange);
                resolve();
              };
              navigator.serviceWorker.addEventListener('controllerchange', onChange);
              // Timeout fallback (~3s) in case controllerchange doesn't fire
              setTimeout(resolve, 3000);
            });

            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            await controllerChanged;
          }
        }
      }
    } catch (e) {
      console.warn('[UpdateBanner] SW activation error:', e);
    }

    // Force reload from server
    window.location.reload();
  };

  const handleDismiss = () => {
    // Record dismissed version in localStorage so it never returns for the same version
    if (serverVersion) {
      try {
        localStorage.setItem(DISMISSED_VERSION_KEY, serverVersion);
      } catch {
        // localStorage disabled / private mode
      }
    }
    setIsDismissed(true);
  };

  if (!hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="App update available"
      data-testid="app-update-banner"
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 20px) + 8px)',
      }}
      className="fixed left-4 right-4 max-w-md mx-auto z-40 bg-brand-black dark:bg-card-dark text-white rounded-2xl p-3.5 shadow-2xl border border-primary/30 flex items-center justify-between gap-3 animate-slideUp backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30">
          <span className="material-symbols-outlined text-xl text-primary animate-pulse">
            system_update
          </span>
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold leading-tight truncate text-white">
            New version available
          </h4>
          <p className="text-[11px] text-gray-300 dark:text-text-sub-dark leading-tight mt-0.5">
            Tap reload to apply update.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleReload}
          disabled={isReloading}
          data-testid="app-update-reload-btn"
          className="px-3 py-1.5 min-h-[38px] rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[15px] ${isReloading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>{isReloading ? 'Updating...' : 'Reload'}</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          data-testid="app-update-dismiss-btn"
          className="w-9 h-9 min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Dismiss update notification"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
};
