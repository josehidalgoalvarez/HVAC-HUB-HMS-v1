import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import Button from '../ui/Button';
import type { ShoppingListResponse, Ticket } from '../../types/domain';

interface ShoppingListSectionProps {
  onOpenTicket?: (ticketId: string) => void;
}

export const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({ onOpenTicket }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load open tickets
  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        setLoadingTickets(true);
        const allTickets = await apiClient.getTickets();
        const openList = (allTickets || []).filter(t => t.status !== 'done' && t.status !== 'closed');
        setTickets(openList);

        // Pre-select tickets that have switch or parts in title/description
        const initialSelected = openList.map(t => Number(t.id));
        setSelectedTicketIds(initialSelected.slice(0, 5));
      } catch (err: any) {
        console.warn('Could not fetch open tickets for shopping list:', err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchOpenTickets();
  }, []);

  // Generate shopping list
  const handleGenerate = async (ticketIds: number[]) => {
    if (ticketIds.length === 0) {
      setShoppingList(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.buildShoppingList(ticketIds);
      setShoppingList(result);
    } catch (err: any) {
      setError(err.message || 'Failed to build shopping list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicketIds.length > 0) {
      handleGenerate(selectedTicketIds);
    }
  }, [selectedTicketIds]);

  const toggleTicket = (id: number) => {
    setSelectedTicketIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTicketIds(tickets.map(t => Number(t.id)));
  };

  const clearAll = () => {
    setSelectedTicketIds([]);
    setShoppingList(null);
  };

  return (
    <div className="space-y-4">
      {/* Header and Ticket Selector */}
      <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart_checkout</span>
              Parts Buy List
            </h2>
            <p className="text-xs text-gray-500">
              Parts needed for active tickets
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Selected tickets summary chips */}
        {loadingTickets ? (
          <p className="text-xs text-gray-400">Loading open work orders...</p>
        ) : (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Tickets ({selectedTicketIds.length} of {tickets.length} selected):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {tickets.map(t => {
                const isSelected = selectedTicketIds.includes(Number(t.id));
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTicket(Number(t.id))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>{t.wo_number || `Ticket #${t.id}`}: {t.title.slice(0, 20)}...</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-xl">
          {error}
        </div>
      )}

      {/* Generated Shopping List Output */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <p className="text-xs font-semibold">Building buy list...</p>
        </div>
      ) : !shoppingList || shoppingList.items.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
          <span className="material-symbols-outlined text-4xl text-gray-300">production_quantity_limits</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No parts required for selected tickets</p>
          <p className="text-xs text-gray-400">Select open tickets that need parts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary metrics bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
            <span>
              Parts: <strong className="text-brand-black dark:text-white">{shoppingList.total_parts_count}</strong>
            </span>
            <span>
              Total: <strong className="text-brand-black dark:text-white">{shoppingList.total_items_needed}</strong>
            </span>
            <span>
              Stockpile: <strong className="text-emerald-600">{shoppingList.harvest_count}</strong>
            </span>
            <span>
              To Buy: <strong className="text-primary">{shoppingList.buy_count}</strong>
            </span>
          </div>

          {/* Deduped Item Cards */}
          <div className="grid gap-3">
            {shoppingList.items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark shadow-xs space-y-3"
              >
                {/* Title and quantity needed */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-extrabold rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                        {item.part_number}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">
                        Needed for {item.ticket_count} tickets
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-brand-black dark:text-white mt-1">
                      {item.part_name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-mono font-black text-brand-black dark:text-white">
                      x{item.total_needed}
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Total Qty</span>
                  </div>
                </div>

                {/* Routing & Allocation Badges */}
                <div className="space-y-2 pt-1">
                  {/* Harvest First Tag */}
                  {item.harvest_tag && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">
                          recycling
                        </span>
                        <div>
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 block uppercase tracking-wide">
                            {item.harvest_tag}
                          </span>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            {item.harvest_quantity} of {item.total_needed} units available in stockpile
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-extrabold rounded-lg bg-emerald-600 text-white">
                        Harvest {item.harvest_quantity}
                      </span>
                    </div>
                  )}

                  {/* Buy at Supplier Tag */}
                  {item.buy_quantity > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
                          store
                        </span>
                        <div>
                          <span className="text-xs font-black text-blue-800 dark:text-blue-200 block uppercase tracking-wide">
                            {item.buy_tag || `buy @ ${item.preferred_supplier?.name || 'Dependable Appliances'}`}
                          </span>
                          <span className="text-[11px] text-blue-700 dark:text-blue-300">
                            {item.buy_quantity} remaining to purchase ({item.preferred_supplier?.hours || 'Mon–Fri 8:30–5'})
                          </span>
                        </div>
                      </div>

                      {item.preferred_supplier?.phone ? (
                        <a
                          href={`tel:${item.preferred_supplier.phone.replace(/[^0-9+]/g, '')}`}
                          className="min-h-[44px] px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">call</span>
                          <span>Call ({item.preferred_supplier.phone})</span>
                        </a>
                      ) : (
                        <span className="px-2 py-1 text-xs font-bold rounded-lg bg-primary text-white">
                          Buy {item.buy_quantity}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Sourced ticket numbers breakdown */}
                {item.tickets_meta && item.tickets_meta.length > 0 && (
                  <div className="pt-1 text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-400">Linked tickets:</span>
                    {item.tickets_meta.map((tm, tIdx) => (
                      <span
                        key={tIdx}
                        onClick={() => onOpenTicket?.(String(tm.ticket_id))}
                        className="px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 hover:text-primary cursor-pointer"
                      >
                        {tm.wo_number || `#${tm.ticket_id}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
