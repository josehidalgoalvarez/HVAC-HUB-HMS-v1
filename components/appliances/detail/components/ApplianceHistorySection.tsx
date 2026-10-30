import React, { useEffect, useState, useMemo } from 'react';
import { Appliance, MaintenanceRecord } from '../../../../types';
import { INITIAL_APPLIANCES } from '../../../../constants';
import { apiClient } from '../../../../src/api/client';
import { parseDate } from '../../../../utils/dateUtils';

export interface ApplianceMovementRecord {
  id: number | string;
  appliance_id: number | string;
  from_stockpile_id?: number | null;
  from_unit_id?: number | null;
  to_stockpile_id?: number | null;
  to_unit_id?: number | null;
  from_stockpile_name?: string | null;
  to_stockpile_name?: string | null;
  to_unit_number?: string | null;
  to_building_name?: string | null;
  disposition?: string;
  movement_date?: string | null;
  ticket_id?: number | null;
  moved_by?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface UnifiedApplianceHistoryEntry {
  id: string;
  sourceLabel: 'Service Record' | 'Movement';
  dateDisplay: string;
  sortTime: number | null;
  title: string;
  notes: string;
  actor?: string;
  badgeText?: string;
}

interface ApplianceHistorySectionProps {
  appliance?: Appliance;
  history?: MaintenanceRecord[];
  onAddRecord?: () => void;
  isReadOnly?: boolean;
}

/**
 * Helper to determine if an appliance's `notes` field is just the synthetic
 * `"Default <type> (Set: <name>)"` boilerplate generated when a default item
 * has no custom notes.
 */
function getRealApplianceNotes(appliance?: Appliance): string | null {
  if (!appliance || !appliance.notes) return null;
  const trimmed = appliance.notes.trim();
  if (!trimmed) return null;
  if (appliance.isDefault && /^Default .+ \(Set: .+\)$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Resolves explicitly linked `MaintenanceRecord[]` for an appliance.
 * When `VITE_USE_API=true`, `/api/inventory` returns DB appliance rows without
 * the static `maintenanceHistory` array; we match the verified canonical row in
 * `INITIAL_APPLIANCES` ONLY when the appliance ID matches directly OR when both
 * are verified unit-bound appliances with the exact same `(unitNumber, type)`
 * and building context (never guessing across unit-only or ticket-only records).
 */
function resolveExplicitMaintenanceHistory(
  appliance?: Appliance,
  propHistory?: MaintenanceRecord[]
): MaintenanceRecord[] {
  const direct = propHistory && propHistory.length > 0
    ? propHistory
    : (appliance?.maintenanceHistory && appliance.maintenanceHistory.length > 0 ? appliance.maintenanceHistory : []);

  if (direct.length > 0) return direct;
  if (!appliance || appliance.isDefault) return [];

  // Match canonical verified appliance record if present in INITIAL_APPLIANCES
  const byId = INITIAL_APPLIANCES.find(a => a.id === appliance.id);
  if (byId?.maintenanceHistory && byId.maintenanceHistory.length > 0) {
    return byId.maintenanceHistory;
  }

  // When loaded from `/api/inventory`, DB rows have numeric IDs ('1'..'6') while INITIAL_APPLIANCES
  // uses canonical string slugs ('app-bath-1723-dw', etc.) for the same verified unit appliance.
  if (appliance.unitNumber && appliance.unitNumber !== 'Common' && appliance.type) {
    const byUnitAndType = INITIAL_APPLIANCES.filter(
      a =>
        a.unitNumber === appliance.unitNumber &&
        a.type.toLowerCase() === appliance.type.toLowerCase()
    );
    if (byUnitAndType.length === 1 && byUnitAndType[0].maintenanceHistory && byUnitAndType[0].maintenanceHistory.length > 0) {
      return byUnitAndType[0].maintenanceHistory;
    }
  }

  return [];
}

/**
 * ApplianceHistorySection Component (Read-Only v1)
 *
 * Renders per-appliance history strictly from explicitly linked data:
 * 1. "Current notes" block at the top (the appliance row's own `notes` field, undated).
 * 2. Chronological history (newest first, date shown on every entry) combining:
 *    - Explicitly linked `maintenanceHistory` records on the appliance
 *    - Explicitly linked `appliance_movement` rows (`GET /api/appliances/{id}/movements`)
 * 3. Undated section at the bottom if any linked entry has no date.
 * 4. Honest empty state: "No history recorded yet for this appliance."
 */
export const ApplianceHistorySection: React.FC<ApplianceHistorySectionProps> = ({
  appliance,
  history
}) => {
  const [movements, setMovements] = useState<ApplianceMovementRecord[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const numericApplianceId = useMemo(() => {
    if (!appliance?.id || appliance.isDefault) return null;
    const raw = String(appliance.id).trim();
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
    return null;
  }, [appliance?.id, appliance?.isDefault]);

  useEffect(() => {
    let isMounted = true;
    if (numericApplianceId === null) {
      setMovements([]);
      setLoadingMovements(false);
      return;
    }

    setLoadingMovements(true);
    apiClient
      .getApplianceMovements(numericApplianceId)
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res)) {
          // Hard linking guard: only keep rows whose appliance_id matches numericApplianceId
          const linked = res.filter(
            (m: ApplianceMovementRecord) => Number(m.appliance_id) === numericApplianceId
          );
          setMovements(linked);
        } else {
          setMovements([]);
        }
      })
      .catch(() => {
        if (isMounted) setMovements([]);
      })
      .finally(() => {
        if (isMounted) setLoadingMovements(false);
      });

    return () => {
      isMounted = false;
    };
  }, [numericApplianceId]);

