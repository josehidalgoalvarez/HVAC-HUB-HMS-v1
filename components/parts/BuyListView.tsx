import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import Button from '../ui/Button';
import type { ShoppingListResponse, Ticket } from '../../types/domain';

export interface ManualBuyItem {
  id: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  supplier?: string;
  notes?: string;
  ticket_id?: number | null;
  created_at: string;
}

const MANUAL_BUY_CACHE_KEY = 'manual_buy_items_v1';

interface BuyListViewProps {
  onBack: () => void;
  onOpenTicket?: (ticketId: string) => void;
}

export const BuyListView: React.FC<BuyListViewProps> = ({ onBack, onOpenTicket }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [manualItems, setManualItems] = useState<ManualBuyItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Add Form State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTicketId, setAssignedTicketId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  // 1. Load manual items from cache
  useEffect(() => {
    const loadCachedManualItems = async () => {
      try {
        const cached = await appCache.get<ManualBuyItem[]>(MANUAL_BUY_CACHE_KEY);
        if (cached && Array.isArray(cached)) {
          setManualItems(cached);
        }
      } catch (err) {
        console.warn('Failed to load manual buy items cache:', err);
      }
    };
    loadCachedManualItems();
  }, []);

  // 2. Fetch open tickets
  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        setLoadingTickets(true);
        const allTickets = await apiClient.getTickets();
        const openList = (allTickets || []).filter(
          t => t.status !== 'done' && t.status !== 'closed'
        );
        setTickets(openList);

        // Pre-select tickets
        const initialSelected = openList.map(t => Number(t.id));
        setSelectedTicketIds(initialSelected.slice(0, 5));
      } catch (err: unknown) {
        console.warn('Could not fetch open tickets for buy list:', err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchOpenTickets();
  }, []);

  // 3. Fetch auto-derived items from tickets
  const handleGenerate = async (ticketIds: number[]) => {
    if (ticketIds.length === 0) {
      setShoppingList(null);
      return;
    }

    setLoadingList(true);
    setError(null);
    try {
      const result = await apiClient.buildShoppingList(ticketIds);
      setShoppingList(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to build buy list');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (selectedTicketIds.length > 0) {
      handleGenerate(selectedTicketIds);
    } else {
      setShoppingList(null);
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

  // 4. Save manual add
  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = partName.trim();
    if (!trimmedName) {
      setFormError('Part name is required');
      return;
    }

    const numQty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
    if (isNaN(numQty) || numQty <= 0) {
      setFormError('Quantity must be greater than zero');
      return;
    }

    const newItem: ManualBuyItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      part_name: trimmedName,
      part_number: partNumber.trim() || undefined,
      quantity: numQty,
      supplier: supplier.trim() || undefined,
      notes: notes.trim() || undefined,
      ticket_id: assignedTicketId ? Number(assignedTicketId) : null,
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...manualItems];
    setManualItems(updated);
    await appCache.set(MANUAL_BUY_CACHE_KEY, updated);

    // Reset form
    setPartName('');
    setPartNumber('');
    setQuantity(1);
    setSupplier('');
    setNotes('');
    setAssignedTicketId('');
    setFormError(null);
    setIsAddFormOpen(false);

    setFlashMsg(`Added "${trimmedName}" to Buy List`);
    setTimeout(() => setFlashMsg(null), 3500);
  };

  // 5. Delete manual item
  const handleDeleteManualItem = async (id: string) => {
    const updated = manualItems.filter(item => item.id !== id);
    setManualItems(updated);
    await appCache.set(MANUAL_BUY_CACHE_KEY, updated);
  };

  // 6. Group items BY WORK ORDER
  const groupedData = useMemo(() => {
    // Map of ticketId -> { ticket, items: [] }
    const groups: Map<
      number,
      {
        ticketId: number;
        ticket?: Ticket;
        woNumber: string;
        title: string;
        buildingUnit: string;
        items: Array<{
          id: string;
          partName: string;
          partNumber?: string | null;
          quantity: number;
          supplierName?: string | null;
          supplierPhone?: string | null;
          supplierHours?: string | null;
          harvestTag?: string | null;
          buyTag?: string | null;
          notes?: string | null;
          sourceType: 'ticket_derived' | 'manual';
          manualId?: string;
        }>;
      }
    > = new Map();

    const manualOnly: Array<{
      id: string;
      partName: string;
      partNumber?: string | null;
      quantity: number;
      supplierName?: string | null;
      notes?: string | null;
      manualId: string;
    }> = [];

    // Helper to find ticket by ID
    const findTicket = (id: number) => tickets.find(t => Number(t.id) === id);

    // Helper to get or create group
    const getOrCreateGroup = (ticketId: number, sampleMeta?: { wo_number?: string | null; title?: string | null }) => {
      if (!groups.has(ticketId)) {
        const t = findTicket(ticketId);
        const woNumber = t?.wo_number || sampleMeta?.wo_number || `WO #${ticketId}`;
        const title = t?.title || sampleMeta?.title || 'Open Work Order';
        const buildingUnit = t
          ? [t.building_name || (t.building_id ? `Building ${t.building_id}` : ''), t.unit_number ? `Unit ${t.unit_number}` : '']
              .filter(Boolean)
              .join(' • ')
          : '';

        groups.set(ticketId, {
          ticketId,
          ticket: t,
          woNumber,
          title,
          buildingUnit,
          items: [],
        });
      }
      return groups.get(ticketId)!;
    };

    // A. Add ticket-derived items from shoppingList
    if (shoppingList && shoppingList.items) {
      for (const item of shoppingList.items) {
        // If item has linked tickets, distribute to each linked ticket's group
        if (item.tickets_meta && item.tickets_meta.length > 0) {
          for (const tm of item.tickets_meta) {
            const grp = getOrCreateGroup(tm.ticket_id, tm);
            grp.items.push({
              id: `derived_${item.part_number || item.part_name}_${tm.ticket_id}`,
              partName: item.part_name,
              partNumber: item.part_number,
              quantity: item.buy_quantity > 0 ? item.buy_quantity : item.total_needed,
              supplierName: item.preferred_supplier?.name || (item.buy_quantity > 0 ? 'Dependable Appliances' : null),
              supplierPhone: item.preferred_supplier?.phone || null,
              supplierHours: item.preferred_supplier?.hours || null,
              harvestTag: item.harvest_tag,
              buyTag: item.buy_tag,
              sourceType: 'ticket_derived',
            });
          }
        } else if (item.ticket_ids && item.ticket_ids.length > 0) {
          for (const tid of item.ticket_ids) {
            const grp = getOrCreateGroup(Number(tid));
            grp.items.push({
              id: `derived_${item.part_number || item.part_name}_${tid}`,
              partName: item.part_name,
              partNumber: item.part_number,
              quantity: item.buy_quantity > 0 ? item.buy_quantity : item.total_needed,
              supplierName: item.preferred_supplier?.name || (item.buy_quantity > 0 ? 'Dependable Appliances' : null),
              supplierPhone: item.preferred_supplier?.phone || null,
              supplierHours: item.preferred_supplier?.hours || null,
              harvestTag: item.harvest_tag,
              buyTag: item.buy_tag,
              sourceType: 'ticket_derived',
            });
          }
        }
      }
    }

    // B. Add manual items
    for (const m of manualItems) {
      if (m.ticket_id) {
        const grp = getOrCreateGroup(m.ticket_id);
        grp.items.push({
          id: m.id,
          partName: m.part_name,
          partNumber: m.part_number,
          quantity: m.quantity,
          supplierName: m.supplier || null,
          notes: m.notes || null,
          sourceType: 'manual',
          manualId: m.id,
        });
      } else {
        manualOnly.push({
          id: m.id,
          partName: m.part_name,
          partNumber: m.part_number,
          quantity: m.quantity,
          supplierName: m.supplier || null,
          notes: m.notes || null,
          manualId: m.id,
        });
      }
    }

    return {
      ticketGroups: Array.from(groups.values()),
      manualOnly,
    };
  }, [shoppingList, manualItems, tickets]);

  const totalGroupsCount = groupedData.ticketGroups.length + (groupedData.manualOnly.length > 0 ? 1 : 0);
  const totalItemsCount =
    groupedData.ticketGroups.reduce((acc, g) => acc + g.items.length, 0) + groupedData.manualOnly.length;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-32 pb-safe animate-fadeIn text-brand-black dark:text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="w-11 h-11 min-h-[44px] rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">shopping_cart_checkout</span>
              <span>Parts Buy List</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Grouped by work order with manual additions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Add Manual Buy Item"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Flash toast */}
      {flashMsg && (
        <div className="p-3 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{flashMsg}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-xl">
          {error}
        </div>
      )}

      {/* Manual Add Accordion / Form */}
      {isAddFormOpen && (
        <form
          onSubmit={handleAddManualItem}
          className="p-4 rounded-2xl border border-primary/30 bg-primary/5 dark:bg-card-dark shadow-sm space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-black dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">post_add</span>
              Add Manual Buy Item
            </h3>
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-brand-red bg-red-100 dark:bg-red-950/60 p-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Part Name <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={partName}
                onChange={e => setPartName(e.target.value)}
                placeholder="e.g. 1/4 Dual Flare Nut"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Part Number (optional)
              </label>
              <input
                type="text"
                value={partNumber}
                onChange={e => setPartNumber(e.target.value)}
                placeholder="e.g. WB24T10025"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Quantity <span className="text-brand-red">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Preferred Supplier (optional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="e.g. Home Depot Gardiners Rd, Dependable"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Work Order / Ticket (optional — blank puts in "Manually added")
              </label>
              <select
                value={assignedTicketId}
                onChange={e => setAssignedTicketId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary"
              >
                <option value="">No Work Order (Manually added group)</option>
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.wo_number || `WO #${t.id}`}: {t.title.slice(0, 35)} ({t.building_name || 'Site'} {t.unit_number ? `Unit ${t.unit_number}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Needed for emergency repair"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddFormOpen(false)}
              className="py-2 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="py-2 px-4 text-xs shadow-sm"
              icon="add"
            >
              Add to Buy List
            </Button>
          </div>
        </form>
      )}

      {/* Ticket Selector Strip */}
      <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">filter_alt</span>
            Filter Tickets ({selectedTicketIds.length} of {tickets.length} active)
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        {loadingTickets ? (
          <p className="text-xs text-gray-400">Loading open work orders...</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pt-1">
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
                  <span className="material-symbols-outlined text-[13px]">
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>
                    {t.wo_number || `WO #${t.id}`}: {t.title.slice(0, 18)}...
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Metrics Bar */}
      <div className="p-3 bg-primary/5 dark:bg-card-dark border border-primary/20 rounded-2xl flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
        <span>
          Groups: <strong className="text-brand-black dark:text-white">{totalGroupsCount}</strong>
        </span>
        <span>
          Total Items: <strong className="text-brand-black dark:text-white">{totalItemsCount}</strong>
        </span>
        <span>
          Auto-Derived: <strong className="text-primary">{shoppingList?.total_items_needed || 0}</strong>
        </span>
        <span>
          Manual: <strong className="text-emerald-600">{manualItems.length}</strong>
        </span>
      </div>

      {/* Groups List */}
      <PullToRefresh onRefresh={() => handleGenerate(selectedTicketIds)}>
        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
            <p className="text-xs font-semibold">Generating buy list by work order...</p>
          </div>
        ) : totalItemsCount === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
            <span className="material-symbols-outlined text-5xl text-gray-300">production_quantity_limits</span>
            <p className="text-base font-bold text-gray-700 dark:text-gray-300">
              No buy list items currently queued
            </p>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark max-w-sm mx-auto">
              Select tickets above to auto-derive parts or add an item manually using the button above.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsAddFormOpen(true)}
              className="py-2.5 px-4 text-xs mx-auto shadow-sm"
              icon="add"
            >
              Add Manual Item
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Ticket Groups */}
            {groupedData.ticketGroups.map(group => (
              <div
                key={group.ticketId}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark overflow-hidden shadow-xs"
              >
                {/* Group Header: Work Order + Building/Unit + Title */}
                <div className="p-3.5 bg-gray-50 dark:bg-neutral-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenTicket?.(String(group.ticketId))}
                        className="px-2 py-0.5 text-xs font-mono font-extrabold rounded-md bg-primary text-white flex items-center gap-1 hover:bg-primary/90"
                      >
                        <span className="material-symbols-outlined text-[13px]">assignment</span>
                        {group.woNumber}
                      </button>
                      <span className="text-xs font-bold text-brand-black dark:text-white truncate">
                        {group.title}
                      </span>
                    </div>
                    {group.buildingUnit && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{group.buildingUnit}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-mono font-bold text-gray-400 shrink-0">
                    {group.items.length} {group.items.length === 1 ? 'part' : 'parts'}
                  </span>
                </div>

                {/* Items in this Work Order */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.items.map(item => (
                    <div key={item.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {item.partNumber && (
                              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                                {item.partNumber}
                              </span>
                            )}
                            <span className="text-xs font-bold text-brand-black dark:text-white">
                              {item.partName}
                            </span>
                            {item.sourceType === 'manual' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Manual
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-gray-500 mt-1 italic">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-base font-mono font-black text-brand-black dark:text-white">
                              x{item.quantity}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-gray-400">Qty</span>
                          </div>

                          {item.manualId && (
                            <button
                              onClick={() => handleDeleteManualItem(item.manualId!)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Delete manual item"
                              aria-label="Delete manual item"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Supplier & Harvest Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {item.harvestTag && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">recycling</span>
                            {item.harvestTag}
                          </span>
                        )}

                        {item.supplierName && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">store</span>
                              {item.supplierName}
                            </span>

                            {item.supplierPhone && (
                              <a
                                href={`tel:${item.supplierPhone.replace(/[^0-9+]/g, '')}`}
                                className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-primary text-white flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                Call
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 2. Manually Added Group (items with no work order) */}
            {groupedData.manualOnly.length > 0 && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-card-dark overflow-hidden shadow-xs">
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-mono font-extrabold rounded-md bg-amber-600 text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">edit_note</span>
                      MANUAL
                    </span>
                    <span className="text-xs font-bold text-brand-black dark:text-white">
                      Manually added
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-400">
                    {groupedData.manualOnly.length} {groupedData.manualOnly.length === 1 ? 'part' : 'parts'}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {groupedData.manualOnly.map(item => (
                    <div key={item.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {item.partNumber && (
                              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                                {item.partNumber}
                              </span>
                            )}
                            <span className="text-xs font-bold text-brand-black dark:text-white">
                              {item.partName}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-gray-500 mt-1 italic">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-base font-mono font-black text-brand-black dark:text-white">
                              x{item.quantity}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-gray-400">Qty</span>
                          </div>

                          <button
                            onClick={() => handleDeleteManualItem(item.manualId)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete manual item"
                            aria-label="Delete manual item"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {item.supplierName && (
                        <div className="pt-1">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-[11px] inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">store</span>
                            {item.supplierName}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};
