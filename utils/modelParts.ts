/**
 * utils/modelParts.ts
 *
 * Appliance Parts Tab v2 Reference Data & Helpers
 *
 * Provides:
 * - Verified model parts resolved from the Part catalog (catalog is single source of truth)
 * - TBD category templates by appliance type (explicitly "TBD — ask Dependable by model")
 * - Deduplication coverage map between catalog verified parts and TBD category templates
 * - Unit-only exception (137 Amherst unit 137 range switch WB24T10025, frontend only)
 *
 * Note on Dependable Supplier:
 * "Dependable" is displayed as name only. No price, phone, address, hours, or account.
 */

import { Appliance } from '../types';
import type { Part, StockpileAllocation } from '../types/domain';

export interface ModelPartStockAllocation {
  stockpileId: number;
  stockpileName: string;
  stockpileLocation: string;
  quantity: number;
}

export interface ModelPartRow {
  id: string;
  name: string;
  partNumber: string | null;
  supplier: string;
  evidenceNote: string;
  isVerified: boolean;
  statusLabel: string;
  inStock: boolean;
  stockAllocations: ModelPartStockAllocation[];
}

/**
 * 1. TBD Category Templates by Appliance Type
 */
const TBD_TEMPLATES_BY_TYPE: Record<string, string[]> = {
  'Dishwasher': [
    'Drain pump',
    'Wash pump / motor',
    'Racks / trays',
    'Door latch',
    'Door gasket',
    'Hoses (inlet / drain)',
    'Spray arms',
    'Filters'
  ],
  'Refrigerator': [
    'Crisper drawers',
    'Shelves / bins',
    'Thermostat',
    'Fan motor',
    'Compressor',
    'Door gasket'
  ],
  'Range': [
    'Surface elements',
    'Bake element',
    'Broil element',
    'Infinite switches',
    'Knobs',
    'Drip bowls'
  ],
  'Range Hood': [
    'Filters',
    'Fan motor',
    'Lights (bulbs)'
  ],
  'Water Heater': [
    'Heating elements',
    'Thermostats',
    'Anode rod',
    'T&P relief valve'
  ],
  'Heater': [
    'Heating elements',
    'Thermostats',
    'Anode rod',
    'T&P relief valve'
  ],
  'Freezer': [
    'Thermostat',
    'Fan motor',
    'Door gasket',
    'Shelves / bins'
  ],
  'Washer': [
    'Drain pump',
    'Drive belt',
    'Hoses',
    'Door latch / lid switch'
  ],
  'Dryer': [
    'Heating element',
    'Drive belt',
    'Drum rollers',
    'Thermostat'
  ]
};

/**
 * Normalizes an appliance type string for dictionary matching.
 */
function normalizeType(type?: string): string {
  if (!type) return '';
  const lower = type.toLowerCase().trim();
  if (lower === 'range' || lower === 'stove' || lower === 'oven') return 'Range';
  if (lower === 'refrigerator' || lower === 'fridge') return 'Refrigerator';
  if (lower === 'dishwasher') return 'Dishwasher';
  if (lower === 'range hood' || lower === 'hood') return 'Range Hood';
  if (lower === 'water heater' || lower === 'heater') return 'Water Heater';
  if (lower === 'freezer') return 'Freezer';
  if (lower === 'washer' || lower === 'washing machine') return 'Washer';
  if (lower === 'dryer') return 'Dryer';
  return type.trim();
}

/**
 * Check if the appliance is the unit-only exception:
 * 137 Amherst unit 137 Range (live ID 2 / prop-amherst-137 range)
 */
function is137AmherstRange(appliance: Appliance): boolean {
  const normType = normalizeType(appliance.type);
  if (normType !== 'Range') return false;

  // Check unitNumber and property/building info
  const unitNum = String(appliance.unitNumber || '').trim();
  const propId = String(appliance.propertyId || '').toLowerCase();
  const location = String(appliance.location || appliance.specs?.location || '').toLowerCase();
  const notes = String(appliance.notes || '').toLowerCase();

  const is137Unit = unitNum === '137' || location.includes('137 amherst');
  const is137Prop = propId.includes('137') || propId.includes('amherst-137');
  const hasSwitchNote = notes.includes('wb24t10025');

  // Gated by building + unit + type, backed up by switch note confirmation
  return (is137Unit && (is137Prop || location.includes('amherst'))) || hasSwitchNote;
}

export interface ModelPartsResolution {
  verifiedParts: ModelPartRow[];
  tbdTemplates: ModelPartRow[];
  hasTemplate: boolean;
  isModelUnknown: boolean;
  cleanModel: string | null;
  applianceType: string;
  catalogUnavailable: boolean;
}

/**
 * Helper to extract available stock allocations from a Part record.
 */