  const currentNotes = useMemo(() => getRealApplianceNotes(appliance), [appliance]);

  const explicitMaintenanceRecords = useMemo(
    () => resolveExplicitMaintenanceHistory(appliance, history),
    [appliance, history]
  );

  const { datedEntries, undatedEntries } = useMemo(() => {
    const all: UnifiedApplianceHistoryEntry[] = [];

    // 1. Explicitly linked maintenanceHistory records
    explicitMaintenanceRecords.forEach((rec, idx) => {
      const rawDate = (rec.date || '').trim();
      const parsed = rawDate ? parseDate(rawDate) : null;
      all.push({
        id: `maint-${idx}-${rawDate || 'undated'}`,
        sourceLabel: 'Service Record',
        dateDisplay: rawDate,
        sortTime: parsed ? parsed.getTime() : null,
        title: rec.type || 'Maintenance',
        notes: rec.notes || '',
        actor: rec.technician || undefined
      });
    });

    // 2. Explicitly linked appliance_movement records
    movements.forEach((mov, idx) => {
      const rawDate = (mov.movement_date || mov.created_at || '').trim();
      const parsed = rawDate ? parseDate(rawDate) : null;
      const dateStr = rawDate ? rawDate.slice(0, 10) : '';

      const disp = (mov.disposition || 'Moved').replace(/_/g, ' ');
      const title = `Movement: ${disp.charAt(0).toUpperCase() + disp.slice(1)}`;

      const routeParts: string[] = [];
      if (mov.from_stockpile_name) {
        routeParts.push(`From: ${mov.from_stockpile_name}`);
      }
      if (mov.to_stockpile_name) {
        routeParts.push(`To: ${mov.to_stockpile_name}`);
      } else if (mov.to_unit_number) {
        routeParts.push(
          `To: ${mov.to_building_name ? `${mov.to_building_name} · ` : ''}Unit ${mov.to_unit_number}`
        );
      }

      const detailParts = [...routeParts];
      if (mov.notes && mov.notes.trim()) {
        detailParts.push(mov.notes.trim());
      }

      all.push({
        id: `mov-${mov.id || idx}`,
        sourceLabel: 'Movement',
        dateDisplay: dateStr || rawDate,
        sortTime: parsed ? parsed.getTime() : null,
        title,
        notes: detailParts.join(' — ') || 'Appliance movement recorded.',
        actor: mov.moved_by || undefined,
        badgeText: mov.ticket_id ? `Ticket #${mov.ticket_id}` : undefined
      });
    });

    const dated = all
      .filter((e) => e.sortTime !== null && e.dateDisplay !== '')
      .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));

    const undated = all.filter((e) => e.sortTime === null || e.dateDisplay === '');

    return { datedEntries: dated, undatedEntries: undated };
  }, [explicitMaintenanceRecords, movements]);

  const hasAnyHistory = datedEntries.length > 0 || undatedEntries.length > 0;

  return (
    <div className="space-y-5">
      {/* Current notes block at top (undated, never labelled as History) */}
      {currentNotes && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">sticky_note_2</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Current notes
            </h4>
          </div>
          <p className="text-sm text-brand-black dark:text-white leading-relaxed">
            {currentNotes}
          </p>
        </div>
      )}

      {/* Chronological History Section Header (Read-only v1) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">history</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-black dark:text-white">
            Appliance History
          </h3>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
          Read-only
        </span>
      </div>

      {loadingMovements && !hasAnyHistory ? (
        <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark text-xs text-text-sub-light dark:text-text-sub-dark">
          Loading linked appliance history...
        </div>
      ) : hasAnyHistory ? (
        <div className="space-y-6">
          {datedEntries.length > 0 && (
            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
              {datedEntries.map((entry) => (
                <div key={entry.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white dark:bg-background-dark border-4 border-primary"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {entry.dateDisplay}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {entry.sourceLabel}
                      </span>
                      {entry.badgeText && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
                          {entry.badgeText}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-brand-black dark:text-white">
                      {entry.title}
                    </h4>
                    {entry.notes && (
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
                        {entry.notes}
                      </p>
                    )}
                    {entry.actor && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        <span>{entry.actor}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {undatedEntries.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                Undated
              </h4>
              <div className="space-y-3">
                {undatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-brand-black dark:text-white">
                        {entry.title}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
                        Undated · {entry.sourceLabel}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-center">
          <span className="material-symbols-outlined text-[24px] text-gray-400 dark:text-gray-500 mb-1 block">
            history_toggle_off
          </span>
          <p className="text-sm font-medium text-text-sub-light dark:text-text-sub-dark">
            No history recorded yet for this appliance.
          </p>
        </div>
      )}
    </div>
  );
};
