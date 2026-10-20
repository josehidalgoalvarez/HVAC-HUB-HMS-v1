import React, { useState, useEffect, useCallback } from 'react';
import type { WatchRecord, WatchDigestResponse } from '../../types/domain';
import apiClient from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { WatchCard } from './WatchCard';
import { DigestSection } from './DigestSection';
import { SnoozeModal } from './SnoozeModal';
import { CreateWatchModal } from './CreateWatchModal';

interface WatchesViewProps {
  onBack?: () => void;
}

export const WatchesView: React.FC<WatchesViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'digest' | 'all'>('digest');
  const [watches, setWatches] = useState<WatchRecord[]>([]);
  const [digest, setDigest] = useState<WatchDigestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedWatchForSnooze, setSelectedWatchForSnooze] = useState<WatchRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allWatches, digestRes] = await Promise.all([
        apiClient.getWatches(),
        apiClient.getWatchDigest(),
      ]);
      setWatches(allWatches);
      setDigest(digestRes);
      appCache.set('watches', allWatches);
      appCache.set('watch_digest', digestRes);
    } catch (err: any) {
      console.error('Failed to load watches:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Instant cache load
    Promise.all([
      appCache.get<WatchRecord[]>('watches'),
      appCache.get<WatchDigestResponse>('watch_digest'),
    ]).then(([cw, cd]) => {
      if (cw) setWatches(cw);
      if (cd) setDigest(cd);
      if (cw || cd) setIsLoading(false);
    });

    // 2. Background revalidation
    loadData();

    // 3. Global refresh listener
    const handleGlobalRefresh = () => loadData();
    window.addEventListener('hvachome:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
  }, [loadData]);

  const handleEvaluateNow = async () => {
    setIsEvaluating(true);
    try {
      const res = await apiClient.evaluateWatches();
      setFeedbackMessage(res.message);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSnooze = async (watchId: number, duration: '1h' | '4h' | 'tomorrow' | string) => {
    try {
      await apiClient.snoozeWatch(watchId, duration);
      setFeedbackMessage(`Watch snoozed for ${duration}`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to snooze: ${err.message}`);
    }
  };

  const handleAcknowledge = async (watch: WatchRecord) => {
    try {
      await apiClient.acknowledgeWatch(watch.id);
      setFeedbackMessage(`Watch #${watch.id} acknowledged`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to acknowledge: ${err.message}`);
    }
  };

  const handleResolve = async (watch: WatchRecord) => {
    try {
      await apiClient.resolveWatch(watch.id);
      setFeedbackMessage(`Watch #${watch.id} marked resolved`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to resolve: ${err.message}`);
    }
  };

  const handleReactivate = async (watch: WatchRecord) => {
    try {
      await apiClient.reactivateWatch(watch.id);
      await loadData();
    } catch (err: any) {
      alert(`Failed to reactivate: ${err.message}`);
    }
  };

  const handleCreateWatch = async (data: Partial<WatchRecord>) => {
    try {
      await apiClient.createWatch(data);
      setFeedbackMessage('New watch created successfully');
      setTimeout(() => setFeedbackMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to create watch: ${err.message}`);
    }
  };

  const filteredWatches = watches.filter((w) => {
    if (filterType !== 'all' && w.watch_type !== filterType) {
      return false;
    }
    return true;
  });

  const activeAlertCount = digest?.total_active_alerts ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-28">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              ←
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl leading-none">monitoring</span>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Proactive Engine & Smart Watches
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated risk monitors for notice deadlines, freeze weather, and delayed replies
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEvaluateNow}
            disabled={isEvaluating}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-sm leading-none ${isEvaluating ? 'animate-spin' : ''}`}>sync</span>
            <span>{isEvaluating ? 'Evaluating...' : 'Run Evaluation'}</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-blue-600 text-white shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm leading-none font-bold">add</span>
            <span>New Watch</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('digest')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'digest'
              ? 'bg-primary/20 text-blue-300 border border-primary/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base leading-none">notifications_active</span>
          <span>Today's Digest</span>
          {activeAlertCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
              {activeAlertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-primary/20 text-blue-300 border border-primary/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base leading-none">visibility</span>
          <span>All Watches ({watches.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <PullToRefresh onRefresh={loadData}>
        {activeTab === 'digest' ? (
          <DigestSection
            digest={digest}
            isLoading={isLoading}
            onRefresh={loadData}
            onSnooze={(w) => setSelectedWatchForSnooze(w)}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />
        ) : (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 mr-1">Filter type:</span>
              {['all', 'notice_deadline', 'notice_handoff', 'weather_freeze', 'reply_waiting', 'scheduled_task'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterType === t
                      ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {t === 'all' ? 'All Types' : t.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Watches Grid */}
            {filteredWatches.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl p-6">
                <span className="material-symbols-outlined text-slate-600 text-3xl mb-2 block mx-auto">search</span>
                <p className="text-sm">No watches match current filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWatches.map((w) => (
                  <WatchCard
                    key={w.id}
                    watch={w}
                    onSnooze={(watch) => setSelectedWatchForSnooze(watch)}
                    onAcknowledge={handleAcknowledge}
                    onResolve={handleResolve}
                    onReactivate={handleReactivate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </PullToRefresh>

      {/* Snooze Modal */}
      <SnoozeModal
        watch={selectedWatchForSnooze}
        isOpen={selectedWatchForSnooze !== null}
        onClose={() => setSelectedWatchForSnooze(null)}
        onConfirmSnooze={handleSnooze}
      />

      {/* Create Watch Modal */}
      <CreateWatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateWatch={handleCreateWatch}
      />
    </div>
  );
};

export default WatchesView;
