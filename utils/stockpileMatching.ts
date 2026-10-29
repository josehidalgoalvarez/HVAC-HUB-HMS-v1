import type { Stockpile } from '../types/domain';

export function normalizeMatchString(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\broad\b/g, 'rd')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface BuildingStockpileResolution {
  isMcKay: boolean;
  mckayStockpiles: Stockpile[];
  matchedStockpile: Stockpile | null;
  targetStockpileId: number | string | null;
}

export function resolveBuildingStockpile(
  building: {
    id: string | number;
    name?: string | null;
    address?: string | null;
    role?: string | null;
  } | null | undefined,
  stockpilesList: Stockpile[]
): BuildingStockpileResolution {
  if (!building) {
    return {
      isMcKay: false,
      mckayStockpiles: [],
      matchedStockpile: null,
      targetStockpileId: null,
    };
  }

  const normBName = normalizeMatchString(building.name);
  const normBAddress = normalizeMatchString(building.address);
  const bNumericId = String(building.id).replace(/\D/g, '');

  // McKay is special: building 89 / name contains "mckay" opens the McKay menu
  const isMcKay = bNumericId === '89' || normBName.includes('mckay');

  const mckayStockpiles = isMcKay
    ? stockpilesList.filter(sp => {
        const spBuildingNumeric = sp.building_id != null ? String(sp.building_id).replace(/\D/g, '') : '';
        const spBuildingIdStr = sp.buildingId != null ? String(sp.buildingId).replace(/\D/g, '') : '';
        if (spBuildingNumeric === '89' || (bNumericId && spBuildingNumeric === bNumericId)) return true;
        if (spBuildingIdStr === '89' || (bNumericId && spBuildingIdStr === bNumericId)) return true;
        if (normalizeMatchString(sp.name).includes('mckay')) return true;
        if (normalizeMatchString(sp.location).includes('mckay')) return true;
        return false;
      })
    : [];

  if (isMcKay) {
    return {
      isMcKay: true,
      mckayStockpiles,
      matchedStockpile: mckayStockpiles[0] || null,
      targetStockpileId: null, // McKay opens McKay menu, never a single stockpile
    };
  }

  // Generic resolution order (matches building to stockpile for ANY role):
  // (a) Numeric building_id / buildingId match
  // (b) Normalized name substring match
  // (c) Normalized address / location substring match
  const matchedStockpile =
    // (a) First: match numerically by building_id
    stockpilesList.find(sp => {
      const spBuildingNum = sp.building_id != null ? String(sp.building_id).replace(/\D/g, '') : '';
      const spBuildingAltNum = sp.buildingId != null ? String(sp.buildingId).replace(/\D/g, '') : '';
      if (bNumericId && spBuildingNum && bNumericId === spBuildingNum) return true;
      if (bNumericId && spBuildingAltNum && bNumericId === spBuildingAltNum) return true;
      return false;
    }) ||
    // (b) Second: match by building name
    stockpilesList.find(sp => {
      const normSpName = normalizeMatchString(sp.name);
      if (normBName && normSpName && (normSpName.includes(normBName) || normBName.includes(normSpName))) return true;
      return false;
    }) ||
    // (c) Third: match by address / location
    stockpilesList.find(sp => {
      const normLoc = normalizeMatchString(sp.location);
      if (normBAddress && normLoc && (normLoc.includes(normBAddress) || normBAddress.includes(normLoc))) return true;
      return false;
    }) ||
    null;

  return {
    isMcKay: false,
    mckayStockpiles: [],
    matchedStockpile,
    targetStockpileId: matchedStockpile ? matchedStockpile.id : null,
  };
}
