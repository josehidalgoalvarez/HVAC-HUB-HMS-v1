import React, { useState, useEffect } from 'react';
import { outbox } from '../../src/offline/outbox';
import apiClient from '../../src/api/client';
import type { OutboxItem } from '../../types/domain';

export const OfflineStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [allItems, setAllItems] = useState<OutboxItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const [confirmDiscardAll, setConfirmDiscardAll] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = outbox.subscribe((pCount, items) => {
      setPendingCount(pCount);
      setAllItems(items || []);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await outbox.processQueue(apiClient);
      window.dispatchEvent(new CustomEvent('hvachome:refresh'));
    } catch (e) {
      console.warn('[OfflineStatusBadge] Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardItem = async (id: string) => {
    await outbox.discard(id);
    setConfirmDiscardId(null);
  };

  const handleDiscardAll = async () => {
    await outbox.discardAll();
    setConfirmDiscardAll(false);
    setIsDetailOpen(false);
  };

  const formatAge = (createdAt: number) => {
    const diffMs = Date.now() - createdAt;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // If online and no pending items, hide pill unless detail modal is already open
  if (isOnline && pendingCount === 0 && !isDetailOpen) {
    return null;
  }

  return (
    <>
      <div
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold transition-all duration-300 animate-slideDown"
      >
        {!isOnline ? (
          <div
            onClick={() => setIsDetailOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-full border border-amber-600 shadow-sm cursor-pointer select-none"
          >
            <span className="material-symbols-outlined text-[16px] animate-pulse">cloud_off</span>
            <span>Offline Mode</span>
            {pendingCount > 0 && (
              <span className="bg-amber-700/80 text-amber-100 text-[11px] px-1.5 py-0.5 rounded-full font-mono">
                {pendingCount} unsynced
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-primary text-white px-3 py-1 rounded-full border border-blue-600 shadow-sm">
            <button
              onClick={() => setIsDetailOpen(true)}
              className="flex items-center gap-1.5 text-left hover:underline focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>
                {pendingCount} unsynced {pendingCount === 1 ? 'change' : 'changes'}
              </span>
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="ml-1 px-2 py-0.5 bg-white text-primary rounded-full text-[11px] hover:bg-gray-100 font-extrabold uppercase disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>

      {/* Outbox Detail Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">sync_saved_locally</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Offline Outbox Items</h3>
                  <p className="text-xs text-gray-500">
                    {allItems.length} queued {allItems.length === 1 ? 'item' : 'items'} ({pendingCount} pending)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  <span className="material-symbols-outlined text-3xl mb-1 block opacity-40">done_all</span>
                  No unsynced changes. Outbox is clean!
                </div>
              ) : (
                allItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {item.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            item.status === 'unsupported'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-gray-400 text-[11px]">{formatAge(item.createdAt)}</span>
                      </div>

                      {/* Discard Action */}
                      <div>
                        {confirmDiscardId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDiscardItem(item.id)}
                              className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDiscardId(null)}
                              className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDiscardId(item.id)}
                            className="text-red-500 hover:text-red-700 flex items-center gap-0.5 text-[11px] font-semibold"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Discard
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-gray-600 dark:text-gray-400 font-mono text-[11px] break-all">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{item.method}</span> {item.endpoint}
                      {item.job_id ? ` (job: ${item.job_id})` : ''}
                    </div>

                    {item.error && (
                      <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-[11px]">
                        <span className="font-bold">Error:</span> {item.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer with Sync Now & Discard All */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-2">
              <div>
                {confirmDiscardAll ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDiscardAll}
                      className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                    >
                      Confirm Discard All
                    </button>
                    <button
                      onClick={() => setConfirmDiscardAll(false)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={allItems.length === 0}
                    onClick={() => setConfirmDiscardAll(true)}
                    className="text-red-500 hover:text-red-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    Discard All
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || allItems.length === 0 || !isOnline}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineStatusBadge;
