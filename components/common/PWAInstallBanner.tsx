import React, { useState, useEffect } from 'react';

const DISMISS_KEY = 'hvachome_pwa_install_dismissed_until';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIosPrompt, setIsIosPrompt] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect if running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Check dismissal cooldown (7 days)
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 3. Android / Chrome beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsIosPrompt(false);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. App installed handler
    const handleAppInstalled = () => {
      setInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. iOS Safari detection (only if not standalone and in browser)
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = isIos && /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS/i.test(ua);

    if (isIos && isSafari && !isStandalone) {
      // Show iOS installation guide
      setIsIosPrompt(true);
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 7 days
    localStorage.setItem(DISMISS_KEY, (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
  };

  if (!isVisible || installed) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-banner-title"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 bg-white dark:bg-card-dark rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-gray-700 animate-slideUp text-brand-black dark:text-white"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <span className="material-symbols-outlined text-2xl">install_mobile</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 id="pwa-banner-title" className="text-sm font-extrabold tracking-tight">
              {isIosPrompt ? 'Install HVACHome on iPhone' : 'Install HVACHome App'}
            </h3>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:scale-90 transition-transform"
              aria-label="Dismiss install prompt"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5 font-medium leading-relaxed">
            {isIosPrompt ? (
              <span>
                Add to your Home Screen for full offline work orders, fast camera intake, and 1-tap dispatch without browser address bar.
              </span>
            ) : (
              <span>
                Fast 1-tap dispatch, offline work orders, and instant sync. Launches fullscreen without browser chrome.
              </span>
            )}
          </p>

          {isIosPrompt ? (
            /* iOS Safari Step-by-Step Guidance */
            <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/80 border border-gray-200/70 dark:border-gray-700/70 text-xs space-y-1.5 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Tap Safari&apos;s <strong className="text-primary font-bold">Share</strong> button{' '}
                  <span className="material-symbols-outlined text-sm align-middle text-primary">ios_share</span> in the bottom toolbar.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="font-bold">Add to Home Screen</strong>{' '}
                  <span className="material-symbols-outlined text-sm align-middle text-primary">add_box</span>.
                </span>
              </div>
            </div>
          ) : (
            /* Android / Chrome One-Tap Install Action */
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 min-h-[44px] px-4 py-2 bg-primary hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Install HVACHome</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="min-h-[44px] px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
              >
                Not Now
              </button>
            </div>
          )}

          {isIosPrompt && (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                className="min-h-[36px] px-3 text-xs font-bold text-primary hover:text-blue-700 dark:hover:text-blue-400"
              >
                Got It
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
