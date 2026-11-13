import React, { useEffect, useState, useMemo } from 'react';
import { Appliance } from '../../types';
import type { Ticket } from '../../types/domain';
import { apiClient } from '../../src/api/client';
import { parseDate } from '../../utils/dateUtils';
import type { ApplianceMovementRecord } from '../appliances/detail/components/ApplianceHistorySection';

export type UnitHistorySource = 'Direct' | 'Appliance' | 'Related' | 'Building';

interface UnitTimelineRow {
  key: string;
  kind: 'ticket' | 'movement';
  dateDisplay: string;
  sortTime: number;
  woNumber?: string | null;
  title: string;
  status?: string;
  sourceLabel: UnitHistorySource | 'Appliance';
  ticketId?: string;
  applianceName?: string;
  subtitle?: string;
}

interface UnitHistorySectionProps {
  buildingId: number;
  unitId: number;
  unitNumber: string;
  appliances: Appliance[];
  onOpenTicket?: (ticketId: string) => void;
}

const SOURCE_PRIORITY: Record<UnitHistorySource, number> = {
  Direct: 1,
  Appliance: 2,
  Related: 3,
  Building: 4,
};

function formatShortDate(raw?: string | null): { display: string; sortTime: number } {
  if (!raw) return { display: 'Undated', sortTime: 0 };
  const parsed = parseDate(raw);
  if (!parsed) return { display: raw.slice(0, 10), sortTime: 0 };
  return {
    display: parsed.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }),
    sortTime: parsed.getTime(),
  };
}

