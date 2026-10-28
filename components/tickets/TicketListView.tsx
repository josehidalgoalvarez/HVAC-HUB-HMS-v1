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
  onOpenWatches?: () => void;
  onOpenInsights?: () => void;
  onRunSop?: (ticketId: string, sopId?: string) => void;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  onBack,
  initialSelectedTicketId = null,
  onOpenWatches,
  onOpenInsights,
  onRunSop,
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
        onRunSop={(sopId) => {
          if (onRunSop) {
            onRunSop(selectedTicketId, sopId);
          }
        }}
      />
    );
  }

  return (
    <div className="pb-safe pb-24 max-w-xl mx-auto px-4 py-4 space-y-4 animate-fadeIn w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-brand-black dark:text-white hover:border-primary/50 transition-colors shrink-0"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-brand-black dark:text-white flex items-center gap-2 tracking-tight truncate">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">assignment</span>
              <span>Tickets</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {onOpenInsights && (
            <button
              id="open-insights-btn"
              onClick={onOpenInsights}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-card-dark text-brand-black dark:text-white hover:border-primary/50 text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 transition-colors shadow-2xs"
              title="View Insights"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">insights</span>
              <span>Insights</span>
            </button>
          )}
          {onOpenWatches && (
            <button
              id="open-watches-btn"
              onClick={onOpenWatches}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-card-dark text-brand-black dark:text-white hover:border-primary/50 text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 transition-colors shadow-2xs"
              title="View Watches"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">notifications_active</span>
              <span>Watches</span>
            </button>
          )}
          <button
            onClick={() => refreshTickets()}
            disabled={isRevalidating}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-brand-black dark:hover:text-white hover:border-primary/50 transition-colors shadow-2xs shrink-0"
            title="Refresh tickets"
            aria-label="Refresh tickets"
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
      <div id="ticket-intake-banner" className="bg-primary/5 dark:bg-card-dark border border-primary/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Quick Intake
          </span>
          <p className="text-xs text-brand-black dark:text-white font-medium">
            Snap photo or enter work order
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsIntakeOpen(true)}
          className="min-h-[44px] py-2 px-3.5 text-xs shadow-xs shrink-0 whitespace-nowrap"
          icon="add_a_photo"
        >
          New Ticket
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tickets, units, WO #..."
          className="w-full min-h-[44px] pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] absolute right-0 top-0 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar w-full min-w-0">
        <button
          onClick={() => setActiveFilter('all')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 uppercase tracking-wider ${activeFilter === 'all'
              ? 'bg-primary text-white shadow-2xs border border-primary'
              : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
        >
          All ({tickets.length})
        </button>

        <button
          onClick={() => setActiveFilter('safety')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 uppercase tracking-wider ${activeFilter === 'safety'
              ? 'bg-brand-red text-white shadow-2xs border border-brand-red'
              : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'safety' ? 'text-white' : 'text-brand-red'}`}>emergency</span>
          Urgent ({safetyCount})
        </button>

        <button
          onClick={() => setActiveFilter('closable')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 uppercase tracking-wider ${activeFilter === 'closable'
              ? 'bg-primary text-white shadow-2xs border border-primary'
              : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'closable' ? 'text-white' : 'text-primary'}`}>timer</span>
          Active ({closableCount})
        </button>

        <button
          onClick={() => setActiveFilter('blocked')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 uppercase tracking-wider ${activeFilter === 'blocked'
              ? 'bg-rose-600 text-white shadow-2xs border border-rose-600'
              : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
        >
          <span className={`material-symbols-outlined text-xs ${activeFilter === 'blocked' ? 'text-white' : 'text-rose-500'}`}>block</span>
          Blocked ({blockedCount})
        </button>

        <button
          onClick={() => setActiveFilter('unassigned')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 uppercase tracking-wider ${activeFilter === 'unassigned'
              ? 'bg-primary text-white shadow-2xs border border-primary'
              : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
        >
          No WO ({unassignedCount})
        </button>
      </div>

      {/* Tickets List */}
      <PullToRefresh onRefresh={refreshTickets}>
        <div id="ticket-list" className="space-y-3">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
              <p className="text-xs font-semibold">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">task_alt</span>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {searchQuery || activeFilter !== 'all' ? 'No matching tickets found' : 'No active tickets'}
              </p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {searchQuery ? 'Try clearing your search query or filters' : 'Snap a photo or add details to start'}
              </p>
              <Button
                variant="primary"
                onClick={() => setIsIntakeOpen(true)}
                className="py-2.5 px-4 text-xs mx-auto shadow-sm"
              >
                + New Ticket
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
