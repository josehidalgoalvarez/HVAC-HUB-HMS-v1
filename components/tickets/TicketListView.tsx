import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../src/api/client';
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
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  onBack,
  initialSelectedTicketId = null,
  onOpenNotices,
  onOpenDayPlan,
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedTicketId);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'safety' | 'closable' | 'blocked' | 'unassigned'>('all');

  useEffect(() => {
    if (initialSelectedTicketId) {
      setSelectedTicketId(initialSelectedTicketId);
    }
  }, [initialSelectedTicketId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTickets();
      setTickets(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tickets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

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
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 flex items-center gap-1 border border-emerald-500/20"
              title="View Day Plan / Run Sheet"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Day Plan
            </button>
          )}
          {onOpenNotices && (
            <button
              onClick={onOpenNotices}
              className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 flex items-center gap-1 border border-primary/20"
              title="View 24h Notice of Entry Pipeline"
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              24h Notices
            </button>
          )}
          <button
            onClick={loadTickets}
            disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            title="Refresh tickets"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Quick Intake Call-to-Action Card */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Rapid Intake
          </span>
          <p className="text-xs text-brand-black dark:text-white font-medium truncate">
            Intake ticket from screenshot photo in &lt; 2 minutes
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
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          All ({tickets.length})
        </button>

        <button
          onClick={() => setActiveFilter('safety')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'safety'
              ? 'bg-brand-red text-white shadow-sm'
              : 'bg-red-50 dark:bg-red-950/40 text-brand-red border border-red-200 dark:border-red-900'
          }`}
        >
          <span className="material-symbols-outlined text-xs">emergency</span>
          Safety First ({safetyCount})
        </button>

        <button
          onClick={() => setActiveFilter('closable')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'closable'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
          }`}
        >
          <span className="material-symbols-outlined text-xs">timer</span>
          Closable Today ({closableCount})
        </button>

        <button
          onClick={() => setActiveFilter('blocked')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            activeFilter === 'blocked'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          <span className="material-symbols-outlined text-xs">block</span>
          Blocked ({blockedCount})
        </button>

        <button
          onClick={() => setActiveFilter('unassigned')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'unassigned'
              ? 'bg-gray-700 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Unassigned WO
        </button>
      </div>

      {/* Tickets List */}
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
