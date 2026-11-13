import React, { useEffect, useState } from 'react';
import { Ticket } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';

interface TicketRelatedSectionProps {
  ticketId: string;
  initialRelated: Ticket[];
  buildingId?: string | number | null;
  parentTicketId?: string | number | null;
  childIds?: number[];
  onSelectTicket?: (id: string) => void;
}

export const TicketRelatedSection: React.FC<TicketRelatedSectionProps> = ({
  ticketId,
  initialRelated,
  buildingId,
  parentTicketId,
  childIds = [],
  onSelectTicket,
}) => {
  // Related Tickets State
  const [relatedTickets, setRelatedTickets] = useState<Ticket[]>(() => initialRelated ?? []);
  const [showRelatedPicker, setShowRelatedPicker] = useState(false);
  const [candidateTickets, setCandidateTickets] = useState<Ticket[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    setRelatedTickets(initialRelated ?? []);
  }, [initialRelated]);

  const handleToggleRelatedPicker = async () => {
    const next = !showRelatedPicker;
    setShowRelatedPicker(next);
    setRelatedError(null);
    if (next && candidateTickets.length === 0) {
      setLoadingCandidates(true);
      try {
        const list = await apiClient.getTickets({ limit: 200 });
        setCandidateTickets(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setRelatedError(e?.message || 'Failed to load tickets');
      } finally {
        setLoadingCandidates(false);
      }
    }
  };

  const handleLinkRelated = async (target: Ticket) => {
    if (relatedBusy) return;
    setRelatedBusy(true);
    setRelatedError(null);
    try {
      await apiClient.linkRelatedTicket(ticketId, target.id);
      setRelatedTickets((prev) => [target, ...prev.filter((t) => Number(t.id) !== Number(target.id))]);
    } catch (e: any) {
      setRelatedError(e?.message || 'Failed to link ticket');
    } finally {
      setRelatedBusy(false);
    }
  };

  const handleUnlinkRelated = async (targetId: string | number) => {
    if (relatedBusy) return;
    setRelatedBusy(true);
    setRelatedError(null);
    try {
      await apiClient.unlinkRelatedTicket(ticketId, targetId);
      setRelatedTickets((prev) => prev.filter((t) => Number(t.id) !== Number(targetId)));
    } catch (e: any) {
      setRelatedError(e?.message || 'Failed to unlink ticket');
    } finally {
      setRelatedBusy(false);
    }
  };

  return (
    <>
      {/* Related Tickets Section (Bidirectional Links) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">link</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Related Tickets
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
              {relatedTickets.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleRelatedPicker}
            className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            {showRelatedPicker ? 'Done' : '+ Link Related'}
          </button>
        </div>

        {relatedError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {relatedError}
          </div>
        )}

        {relatedTickets.length === 0 ? (
          <div className="p-3 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No related tickets linked.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {relatedTickets.map((rel) => {
              const woLabel = rel.wo_number ? rel.wo_number : `#${rel.id}`;
              return (
                <div
                  key={rel.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 shadow-sm text-xs"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTicket?.(String(rel.id))}
                    className="font-bold text-primary hover:underline text-left truncate max-w-[200px]"
                  >
                    {woLabel} · {rel.title}
                  </button>
                  <button
                    type="button"
                    disabled={relatedBusy}
                    onClick={() => handleUnlinkRelated(rel.id)}
                    aria-label={`Unlink ${woLabel}`}
                    className="ml-1 text-gray-400 hover:text-rose-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showRelatedPicker && (
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Tap a ticket to link (same building shown first):
            </p>
            {loadingCandidates ? (
              <p className="text-xs text-gray-400">Loading tickets...</p>
            ) : (
              (() => {
                const excludedIds = new Set<number>([
                  Number(ticketId),
                  ...(parentTicketId ? [Number(parentTicketId)] : []),
                  ...childIds,
                  ...relatedTickets.map((r) => Number(r.id)),
                ]);
                const candidates = candidateTickets
                  .filter((c) => !excludedIds.has(Number(c.id)))
                  .sort((a, b) => {
                    const aSame = Number(a.building_id) === Number(buildingId) ? 0 : 1;
                    const bSame = Number(b.building_id) === Number(buildingId) ? 0 : 1;
                    if (aSame !== bSame) return aSame - bSame;
                    return Number(b.id) - Number(a.id);
                  });

                if (candidates.length === 0) {
                  return <p className="text-xs text-gray-400">No other tickets available to link.</p>;
                }

                return (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {candidates.slice(0, 40).map((cand) => {
                      const woLabel = cand.wo_number ? cand.wo_number : `#${cand.id}`;
                      const sameBld = Number(cand.building_id) === Number(buildingId);
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          disabled={relatedBusy}
                          onClick={() => handleLinkRelated(cand)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                            sameBld
                              ? 'bg-primary/5 border-primary/30 text-brand-black dark:text-white hover:bg-primary/15'
                              : 'bg-white dark:bg-card-dark border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary/50'
                          }`}
                        >
                          <span className="font-bold">{woLabel}</span> · {cand.title.slice(0, 36)}
                          {cand.title.length > 36 ? '…' : ''}
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </>
  );
};
