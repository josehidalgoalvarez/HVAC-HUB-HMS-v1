import React, { useMemo } from 'react';
import type { EquipmentItem, EquipmentStatus } from '../../types/domain';
import { parseDate } from '../../utils/dateUtils';

export interface EquipmentMovementEntry {
  id: string;
  dateDisplay: string;
  sortTime: number | null;
  fromLocation: string;
  toLocation: string;
  sourceLabel: string;
  ticketReference?: string;
  notes?: string;
}

export interface EquipmentAuditEvent {
  id: number | string;
  entity_type?: string;
  entity_id?: number | string;
  field_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by_name?: string | null;
  reason?: string | null;
  created_at?: string | null;
}

interface EquipmentMovementSectionProps {
  equipment: EquipmentItem;
  currentLocationName?: string;
  auditEvents?: EquipmentAuditEvent[];
  onClose?: () => void;
}

/**
 * Extracts explicitly evidenced movement entries for an equipment item.
 *
 * MOVEMENT RULE (hard):
 * A movement entry appears in an equipment item's history ONLY if the data explicitly
 * evidences a move (a dated location change, a dated status change linked to that
 * equipment row, or a correction/provenance row for that equipment row).
 * - Never infer a move from a current location field (`stockpile_id` / `stockpile_name`).
 * - Never infer a move from `created_at` / `updated_at` timestamps alone.
 * - Never infer a move from a ticket that mentions a building.
 * - Never invent a move date, a from-location, a to-location, or an actor.
 */
export function resolveExplicitEquipmentMovements(
  equipment: EquipmentItem,
  auditEvents: EquipmentAuditEvent[] = []
): { datedEntries: EquipmentMovementEntry[]; undatedEntries: EquipmentMovementEntry[] } {
  const all: EquipmentMovementEntry[] = [];

  auditEvents.forEach((ev, idx) => {
    const entityType = (ev.entity_type || '').toLowerCase();
    if (entityType !== 'equipment') return;
    if (String(ev.entity_id) !== String(equipment.id)) return;

    const field = (ev.field_name || '').toLowerCase();
    const isLocationChange = field === 'stockpile_id' || field === 'stockpile_name' || field === 'location';
    const isStatusChange = field === 'status';
    if (!isLocationChange && !isStatusChange) return;

    const rawDate = (ev.created_at || '').trim();
    const parsed = rawDate ? parseDate(rawDate) : null;
    const dateStr = rawDate ? rawDate.slice(0, 10) : '';

    all.push({
      id: `eq-audit-${ev.id || idx}`,
      dateDisplay: dateStr || rawDate,
      sortTime: parsed ? parsed.getTime() : null,
      fromLocation: ev.old_value ?? 'Unspecified',
      toLocation: ev.new_value ?? 'Unspecified',
      sourceLabel: isLocationChange ? 'Location Change (Correction Log)' : 'Status Change (Correction Log)',
      notes: ev.reason ? ev.reason : undefined,
    });
  });

  const dated = all
    .filter((e) => e.sortTime !== null && e.dateDisplay !== '')
    .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));

  const undated = all.filter((e) => e.sortTime === null || e.dateDisplay === '');

  return { datedEntries: dated, undatedEntries: undated };
}

/**
 * EquipmentMovementSection Component (Read-Only v1)
 *
 * Displays:
 * 1. Top "Current" block: current location + stored status (`unknown`, `available`, `needs_service`, `out_of_service`) as stored — never upgrades `'unknown'`.
 * 2. "Notes" block: the equipment item's notes as written, never rewritten or presented as movement entries.
 * 3. Chronological Movement History (newest first, date shown on every entry) from explicit movement evidence only, or honest empty state:
 *    "No movement recorded yet for this item."
 *
 * Design rules:
 * - Flat surfaces, Technician Blue (`primary`) accent, NO amber for equipment movement generally, Material Symbols only, 360px field-readable.
 */
export const EquipmentMovementSection: React.FC<EquipmentMovementSectionProps> = ({
  equipment,
  currentLocationName,
  auditEvents = [],
}) => {
  const { datedEntries, undatedEntries } = useMemo(
    () => resolveExplicitEquipmentMovements(equipment, auditEvents),
    [equipment, auditEvents]
  );

  const hasAnyMovement = datedEntries.length > 0 || undatedEntries.length > 0;
  const resolvedLocation =
    (equipment.stockpile_name && equipment.stockpile_name.trim()) ||
    (currentLocationName && currentLocationName.trim()) ||
    (equipment.stockpile_id ? `Storage Location #${equipment.stockpile_id}` : 'Unassigned');

  const statusBadgeClasses: Record<EquipmentStatus, string> = {
    available: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    needs_service: 'bg-primary/10 text-primary border-primary/20',
    out_of_service: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    unknown: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  };

  return (
    <div className="space-y-5" data-testid="equipment-movement-section">
      {/* 1. TOP "CURRENT" BLOCK (Location + Stored Status as stored — never upgrades 'unknown') */}
      <div
        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 space-y-3"
        data-testid="equipment-current-block"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Current
            </h4>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
              statusBadgeClasses[equipment.status] || statusBadgeClasses.unknown
            }`}
            data-testid="equipment-current-status"
          >
            Status: {equipment.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Current Location
            </div>
            <div
              className="text-sm font-bold text-brand-black dark:text-white mt-0.5"
              data-testid="equipment-current-location"
            >
              {resolvedLocation}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Category
            </div>
            <div className="text-sm font-bold text-brand-black dark:text-white mt-0.5">
              {equipment.category || 'Uncategorized'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. NOTES BLOCK (As written, labelled "Notes", never presented as movement entries) */}
      {equipment.notes && equipment.notes.trim() !== '' && (
        <div
          className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800"
          data-testid="equipment-notes-block"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">sticky_note_2</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Notes
            </h4>
          </div>
          <p className="text-sm text-brand-black dark:text-white leading-relaxed">
            {equipment.notes}
          </p>
        </div>
      )}

      {/* 3. CHRONOLOGICAL MOVEMENT HISTORY (Read-only v1) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">swap_horiz</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-black dark:text-white">
            Movement History
          </h3>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
          Read-only
        </span>
      </div>

      {hasAnyMovement ? (
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
                      {entry.ticketReference && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
                          {entry.ticketReference}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-brand-black dark:text-white">
                      {entry.fromLocation} → {entry.toLocation}
                    </h4>
                    {entry.notes && (
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {undatedEntries.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                Undated
              </h4>
              <div className="space-y-3">
                {undatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {entry.sourceLabel}
                      </span>
                      <h5 className="text-sm font-bold text-brand-black dark:text-white">
                        {entry.fromLocation} → {entry.toLocation}
                      </h5>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
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
        <div
          className="p-6 text-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark"
          data-testid="equipment-movement-empty"
        >
          <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
            No movement recorded yet for this item.
          </p>
        </div>
      )}
    </div>
  );
};