function extractStockAllocations(part: Part): ModelPartStockAllocation[] {
  const allocations: ModelPartStockAllocation[] = [];
  if (Array.isArray(part.stockpiles)) {
    part.stockpiles.forEach((alloc: StockpileAllocation) => {
      const qty = Number(alloc.quantity) || 0;
      if (qty > 0 && alloc.status !== 'on_hold') {
        allocations.push({
          stockpileId: alloc.stockpile_id,
          stockpileName: alloc.stockpile_name || `Stockpile #${alloc.stockpile_id}`,
          stockpileLocation: alloc.stockpile_location || '',
          quantity: qty
        });
      }
    });
  }
  return allocations;
}

/**
 * Resolves the parts rows for a given appliance.
 * Accepts optional catalogParts list (loaded from API / cache / state).
 */
export function getApplianceParts(
  appliance: Appliance,
  catalogParts?: Part[] | null
): ModelPartsResolution {
  const normType = normalizeType(appliance.type);
  const rawModel = (appliance.modelNumber || appliance.specs?.model || '').trim();
  const isModelUnknown = rawModel === '' || rawModel.toLowerCase() === 'unknown' || rawModel.toLowerCase() === 'tbd';
  const cleanModel = isModelUnknown ? null : rawModel;

  const verifiedParts: ModelPartRow[] = [];
  const tbdTemplates: ModelPartRow[] = [];

  const catalogUnavailable = catalogParts === undefined || catalogParts === null;
  const activeCatalog = catalogParts || [];

  // Track verified part numbers for deduplicating TBD templates
  const verifiedPartNumbers = new Set<string>();

  // 1. Check Verified Model Parts from Catalog (Exact model match only, case-insensitive)
  if (cleanModel && activeCatalog.length > 0) {
    const cleanModelLower = cleanModel.toLowerCase();

    const matchedParts = activeCatalog.filter(p => {
      const models = p.compatible_models || p.compatibleModels;
      if (!Array.isArray(models)) return false;
      return models.some(m => typeof m === 'string' && m.trim().toLowerCase() === cleanModelLower);
    });

    matchedParts.forEach(p => {
      const pn = p.part_number || p.partNumber || '';
      verifiedPartNumbers.add(pn);

      const allocations = extractStockAllocations(p);
      const inStock = allocations.length > 0 || (Number(p.quantity_on_hand ?? p.quantityOnHand) > 0);

      const evidence = p.description || 'Verified fitment from catalog.';

      verifiedParts.push({
        id: `catalog-${p.id}-${pn}`,
        name: p.name,
        partNumber: pn || null,
        supplier: 'Dependable',
        evidenceNote: evidence,
        isVerified: true,
        statusLabel: 'Verified',
        inStock,
        stockAllocations: allocations
      });
    });
  }

  // 2. Unit-only exception: 137 Amherst unit 137 Range (frontend-only exception)
  if (is137AmherstRange(appliance)) {
    verifiedParts.push({
      id: 'unit-137-range-switch',
      name: 'Burner infinite switch',
      partNumber: 'WB24T10025',
      supplier: 'Dependable',
      evidenceNote: 'Rear burner heats to half dial then stops (failing infinite switch); front burner receptacle worn; switches on hand since Oct 14, 2026; whole 137 job ON HOLD until rent is paid; model unknown — confirm fitment with Dependable before ordering, do not copy to other ranges.',
      isVerified: true,
      statusLabel: 'Verified (Unit 137 Only)',
      inStock: false,
      stockAllocations: []
    });
  }

  // 3. TBD Category Templates with exact coverage dedupe
  const templateCategories = TBD_TEMPLATES_BY_TYPE[normType];
  const hasTemplate = !!templateCategories && templateCategories.length > 0;

  if (hasTemplate) {
    const modelContext = cleanModel ? `model ${cleanModel}` : 'unknown model — ask by unit';

    templateCategories.forEach((cat, idx) => {
      // Coverage-map deduplication:
      // - Askoll M376 (A16944601) on FFCD2418US3A -> suppresses "Drain pump"
      if (cat === 'Drain pump' && verifiedPartNumbers.has('A16944601')) {
        return;
      }
      // - Crisper drawer (240337103) on FFHT1826LS9 -> suppresses "Crisper drawers"
      if (cat === 'Crisper drawers' && verifiedPartNumbers.has('240337103')) {
        return;
      }
      // - Bake element (WS01F11296) on JCBS250SM1SS -> suppresses "Bake element"
      if (cat === 'Bake element' && verifiedPartNumbers.has('WS01F11296')) {
        return;
      }
      // Note: Door shelf / door bin (240338101) does NOT suppress "Shelves / bins" (only partial coverage)
      // Note: Bimetal (JRQ-0062 / TCRGQ-02) does NOT suppress defrost thermostat/heater (retained)

      tbdTemplates.push({
        id: `tbd-${idx}-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: cat,
        partNumber: null,
        supplier: 'Dependable',
        evidenceNote: `No part number on file — ask Dependable by ${modelContext} before ordering.`,
        isVerified: false,
        statusLabel: 'TBD — ask Dependable',
        inStock: false,
        stockAllocations: []
      });
    });
  }

  return {
    verifiedParts,
    tbdTemplates,
    hasTemplate,
    isModelUnknown,
    cleanModel,
    applianceType: normType,
    catalogUnavailable
  };
}
