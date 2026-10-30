import React, { useMemo } from 'react';
import { useInventory } from '../../hooks/useData';
import type { Appliance, Property, Unit } from '../../types';
import type { HarvestCandidate, Stockpile } from '../../types/domain';
import { normalizeMatchString } from '../../utils/stockpileMatching';

interface HarvestSourcingViewProps {
  stockpiles: Stockpile[];
  harvestCandidates?: HarvestCandidate[];
  onOpenStockpileInventory?: (stockpileId: number | string) => void;
}

export interface VacantUnitHarvestSource {
  unit: Unit;
  building: Property | undefined;
  directAppliances: Appliance[];
  defaultPatternAppliances: Appliance[];
}

export interface DonorStoredApplianceRow {
  id: string;
  name: string;
  type: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  status: string;
  storageLocationName: string;
  stockpileId?: number | string | null;
  notes?: string;
}

export interface MerelyStoredApplianceRow {
  id: string;
  name: string;
  type: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  status: string;
  storageLocationName: string;
  stockpileId?: number | string | null;
  notes?: string;
  isToConfirmIdentity?: boolean;
  toConfirmSummary?: string;
}

export interface UncertainHarvestSource {
  id: string;
  locationLabel: string;
  uncertaintyBadge: string;
  reportedItems: string;
  reasonAndRule: string;
  stockpileId?: number | string | null;
  stockpileButtonLabel?: string;
}

export interface RecordedHarvestEvent {
  id: string;
  dateDisplay: string;
  sourceUnitLabel: string;
  destinationUnitLabel: string;
  applianceLabel: string;
  ticketReference?: string;
  notes?: string;
}

/**
 * Matches a storage location label against loaded stockpiles without inventing a storage node.
 */
function findMatchingStockpile(
  label: string,
  stockpiles: Stockpile[],
  explicitId?: number | string | null
): Stockpile | null {
  if (explicitId != null && String(explicitId).trim() !== '') {
    const byId = stockpiles.find((sp) => String(sp.id) === String(explicitId));
    if (byId) return byId;
  }
  const norm = normalizeMatchString(label);
  if (!norm) return null;

  return (
    stockpiles.find((sp) => {
      const spName = normalizeMatchString(sp.name);
      const spLoc = normalizeMatchString(sp.location);
      if (spName && (spName.includes(norm) || norm.includes(spName))) return true;
      if (spLoc && (spLoc.includes(norm) || norm.includes(spLoc))) return true;
      if (norm.includes('1731') && (spName.includes('1731') || spLoc.includes('1731'))) return true;
      if (norm.includes('511') && (spName.includes('511') || spLoc.includes('511'))) return true;
      if (norm.includes('107') && (spName.includes('107') || spLoc.includes('107'))) return true;
      if (norm.includes('can 9') && (spName.includes('can 9') || spLoc.includes('can 9'))) return true;
      return false;
    }) || null
  );
}

/**
 * HarvestSourcingView (Read-Only v1, Existing Data Only)
 *
 * HARVEST RULES (hard):
 * 1. A unit is listed as a vacant harvest source ONLY if its data explicitly marks it vacant
 *    (`occupancy_status === 'vacant'` / `occupancyStatus === 'vacant'`).
 *    - Never infer vacancy from missing tenant data, failed-access count, or an old ticket.
 *    - Today 0 of 1,289 units are marked `'vacant'`, so the Vacant-Unit Sources section renders
 *      the honest empty state: "No vacant units marked as harvest sources yet."
 * 2. A stored appliance is listed in Donor Stored Appliances ONLY if `status === 'donor'`
 *    (explicit donor/parts source, not in service).
 *    - Merely stored appliances (`status === 'stored'`) are NOT automatically donor harvest sources
 *      and are never mixed into the Donor Stored Appliances list.
 * 3. Uncertain sources (such as 1719 Bath Rd basement's uncounted stoves/fridges/AC, the 511 Days
 *    stored dishwasher's TO-CONFIRM plate, 107 Amherst donor coil size rule / unconfirmed fan housing,
 *    and Sea Can 9 unverified model assumption) are kept in a separate Uncertain Sources section and
 *    never presented as counted stock or confirmed identity.
 * 4. Harvest Events Recorded lists ONLY explicitly evidenced real unit-to-unit harvest events.
 *    - Never invent a harvest event, source unit, destination unit, or date.
 */
