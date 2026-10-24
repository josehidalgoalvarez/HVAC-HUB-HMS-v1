import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { SEED_SOPS } from '../../sop_constants';
import type { SOP } from '../../types/domain';

interface SOPListViewProps {
  onBack?: () => void;
  onStartRun: (sopId: string) => void;
}

export const SOPListView: React.FC<SOPListViewProps> = ({ onBack, onStartRun }) => {
  const [sops, setSops] = useState<SOP[]>(SEED_SOPS);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSopId, setExpandedSopId] = useState<string | null>(null);

  const loadSops = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getSops();
      if (res && res.length > 0) {
        setSops(res);
        appCache.set('sops', res);
      }
    } catch {
      const cached = await appCache.get<SOP[]>('sops');
      if (cached && cached.length > 0) {
        setSops(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSops();
  }, []);

  const categories = ['all', ...Array.from(new Set(sops.map((s) => s.category)))];

  const filteredSops = sops.filter((sop) => {
    const matchesCat = selectedCategory === 'all' || sop.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.compliance_gates.some(
        (g) =>
          g.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.reference.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCat && matchesQuery;
  });

  return (
    <PullToRefresh onRefresh={loadSops}>
      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-brand-black dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
                SOP Library
              </h1>
              <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                Standard operating procedures & timed checklist runs
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
            {filteredSops.length} procedure{filteredSops.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search & Category Filter */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 space-y-2.5 shadow-xs">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search procedures or standards (e.g. CSA B149.1-25, TSSA)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SOP Cards List */}
        {loading && sops.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading procedure library...</div>
        ) : filteredSops.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No procedures matching your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSops.map((sop) => {
              const isExpanded = expandedSopId === sop.id;
              const steps = sop.steps || [];
              const totalEstMins = steps.reduce((sum, s) => sum + (s.est_minutes || 0), 0);
              const isShell = Boolean(sop.todo_verify);

              return (
                <div
                  key={sop.id}
                  className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3 transition-shadow hover:shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                          {sop.category}
                        </span>
                        {isShell && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            TODO-verify Shell
                          </span>
                        )}
                        {sop.two_person && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">group</span>
                            2-Person
                          </span>
                        )}
                        {sop.weather_exposure && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 capitalize">
                            {sop.weather_exposure.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-brand-black dark:text-white leading-snug">
                        {sop.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartRun(sop.id)}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      Start Run
                    </button>
                  </div>

                  {/* Compliance Gates / Standards Badges */}
                  {sop.compliance_gates.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-400">Compliance:</span>
                      {sop.compliance_gates.map((g) => (
                        <span
                          key={g.id}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
                          title={`${g.reference}: ${g.requirement}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          {g.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Summary row */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-gray-400">format_list_numbered</span>
                        {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                      </span>
                      {totalEstMins > 0 ? (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                          ~{totalEstMins} min
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">Est. time: TODO-verify</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedSopId(isExpanded ? null : sop.id)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      {isExpanded ? 'Hide Steps' : 'View Steps'}
                      <span className="material-symbols-outlined text-sm">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>

                  {/* Expanded Step Checklist Preview */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      {sop.source_note && (
                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400">
                          <span className="font-bold text-brand-black dark:text-gray-200">Note: </span>
                          {sop.source_note}
                        </div>
                      )}

                      <h4 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">
                        Procedure Checklist Steps:
                      </h4>

                      <div className="space-y-1.5">
                        {steps.map((st) => (
                          <div
                            key={st.position}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-gray-800 flex items-start gap-2.5 text-xs"
                          >
                            <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                              {st.position}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-brand-black dark:text-gray-200 leading-snug">{st.instruction}</p>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                                {st.est_minutes ? (
                                  <span>Est: {st.est_minutes} min</span>
                                ) : (
                                  <span className="font-mono">Est: TODO-verify</span>
                                )}
                                {Boolean(st.todo_verify) && (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                                    [TODO-verify]
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

export default SOPListView;
