/**
 * utils/modelParts.ts
 *
 * Appliance Parts Tab v1 Reference Data & Helpers
 *
 * Provides:
 * - Verified model parts (exact model match only, case-insensitive, no fuzzy matching, no family carry-over)
 * - TBD category templates by appliance type (explicitly "TBD — ask Dependable by model")
 * - Unit-only exception (137 Amherst unit 137 range switch WB24T10025)
 *
 * Note on Dependable Supplier in v1:
 * "Dependable" is displayed as name only. No price, phone, address, hours, or account.
 */

import { Appliance } from '../types';

export interface ModelPartRow {
  id: string;
  name: string;
  partNumber: string | null;
  supplier: string;
  evidenceNote: string;
  isVerified: boolean;
  statusLabel: string;
}

/**
 * 1. Verified Model Parts (Exact model match only)
 */
interface VerifiedPartDef {
  targetModel: string;
  applianceType: string;
  name: string;
  partNumber: string;
  evidenceNote: string;
}

const VERIFIED_MODEL_PARTS: VerifiedPartDef[] = [
  // 1. Dishwasher, model FFCD2418US3A ONLY
  {
    targetModel: 'FFCD2418US3A',
    applianceType: 'Dishwasher',
    name: 'Askoll M376 drain pump',
    partNumber: 'A16944601',
    evidenceNote: 'Replaced Oct 15, 2026, 1723 Bath Rd unit 266; operational, load test pending on record.'
  },
  // 2. Refrigerator, model FFHT1826LS9 ONLY
  {
    targetModel: 'FFHT1826LS9',
    applianceType: 'Refrigerator',
    name: 'Crisper drawer',
    partNumber: '240337103',
    evidenceNote: '1719 Bath Rd unit 273; ordered via Dependable once the model was known.'
  },
  {
    targetModel: 'FFHT1826LS9',
    applianceType: 'Refrigerator',
    name: 'Door shelf / door bin',
    partNumber: '240338101',
    evidenceNote: '1719 Bath Rd unit 273; ordered via Dependable once the model was known.'
  },
  // 3. Refrigerator, model Midea HD663FWS ONLY (18 Elm unit 411)
  {
    targetModel: 'HD663FWS',
    applianceType: 'Refrigerator',
    name: 'Bimetal',
    partNumber: 'JRQ-0062 / TCRGQ-02',
    evidenceNote: 'Confirmed failed Oct 28, 2026 (cold OL, frozen OL); control board already changed, heater fine.'
  },
  // 4. Range, model JCBS250SM1SS ONLY
  {
    targetModel: 'JCBS250SM1SS',
    applianceType: 'Range',
    name: 'Bake element',
    partNumber: 'WS01F11296',
    evidenceNote: 'Fitment confirmed for JCBS250SM1SS only (long body, replaces WG02F05400, WS01F02247).'
  }
];

/**
 * 2. TBD Category Templates by Appliance Type
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
}

/**
 * Resolves the parts rows for a given appliance.
 */
export function getApplianceParts(appliance: Appliance): ModelPartsResolution {
  const normType = normalizeType(appliance.type);
  const rawModel = (appliance.modelNumber || appliance.specs?.model || '').trim();
  const isModelUnknown = rawModel === '' || rawModel.toLowerCase() === 'unknown' || rawModel.toLowerCase() === 'tbd';
  const cleanModel = isModelUnknown ? null : rawModel;

  const verifiedParts: ModelPartRow[] = [];
  const tbdTemplates: ModelPartRow[] = [];

  // 1. Check Verified Model Parts (Exact model match only, case-insensitive)
  if (cleanModel) {
    const matched = VERIFIED_MODEL_PARTS.filter(p =>
      normalizeType(p.applianceType) === normType &&
      p.targetModel.toLowerCase() === cleanModel.toLowerCase()
    );

    matched.forEach((p, idx) => {
      verifiedParts.push({
        id: `verified-${idx}-${p.partNumber}`,
        name: p.name,
        partNumber: p.partNumber,
        supplier: 'Dependable',
        evidenceNote: p.evidenceNote,
        isVerified: true,
        statusLabel: 'Verified'
      });
    });
  }

  // 2. Unit-only exception: 137 Amherst unit 137 Range
  if (is137AmherstRange(appliance)) {
    verifiedParts.push({
      id: 'unit-137-range-switch',
      name: 'Burner infinite switch',
      partNumber: 'WB24T10025',
      supplier: 'Dependable',
      evidenceNote: 'Rear burner heats to half dial then stops (failing infinite switch); front burner receptacle worn; switches on hand since Oct 14, 2026; whole 137 job ON HOLD until rent is paid; model unknown — confirm fitment with Dependable before ordering, do not copy to other ranges.',
      isVerified: true,
      statusLabel: 'Verified (Unit 137 Only)'
    });
  }

  // 3. TBD Category Templates
  const templateCategories = TBD_TEMPLATES_BY_TYPE[normType];
  const hasTemplate = !!templateCategories && templateCategories.length > 0;

  if (hasTemplate) {
    const modelContext = cleanModel ? `model ${cleanModel}` : 'unknown model — ask by unit';
    templateCategories.forEach((cat, idx) => {
      tbdTemplates.push({
        id: `tbd-${idx}-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: cat,
        partNumber: null,
        supplier: 'Dependable',
        evidenceNote: `No part number on file — ask Dependable by ${modelContext} before ordering.`,
        isVerified: false,
        statusLabel: 'TBD — ask Dependable'
      });
    });
  }

  return {
    verifiedParts,
    tbdTemplates,
    hasTemplate,
    isModelUnknown,
    cleanModel,
    applianceType: normType
  };
}