export const UnitHistorySection: React.FC<UnitHistorySectionProps> = ({
  buildingId,
  unitId,
  unitNumber,
  appliances,
  onOpenTicket,
}) => {
  const [loading, setLoading] = useState(true);
  const [unitRows, setUnitRows] = useState<UnitTimelineRow[]>([]);
  const [buildingRows, setBuildingRows] = useState<UnitTimelineRow[]>([]);
  const [buildingExpanded, setBuildingExpanded] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUnitHistory() {
      setLoading(true);
      try {
        const allTickets = await apiClient.getTickets({ limit: 500 });
        const ticketsList: Ticket[] = Array.isArray(allTickets) ? allTickets : [];

        // Identify candidate appliances that are in this unit or building/storage
        const candidateAppliances = appliances.filter(
          (a) =>
            Number(a.unitId) === unitId ||
            Number((a as any).building_id) === buildingId ||
            a.status === 'stored' ||
            a.status === 'staged'
        );

        const movementsByAppliance = new Map<number, ApplianceMovementRecord[]>();
        await Promise.all(
          candidateAppliances.map(async (app) => {
            const numId = Number(app.id);
            if (!Number.isFinite(numId) || numId <= 0) return;
            try {
              const movs = await apiClient.getApplianceMovements(numId);
              if (Array.isArray(movs) && movs.length > 0) {
                movementsByAppliance.set(numId, movs);
              }
            } catch {
              // Ignore individual movement fetch errors
            }
          })
        );

        // Determine all appliance IDs that are in U now OR were in U (from_unit_id or to_unit_id === unitId)
        const unitApplianceIds = new Set<number>();
        for (const app of appliances) {
          if (Number(app.unitId) === unitId) {
            unitApplianceIds.add(Number(app.id));
          }
        }
        const unitMovements: Array<{ app: Appliance; mov: ApplianceMovementRecord }> = [];
        for (const [appId, movs] of movementsByAppliance.entries()) {
          const appObj = appliances.find((a) => Number(a.id) === appId);
          if (!appObj) continue;
          for (const m of movs) {
            const wasOrIsInUnit =
              Number(m.from_unit_id) === unitId ||
              Number(m.to_unit_id) === unitId ||
              Number(appObj.unitId) === unitId;
            if (wasOrIsInUnit) {
              unitApplianceIds.add(appId);
              unitMovements.push({ app: appObj, mov: m });
            }
          }
        }

        // Map ticketId -> { ticket, bestSource }
        const ticketMap = new Map<number, { ticket: Ticket; source: UnitHistorySource }>();
        const assignTicket = (t: Ticket, source: UnitHistorySource) => {
          const tid = Number(t.id);
          const existing = ticketMap.get(tid);
          if (!existing || SOURCE_PRIORITY[source] < SOURCE_PRIORITY[existing.source]) {
            ticketMap.set(tid, { ticket: t, source });
          }
        };

        // Source 1: Direct (ticket.unit_id === unitId)
        const source1And2Ids: number[] = [];
        for (const t of ticketsList) {
          if (Number(t.unit_id) === unitId) {
            assignTicket(t, 'Direct');
            source1And2Ids.push(Number(t.id));
          }
        }

        // Source 2: Appliance-linked (ticket.appliance_id in unitApplianceIds)
        for (const t of ticketsList) {
          if (t.appliance_id != null && unitApplianceIds.has(Number(t.appliance_id))) {
            assignTicket(t, 'Appliance');
            source1And2Ids.push(Number(t.id));
          }
        }

        // Source 3: Related (one hop from Source 1/2 tickets via ticket_relationship)
        const uniqueS12 = Array.from(new Set(source1And2Ids));
        await Promise.all(
          uniqueS12.map(async (tid) => {
            try {
              const detail = await apiClient.getTicket(tid);
              const rels = detail?.related_tickets;
              if (Array.isArray(rels)) {
                for (const r of rels) {
                  assignTicket(r, 'Related');
                }
              }
            } catch {
              // Ignore individual ticket detail fetch error
            }
          })
        );

        // Source 4: Building-level (ticket.building_id === buildingId && ticket.unit_id == null)
        for (const t of ticketsList) {
          if (Number(t.building_id) === buildingId && (t.unit_id === null || t.unit_id === undefined || t.unit_id === '')) {
            assignTicket(t, 'Building');
          }
        }

        if (cancelled) return;

        const nextUnitRows: UnitTimelineRow[] = [];
        const nextBuildingRows: UnitTimelineRow[] = [];

        for (const { ticket: t, source } of ticketMap.values()) {
          const { display, sortTime } = formatShortDate(t.created_at || t.updatedAt);
          const appObj = t.appliance_id != null ? appliances.find((a) => Number(a.id) === Number(t.appliance_id)) : undefined;
          const row: UnitTimelineRow = {
            key: `ticket-${t.id}`,
            kind: 'ticket',
            dateDisplay: display,
            sortTime,
            woNumber: t.wo_number || null,
            title: t.title,
            status: t.status || t.state || 'new',
            sourceLabel: source,
            ticketId: String(t.id),
            applianceName: appObj ? `${appObj.name}${appObj.brand ? ` (${appObj.brand})` : ''}` : undefined,
          };
          if (source === 'Building') {
            nextBuildingRows.push(row);
          } else {
            nextUnitRows.push(row);
          }
        }

        // Merge appliance movements for appliances in/was-in U
        for (const { app, mov } of unitMovements) {
          const { display, sortTime } = formatShortDate(mov.movement_date || mov.created_at);
          const fromLabel = mov.from_stockpile_name || (mov.from_unit_number ? `Unit ${mov.from_unit_number}` : 'Origin');
          const toLabel = mov.to_stockpile_name || (mov.to_unit_number ? `Unit ${mov.to_unit_number}` : 'Destination');
          nextUnitRows.push({
            key: `mov-${mov.id}`,
            kind: 'movement',
            dateDisplay: display,
            sortTime,
            title: `${app.name} moved (${mov.disposition || 'moved'})`,
            subtitle: `${fromLabel} → ${toLabel}`,
            sourceLabel: 'Appliance',
            applianceName: app.name,
          });
        }

        nextUnitRows.sort((a, b) => b.sortTime - a.sortTime);
        nextBuildingRows.sort((a, b) => b.sortTime - a.sortTime);

        setUnitRows(nextUnitRows);
        setBuildingRows(nextBuildingRows);
        setBuildingExpanded(nextBuildingRows.length <= 3);
      } catch {
        if (!cancelled) {
          setUnitRows([]);
          setBuildingRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUnitHistory();
    return () => {
      cancelled = true;
    };
  }, [buildingId, unitId, appliances]);

  const sourceBadgeClass = (source: UnitHistorySource | 'Appliance') => {
    switch (source) {
      case 'Direct':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'Appliance':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      case 'Related':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'Building':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
          Unit {unitNumber} History
        </h4>
        <span className="text-xs text-gray-400 font-semibold">
          {unitRows.length} {unitRows.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {loading ? (
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-400">
          Loading unit history...
        </div>
      ) : unitRows.length === 0 && buildingRows.length === 0 ? (
        <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400 text-center">
          No history yet
        </div>
      ) : (
        <div className="space-y-2">
          {unitRows.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400 text-center">
              No unit-specific history yet
            </div>
          ) : (
            unitRows.map((row) => (
              <div
                key={row.key}
                onClick={() => row.kind === 'ticket' && row.ticketId && onOpenTicket?.(row.ticketId)}
                className={`p-3 rounded-xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-1 ${
                  row.kind === 'ticket' && onOpenTicket ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.dateDisplay}</span>
                    {row.kind === 'ticket' && (
                      <span className="text-xs font-bold text-primary">
                        {row.woNumber ? row.woNumber : 'No WO'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.status && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold capitalize">
                        {row.status.replace('_', ' ')}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${sourceBadgeClass(row.sourceLabel)}`}>
                      {row.sourceLabel}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-bold text-brand-black dark:text-white leading-snug">
                  {row.title}
                </p>
                {row.applianceName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Appliance: {row.applianceName}
                  </p>
                )}
                {row.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {row.subtitle}
                  </p>
                )}
              </div>
            ))
          )}

          {buildingRows.length > 0 && (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setBuildingExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/70 text-xs font-bold text-gray-700 dark:text-gray-200"
              >
                <span>Building — no unit ({buildingRows.length})</span>
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  {buildingExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {buildingExpanded && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                  {buildingRows.map((row) => (
                    <div
                      key={row.key}
                      onClick={() => row.ticketId && onOpenTicket?.(row.ticketId)}
                      className={`p-3 rounded-xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-1 ${
                        onOpenTicket ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.dateDisplay}</span>
                          <span className="text-xs font-bold text-primary">
                            {row.woNumber ? row.woNumber : 'No WO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {row.status && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold capitalize">
                              {row.status.replace('_', ' ')}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${sourceBadgeClass('Building')}`}>
                            Building
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-brand-black dark:text-white leading-snug">
                        {row.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
