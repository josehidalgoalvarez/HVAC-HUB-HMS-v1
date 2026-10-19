import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../src/api/client';
import { useSWRData } from '../../src/offline/useSWRData';
import { PullToRefresh } from '../common/PullToRefresh';
import { TicketCard } from './TicketCard';
import { TicketIntakeModal } from './TicketIntakeModal';
import { TicketDetailView } from './TicketDetailView';
import Button from '../ui/Button';
import type { Ticket, TicketState } from '../../types/domain';

interface TicketListViewProps {
  onBack?: () => void;
  initialSelectedTicketId?: string | null;
  onOpenNotices?: () => void;
  onOpenDayPlan?: () => void;
  onOpenParts?: () => void;
  onOpenWatches?: () => void;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  onBack,
  initialSelectedTicketId = null,
  onOpenNotices,
  onOpenDayPlan,
  onOpenParts,
  onOpenWatches,
}) => {
  const fetchTickets = useCallback(() => apiClient.getTickets(), []);
  const {
    data: cachedTickets,
    setData: setTicketsState,
    isLoading: loading,
    isRevalidating,
    isUpdated,
    error,
    refresh: refreshTickets,
  } = useSWRData<Ticket[]>('tickets', fetchTickets);

  const tickets = cachedTickets || [];
  const setTickets = (updater: Ticket[] | ((prev: Ticket[]) => Ticket[])) => {
    if (typeof updater === 'function') {
      setTicketsState((prev) => updater(prev || []));
    } else {
      setTicketsState(updater);
    }
  };

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedTicketId);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'safety' | 'closable' | 'blocked' | 'unassigned'>('all');

  useEffect(() => {
    if (initialSelectedTicketId) {
      setSelectedTicketId(initialSelectedTicketId);
    }
  }, [initialSelectedTicketId]);

  const handleQuickStateChange = async (ticketId: string, newState: TicketState) => {
    try {
      const updated = await apiClient.updateTicket(ticketId, {
        status: newState,
        reason: `Quick state transition to ${newState}`,
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updated, status: newState, state: newState } : t))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to change state');
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWo = t.wo_number?.toLowerCase().includes(q);
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesScope = t.verified_scope?.toLowerCase().includes(q);
        const matchesUnit = t.unitNumber?.toLowerCase().includes(q);
        if (!matchesWo && !matchesTitle && !matchesScope && !matchesUnit) {
          return false;
        }
      }

      // Category filter pills
      if (activeFilter === 'safety') {
        return t.priority === 'urgent';
      }
      if (activeFilter === 'closable') {
        const s = t.status || t.state;
        return (s === 'in-progress' || s === 'in_progress' || s === 'verified') && t.priority !== 'urgent';
      }
      if (activeFilter === 'blocked') {
        const s = t.status || t.state;
        return s === 'blocked' || s === 'on-hold' || s === 'on_hold';
      }
      if (activeFilter === 'unassigned') {
        return !t.wo_number;
      }

      return true;
    });
  }, [tickets, searchQuery, activeFilter]);

  // Section breakdown counts
  const safetyCount = tickets.filter((t) => t.priority === 'urgent').length;
  const closableCount = tickets.filter((t) => {
    const s = t.status || t.state;
    return (s === 'in-progress' || s === 'in_progress' || s === 'verified') && t.priority !== 'urgent';
  }).length;
  const blockedCount = tickets.filter((t) => (t.status || t.state) === 'blocked').length;
  const unassignedCount = tickets.filter((t) => !t.wo_number).length;

  if (selectedTicketId) {
    return (
      <TicketDetailView
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
        onOpenTicket={(id) => setSelectedTicketId(id)}
      />
    );
  }

  return (
    <div className="pb-safe max-w-xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
              Work Orders
            </h1>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              Prioritized dispatch: Safety first → Closable today → Rest
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenDayPlan && (
            <button
              onClick={onOpenDayPlan}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-neutral-800 text-xs font-bold flex items-center gap-1 border border-gray-200 dark:border-gray-800 transition-colors"
              title="View Day Plan / Run Sheet"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Day Plan
            </button>
          )}
          {onOpenNotices && (
            <button
              onClick={onOpenNotices}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-neutral-800 text-xs font-bold flex items-center gap-1 border border-gray-200 dark:border-gray-800 transition-colors"
              title="View 24h Notice of Entry Pipeline"
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              24h Notices
            </button>
          )}
          {onOpenParts && (
            <button
              id="open-parts-btn"
              onClick={onOpenParts}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-neutral-800 text-xs font-bold flex items-center gap-1 border border-gray-200 dark:border-gray-800 transition-colors"
              title="View Parts Catalog & Shopping List"
            >
              <span className="material-symbols-outlined text-[16px]">precision_manufacturing</span>
              Parts
            </button>
          )}
          {onOpenWatches && (
            <button
              id="open-watches-btn"
              onClick={onOpenWatches}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-neutral-800 text-xs font-bold flex items-center gap-1 border border-gray-200 dark:border-gray-800 transition-colors"
              title="View Proactive Watches & Digest"
            >
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              Watches
            </button>
          )}
          <button
            onClick={() => refreshTickets()}
            disabled={isRevalidating}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            title="Refresh tickets"
          >
            <span className={`material-symbols-outlined text-[18px] ${isRevalidating ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Subtle background updated indicator */}
      {isUpdated && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span>Tickets updated</span>
        </div>
      )}

      {/* Quick Intake Call-to-Action Card */}
      <div id="ticket-intake-banner" className="bg-primary/5 dark:bg-card-dark border border-primary/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Rapid Intake
          </span>
          <p className="text-xs text-brand-black dark:text-white font-medium">
            Intake from screenshot in &lt; 2 min
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsIntakeOpen(true)}
          className="py-2 px-3 text-xs shadow-md shrink-0 whitespace-nowrap"
          icon="add_a_photo"
        >
          Quick Intake
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by WO #, title, unit, or verified scope..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          All ({tickets.length})
        </button>

        <button
          onClick={() => setActiveFilter('safety')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'safety'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'safety' ? 'text-white' : 'text-brand-red'}`}>emergency</span>
          Safety First ({safetyCount})
        </button>

        <button
          onClick={() => setActiveFilter('closable')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'closable'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'closable' ? 'text-white' : 'text-primary'}`}>timer</span>
          Closable Today ({closableCount})
        </button>

        <button
          onClick={() => setActiveFilter('blocked')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'blocked'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'blocked' ? 'text-white' : 'text-rose-500'}`}>block</span>
          Blocked ({blockedCount})
        </button>

        <button
          onClick={() => setActiveFilter('unassigned')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'unassigned'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          Unassigned WO ({unassignedCount})
        </button>
      </div>

      {/* Tickets List */}
      <PullToRefresh onRefresh={refreshTickets}>
        <div id="ticket-list" className="space-y-3">
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
            <p className="text-xs font-semibold">Prioritizing work orders...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
            <span className="material-symbols-outlined text-4xl text-gray-300">task_alt</span>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {searchQuery || activeFilter !== 'all' ? 'No matching tickets found' : 'No active work orders'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {searchQuery ? 'Try clearing your search query or filters' : 'Snap a screenshot to intake your first job'}
            </p>
            <Button
              variant="primary"
              onClick={() => setIsIntakeOpen(true)}
              className="py-2.5 px-4 text-xs mx-auto shadow-sm"
            >
              + Quick Intake (&lt;2m)
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onSelect={(t) => setSelectedTicketId(t.id)}
                onQuickStateChange={handleQuickStateChange}
              />
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>

      {/* Quick Intake Modal */}
      {isIntakeOpen && (
        <TicketIntakeModal
          onClose={() => setIsIntakeOpen(false)}
          onSuccess={(newTicket) => {
            setIsIntakeOpen(false);
            setTickets((prev) => [newTicket, ...prev]);
            setSelectedTicketId(newTicket.id);
          }}
        />
      )}
    </div>
  );
};