export const HarvestSourcingView: React.FC<HarvestSourcingViewProps> = ({
  stockpiles,
  onOpenStockpileInventory,
}) => {
  const { properties, units, appliances, getUnitAppliances } = useInventory();

  // 1. VACANT-UNIT SOURCES (strictly `occupancy_status === 'vacant'`)
  const vacantUnitSources = useMemo<VacantUnitHarvestSource[]>(() => {
    const vacantUnits = units.filter((u) => {
      const status = (u.occupancy_status || u.occupancyStatus || 'unknown').toLowerCase();
      return status === 'vacant';
    });

    return vacantUnits.map((unit) => {
      const building = properties.find((p) => String(p.id) === String(unit.buildingId));
      const resolvedApps = getUnitAppliances(unit);
      const directAppliances = resolvedApps.filter((a) => !a.isDefault);
      const defaultPatternAppliances = resolvedApps.filter((a) => Boolean(a.isDefault));
      return {
        unit,
        building,
        directAppliances,
        defaultPatternAppliances,
      };
    });
  }, [units, properties, getUnitAppliances]);

  // 2. DONOR STORED APPLIANCES (`status === 'donor'` only) vs MERELY STORED (`status === 'stored'`)
  const { donorAppliances, merelyStoredAppliances } = useMemo<{
    donorAppliances: DonorStoredApplianceRow[];
    merelyStoredAppliances: MerelyStoredApplianceRow[];
  }>(() => {
    const donors: DonorStoredApplianceRow[] = [];
    const storedOnly: MerelyStoredApplianceRow[] = [];
    const seenDonorKeys = new Set<string>();
    const seenStoredKeys = new Set<string>();

    appliances.forEach((a) => {
      if (a.isDefault) return;
      const status = (a.status || '').toLowerCase();
      if (status !== 'donor' && status !== 'stored') return;

      const locRaw = a.location || a.room || '';
      const matchedSp = findMatchingStockpile(locRaw, stockpiles, a.stockpile_id ?? a.stockpileId);
      const storageLocationName = matchedSp?.name || locRaw || 'Storage Location';
      const targetSpId = matchedSp?.id ?? a.stockpile_id ?? a.stockpileId ?? null;

      if (status === 'donor') {
        // Deduplicate between DB seed row ("Donor fridge (1 of 2)") and local constant ("Donor Refrigerator #1")
        const normName = (a.name || '').toLowerCase();
        const slotKey =
          normName.includes('1 of 2') || normName.includes('#1')
            ? 'donor-1731-slot-1'
            : normName.includes('2 of 2') || normName.includes('#2')
            ? 'donor-1731-slot-2'
            : `donor-${a.id}`;
        if (seenDonorKeys.has(slotKey)) return;
        seenDonorKeys.add(slotKey);

        donors.push({
          id: String(a.id),
          name: a.name || a.type || 'Donor Appliance',
          type: a.type || 'Appliance',
          brand: a.brand && a.brand.trim() !== '' ? a.brand : 'Unknown',
          modelNumber: a.modelNumber && a.modelNumber.trim() !== '' ? a.modelNumber : '',
          serialNumber: a.serialNumber && a.serialNumber.trim() !== '' ? a.serialNumber : '',
          status: 'donor',
          storageLocationName,
          stockpileId: targetSpId,
          notes: a.notes || undefined,
        });
      } else if (status === 'stored') {
        const dedupKey = `${storageLocationName.toLowerCase()}::${(a.name || '').toLowerCase()}::${(a.type || '').toLowerCase()}`;
        if (seenStoredKeys.has(dedupKey)) return;
        seenStoredKeys.add(dedupKey);

        const notesStr = a.notes || '';
        const is511Dishwasher =
          (a.type || '').toLowerCase().includes('dishwasher') &&
          (storageLocationName.toLowerCase().includes('511') || notesStr.includes('FFCD2418US3A'));

        storedOnly.push({
          id: String(a.id),
          name: a.name || a.type || 'Stored Appliance',
          type: a.type || 'Appliance',
          brand: a.brand && a.brand.trim() !== '' ? a.brand : 'Unknown',
          modelNumber: is511Dishwasher ? '' : a.modelNumber || '',
          serialNumber: is511Dishwasher ? '' : a.serialNumber || '',
          status: 'stored',
          storageLocationName,
          stockpileId: targetSpId,
          notes: notesStr || undefined,
          isToConfirmIdentity: is511Dishwasher,
          toConfirmSummary: is511Dishwasher
            ? 'Prior record claims Frigidaire FFCD2418US3A / SN TH21634317 (Askoll M376 pump fitted Oct 19) — TO-CONFIRM (rating-plate confirmation pending; never shown as confirmed)'
            : undefined,
        });
      }
    });

    return { donorAppliances: donors, merelyStoredAppliances: storedOnly };
  }, [appliances, stockpiles]);

  // 3. UNCERTAIN SOURCES (kept strictly separate from counted stock & confirmed donor sources)
  const uncertainSources = useMemo<UncertainHarvestSource[]>(() => {
    const sp511 = findMatchingStockpile('511 Days Rd Storage', stockpiles);
    const sp107 = findMatchingStockpile('107 Amherst Storage', stockpiles);
    const spCan9 = findMatchingStockpile('Sea Can 9 — 698 McKay', stockpiles);

    return [
      {
        id: 'uncertain-1719-bath-basement',
        locationLabel: '1719 Bath Rd — Basement Storage',
        uncertaintyBadge: 'Uncertain — count/photo pending, NOT counted stock',
        reportedItems:
          '3–4 white coil-top stoves · 2–3 white top-freezer fridges · 1 Danby portable AC (counts as reported by Jose, not counted)',
        reasonAndRule:
          'Pending job (Jose opens the ticket): strip usable parts from the very old basement stoves, then dispose. Not counted stock and not a confirmed stockpile row.',
        stockpileId: null,
      },
      {
        id: 'uncertain-511-days-dishwasher-plate',
        locationLabel: '511 Days Rd Storage — Stored Dishwasher Identity',
        uncertaintyBadge: 'TO-CONFIRM — Rating-Plate Confirmation Pending',
        reportedItems:
          '1 stored Frigidaire dishwasher in basement storage (prior record claims model FFCD2418US3A / serial TH21634317, Askoll M376 pump fitted Oct 19)',
        reasonAndRule:
          'Model/serial left blank on the stored row until rating plate photo confirms it is a different machine from 1723 Bath Rd · Unit 266 (pump replaced Oct 15). Stored status only (not marked as a donor source).',
        stockpileId: sp511?.id ?? null,
        stockpileButtonLabel: sp511 ? `Open ${sp511.name}` : undefined,
      },
      {
        id: 'uncertain-107-amherst-stoves-and-fan',
        locationLabel: '107 Amherst Storage — White Coil Stoves & Disassembled Fan Housing',
        uncertaintyBadge: 'Compatibility Rule / Unconfirmed Repair-in-Progress',
        reportedItems:
          '2 stored white coil stoves (brand/model unknown) + disassembled bath-exhaust-fan housing on shelf',
        reasonAndRule:
          'White stoves rule: donor coils by size only — never into gray Frigidaire. Disassembled bath-exhaust-fan housing is UNCONFIRMED repair-in-progress — do NOT list it as stock.',
        stockpileId: sp107?.id ?? null,
        stockpileButtonLabel: sp107 ? `Open ${sp107.name}` : undefined,
      },
      {
        id: 'uncertain-can9-mckay-fridge',
        locationLabel: 'Sea Can 9 — 698 McKay — Stored White Frigidaire Top-Freezer Refrigerator',
        uncertaintyBadge: 'Model Assumption NOT Verified (Plate Photo Pending)',
        reportedItems:
          '1 stored white Frigidaire top-freezer refrigerator (rust spots at door/hinge edge; model/serial unknown)',
        reasonAndRule:
          "Jose's same-as-Bath/Days model assumption is NOT verified until a rating plate photo confirms it. Stored status only (not marked as a donor source).",
        stockpileId: spCan9?.id ?? null,
        stockpileButtonLabel: spCan9 ? `Open ${spCan9.name}` : undefined,
      },
    ];
  }, [stockpiles]);

  // 4. HARVEST EVENTS RECORDED (explicitly recorded real unit-to-unit harvests only; 0 exist today)
  const recordedHarvestEvents = useMemo<RecordedHarvestEvent[]>(() => {
    return [];
  }, []);

  return (
    <div className="space-y-5" data-testid="harvest-sourcing-view">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">swap_horiz</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white">
              Harvest Sourcing View (Read-Only v1)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Existing Data Only
          </span>
        </div>
        <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
          Separates explicit vacant-unit sources, explicit donor stored appliances, uncertain/uncounted
          field notes, and recorded harvest events without guessing vacancy or blurring stored stock into donors.
        </p>
      </div>

      {/* SECTION 1: VACANT-UNIT SOURCES */}
      <section
        className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 space-y-3"
        data-testid="harvest-section-vacant-units"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">door_open</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black dark:text-white">
              1. Vacant-Unit Sources
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {vacantUnitSources.length} Vacant {vacantUnitSources.length === 1 ? 'Unit' : 'Units'}
          </span>
        </div>

        {vacantUnitSources.length === 0 ? (
          <div
            className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-gray-800 text-center space-y-1.5"
            data-testid="harvest-vacant-empty-state"
          >
            <span className="material-symbols-outlined text-gray-400 text-2xl">meeting_room</span>
            <p className="text-xs font-bold text-brand-black dark:text-white">
              No vacant units marked as harvest sources yet.
            </p>
            <p className="text-[11px] text-text-sub-light dark:text-text-sub-dark max-w-md mx-auto">
              Only units explicitly marked <code className="px-1 py-0.5 rounded bg-gray-200/70 dark:bg-neutral-700">occupancy_status = &apos;vacant&apos;</code> appear here ({units.length.toLocaleString()} loaded units currently have status <code className="px-1 py-0.5 rounded bg-gray-200/70 dark:bg-neutral-700">unknown</code>). Vacancy is never inferred from missing tenant data or failed access.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vacantUnitSources.map(({ unit, building, directAppliances, defaultPatternAppliances }) => (
              <div
                key={unit.id}
                className="p-3.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-gray-700 space-y-2.5"
                data-testid={`harvest-vacant-unit-${unit.id}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs font-bold text-brand-black dark:text-white">
                      {building?.name || `Building #${unit.buildingId}`} · Unit {unit.unitNumber}
                    </div>
                    {building?.address && (
                      <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
                        {building.address}
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Vacant Unit
                  </span>
                </div>

                {/* Direct Unit Appliances */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Confirmed Direct Unit Appliances ({directAppliances.length})
                  </div>
                  {directAppliances.length === 0 ? (
                    <div className="text-[11px] text-gray-500 italic">
                      No confirmed unit-specific appliance rows recorded on this unit.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {directAppliances.map((app) => (
                        <div
                          key={app.id}
                          className="p-2.5 rounded-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-brand-black dark:text-white">
                              {app.type}: {app.name}
                            </span>
                            <span className="text-text-sub-light dark:text-text-sub-dark ml-1.5">
                              ({app.brand || 'Unknown brand'}
                              {app.modelNumber ? ` · Model ${app.modelNumber}` : ''}
                              {app.serialNumber ? ` · SN ${app.serialNumber}` : ''})
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                            Unit record
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Default-Pattern Appliances (strictly labelled as pattern, not confirmed unit appliance) */}
                {defaultPatternAppliances.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-200/70 dark:border-gray-700/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Inherited Default Pattern ({defaultPatternAppliances.length})
                    </div>
                    <div className="space-y-1.5">
                      {defaultPatternAppliances.map((app) => (
                        <div
                          key={app.id}
                          className="p-2.5 rounded-lg bg-white/70 dark:bg-card-dark/70 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap text-xs"
                        >
                          <div>
                            <span className="font-semibold text-brand-black dark:text-white">
                              {app.type}: {app.name}
                            </span>
                            {app.modelNumber && (
                              <span className="text-text-sub-light dark:text-text-sub-dark ml-1.5">
                                (Pattern model: {app.modelNumber})
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 shrink-0">
                            Default pattern (not a confirmed unit appliance)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: DONOR STORED APPLIANCES (EXPLICIT DONOR / PARTS SOURCES ONLY) */}
      <section
        className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 space-y-3"
        data-testid="harvest-section-donor-appliances"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[18px]">build_circle</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black dark:text-white">
              2. Donor Stored Appliances (Explicit Donor / Parts Sources Only)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-400/50">
            {donorAppliances.length} Explicit {donorAppliances.length === 1 ? 'Donor' : 'Donors'}
          </span>
        </div>

        <p className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
          Appliances in storage explicitly marked <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">status = &apos;donor&apos;</code> (parts source, NOT in service). Merely stored appliances (<code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">status = &apos;stored&apos;</code>) are NOT automatically donor sources and are listed separately below for clarity.
        </p>

        {donorAppliances.length === 0 ? (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500">
            No explicit donor stored appliances found.
          </div>
        ) : (
          <div className="space-y-2.5">
            {donorAppliances.map((donor) => (
              <div
                key={donor.id}
                className="p-3.5 rounded-xl bg-white dark:bg-card-dark border-2 border-amber-400/80 dark:border-amber-500/60 space-y-2"
                data-testid={`harvest-donor-appliance-${donor.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-brand-black dark:text-white">
                        {donor.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/50">
                        Status: {donor.status} (Parts Source · Not in Service)
                      </span>
                    </div>
                    <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark mt-0.5">
                      Type: <span className="font-semibold">{donor.type}</span> · Brand/Model:{' '}
                      <span className="font-semibold">
                        {donor.brand}
                        {donor.modelNumber ? ` / ${donor.modelNumber}` : ' / Model unknown (never guessed)'}
                      </span>
                    </div>
                  </div>

                  {donor.stockpileId != null && onOpenStockpileInventory && (
                    <button
                      type="button"
                      onClick={() => onOpenStockpileInventory(donor.stockpileId!)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/60 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">warehouse</span>
                      <span>{donor.storageLocationName}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  <span>Storage Location: {donor.storageLocationName}</span>
                </div>

                {donor.notes && (
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-neutral-800/70 border border-gray-200/80 dark:border-gray-700 text-[11px] text-text-sub-light dark:text-text-sub-dark">
                    {donor.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Clearly separated non-donor stored appliances callout so stored != donor is unmistakable */}
        {merelyStoredAppliances.length > 0 && (
          <div
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2"
            data-testid="harvest-merely-stored-separation"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                <span>Other Stored Appliances — Status: &apos;stored&apos; (Not Marked as Donor Sources)</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-500">
                {merelyStoredAppliances.length} stored (excluded from donor count)
              </span>
            </div>

            <div className="space-y-2">
              {merelyStoredAppliances.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-amber-400/50 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-brand-black dark:text-white">{item.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-200">
                        Status: {item.status} (Not a donor flag)
                      </span>
                      {item.isToConfirmIdentity && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40"
                          data-testid="stored-dishwasher-to-confirm-badge"
                        >
                          TO-CONFIRM (Rating-Plate Confirmation Pending)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
                      Location: <span className="font-semibold">{item.storageLocationName}</span> · Brand:{' '}
                      <span className="font-semibold">{item.brand}</span>
                      {item.modelNumber ? ` · Model: ${item.modelNumber}` : ' · Model: Unconfirmed / Blank'}
                    </div>
                    {item.toConfirmSummary && (
                      <div className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
                        {item.toConfirmSummary}
                      </div>
                    )}
                  </div>

                  {item.stockpileId != null && onOpenStockpileInventory && (
                    <button
                      type="button"
                      onClick={() => onOpenStockpileInventory(item.stockpileId!)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white dark:bg-card-dark hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-400/60 text-[11px] font-bold flex items-center gap-1 self-start sm:self-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      <span>View Storage</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: UNCERTAIN SOURCES (SEPARATE SECTION, NEVER MIXED WITH COUNTED SOURCES) */}
      <section
        className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 space-y-3"
        data-testid="harvest-section-uncertain-sources"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">help_clinic</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black dark:text-white">
              3. Uncertain Sources (Not Counted Stock · Pending Verification)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {uncertainSources.length} Flagged Notes
          </span>
        </div>

        <p className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
          Field-reported basement/storage notes where count, rating-plate identity, or strip-parts ticket is still pending. Kept strictly separate from counted stock.
        </p>

        <div className="space-y-2.5">
          {uncertainSources.map((src) => (
            <div
              key={src.id}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-gray-700 space-y-2"
              data-testid={`harvest-uncertain-${src.id}`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-brand-black dark:text-white">
                  {src.locationLabel}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                  {src.uncertaintyBadge}
                </span>
              </div>

              <div className="text-xs text-brand-black dark:text-gray-200 font-medium">
                {src.reportedItems}
              </div>

              <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark leading-relaxed">
                {src.reasonAndRule}
              </div>

              {src.stockpileId != null && onOpenStockpileInventory && src.stockpileButtonLabel && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenStockpileInventory(src.stockpileId!)}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/60 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">warehouse</span>
                    <span>{src.stockpileButtonLabel}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: HARVEST EVENTS RECORDED */}
      <section
        className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 space-y-3"
        data-testid="harvest-section-recorded-events"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black dark:text-white">
              4. Harvest Events Recorded
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {recordedHarvestEvents.length} Recorded
          </span>
        </div>

        {recordedHarvestEvents.length === 0 ? (
          <div
            className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-gray-800 text-center space-y-1"
            data-testid="harvest-events-empty-state"
          >
            <span className="material-symbols-outlined text-gray-400 text-2xl">event_busy</span>
            <p className="text-xs font-bold text-brand-black dark:text-white">
              No harvest events recorded yet.
            </p>
            <p className="text-[11px] text-text-sub-light dark:text-text-sub-dark max-w-md mx-auto">
              Only explicitly recorded unit-to-unit or donor-to-unit harvest events with a verified source, destination, and date/ticket appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordedHarvestEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{ev.applianceLabel}</span>
                  <span className="text-gray-500">{ev.dateDisplay}</span>
                </div>
                <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
                  From: {ev.sourceUnitLabel} → To: {ev.destinationUnitLabel}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HarvestSourcingView;
