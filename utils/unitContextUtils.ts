import type { Unit, OccupancyStatus } from '../types/domain';

export interface UnitContextChip {
  key: string;
  label: string;
  icon: string;
  className: string;
}

/**
 * Normalizes a date string (YYYY, YYYY-MM, or YYYY-MM-DD) into a valid Date object.
 */
export const parseApproxDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Year only: YYYY
  if (/^\d{4}$/.test(trimmed)) {
    const d = new Date(`${trimmed}-01-01T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Year-Month: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}-01T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Full date: YYYY-MM-DD
  const d = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Derives a human-friendly duration string from a date until a reference date (default: now).
 * Examples: '2 mo', '5 mo', '3 yrs', '1 yr', '2 wk', '4 days'
 */
export const deriveDuration = (dateStr?: string | null, refDate: Date = new Date()): string | null => {
  const d = parseApproxDate(dateStr);
  if (!d) return null;

  const diffMs = refDate.getTime() - d.getTime();
  if (diffMs < 0) return 'Just now';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return diffDays <= 1 ? '1 day' : `${diffDays} days`;
  }
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `${w} wk`;
  }

  // Calculate approximate months
  let months = (refDate.getFullYear() - d.getFullYear()) * 12 + (refDate.getMonth() - d.getMonth());
  if (refDate.getDate() < d.getDate()) {
    months--;
  }
  months = Math.max(1, months);

  if (months < 12) {
    return `${months} mo`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0 || years >= 3) {
    return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  }

  return `${years} yr ${remainingMonths} mo`;
};

/**
 * Returns formatted time in unit string: e.g. 'in unit: 3 yrs', 'in unit: 2 mo'.
 */
export const deriveTimeInUnit = (moveInDateStr?: string | null, refDate: Date = new Date()): string | null => {
  const dur = deriveDuration(moveInDateStr, refDate);
  if (!dur) return null;
  return `in unit: ${dur}`;
};

/**
 * Returns formatted vacancy duration string: e.g. 'vacant for 5 mo', 'vacant for 2 wk'.
 */
export const deriveVacancyDuration = (vacantSinceStr?: string | null, refDate: Date = new Date()): string | null => {
  const dur = deriveDuration(vacantSinceStr, refDate);
  if (!dur) return null;
  return `vacant for ${dur}`;
};

/**
 * Returns true if move-in occurred within the last 6 months (approx 183 days).
 * A unit that crosses the 6-month line stops showing 'Recent move-in' automatically.
 */
export const isRecentMoveIn = (moveInDateStr?: string | null, refDate: Date = new Date()): boolean => {
  const d = parseApproxDate(moveInDateStr);
  if (!d) return false;

  const diffMs = refDate.getTime() - d.getTime();
  if (diffMs < 0) return false; // future date

  // 183 days ~ 6 months
  const sixMonthsMs = 183 * 24 * 60 * 60 * 1000;
  return diffMs <= sixMonthsMs;
};

/**
 * Extracts the 4-digit year from a date string if present.
 */
export const extractYear = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
  return match ? match[1] : null;
};

/**
 * Generates context chips for unit cards and ticket cards/details.
 * ONLY returns chips when data exists (no chip for unknown, no noise).
 * 1. 'Vacant' (+ duration when known)
 * 2. 'Recent move-in' (move-in within the last 6 months)
 * 3. 'Renovated' (+ year when known)
 */
export const getUnitContextChips = (unitOrTicket?: any, refDate: Date = new Date()): UnitContextChip[] => {
  if (!unitOrTicket) return [];
  const chips: UnitContextChip[] = [];

  const occupancy = unitOrTicket.occupancy_status || unitOrTicket.occupancyStatus || unitOrTicket.unit_occupancy_status || unitOrTicket.unit?.occupancy_status || unitOrTicket.unit?.occupancyStatus || 'unknown';
  const vacantSince = unitOrTicket.vacant_since || unitOrTicket.vacantSince || unitOrTicket.unit_vacant_since || unitOrTicket.unit?.vacant_since || unitOrTicket.unit?.vacantSince;
  const moveIn = unitOrTicket.move_in_date || unitOrTicket.moveInDate || unitOrTicket.unit_move_in_date || unitOrTicket.unit?.move_in_date || unitOrTicket.unit?.moveInDate;

  let renovated: boolean | null = null;
  if (typeof unitOrTicket.renovated === 'boolean') {
    renovated = unitOrTicket.renovated;
  } else if (typeof unitOrTicket.unit_renovated === 'boolean') {
    renovated = unitOrTicket.unit_renovated;
  } else if (unitOrTicket.unit && typeof unitOrTicket.unit.renovated === 'boolean') {
    renovated = unitOrTicket.unit.renovated;
  } else if (unitOrTicket.renovated && typeof unitOrTicket.renovated === 'object') {
    renovated = unitOrTicket.renovated.isRenovated ?? null;
  }

  const renovatedDate = unitOrTicket.renovated_date || unitOrTicket.renovatedDate || unitOrTicket.unit_renovated_date || unitOrTicket.unit?.renovated_date || unitOrTicket.unit?.renovatedDate || (unitOrTicket.renovated && typeof unitOrTicket.renovated === 'object' ? unitOrTicket.renovated.renovatedDate : null);

  // 1. Vacant Chip
  if (occupancy === 'vacant') {
    const dur = deriveDuration(vacantSince, refDate);
    chips.push({
      key: 'vacant',
      label: dur ? `Vacant (${dur})` : 'Vacant',
      icon: 'door_open',
      className: 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
    });
  }

  // 2. Recent Move-in Chip (within last 6 months)
  if (isRecentMoveIn(moveIn, refDate)) {
    chips.push({
      key: 'recent_move_in',
      label: 'Recent move-in',
      icon: 'person_add',
      className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
    });
  }

  // 3. Renovated Chip
  if (renovated === true) {
    const yr = extractYear(renovatedDate);
    chips.push({
      key: 'renovated',
      label: yr ? `Renovated (${yr})` : 'Renovated',
      icon: 'construction',
      className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
    });
  }

  return chips;
};

/**
 * Returns the Unit context display strings for the unit detail view.
 * Unknown fields show as 'Unknown', not blank space, in the detail block only.
 */
export const getUnitContextDetail = (unitOrTicket?: any, refDate: Date = new Date()) => {
  if (!unitOrTicket) {
    return {
      renovatedDisplay: 'Unknown',
      moveInDisplay: 'Unknown',
      occupancyDisplay: 'Unknown'
    };
  }

  const occupancy = unitOrTicket.occupancy_status || unitOrTicket.occupancyStatus || unitOrTicket.unit_occupancy_status || unitOrTicket.unit?.occupancy_status || unitOrTicket.unit?.occupancyStatus || 'unknown';
  const vacantSince = unitOrTicket.vacant_since || unitOrTicket.vacantSince || unitOrTicket.unit_vacant_since || unitOrTicket.unit?.vacant_since || unitOrTicket.unit?.vacantSince;
  const moveIn = unitOrTicket.move_in_date || unitOrTicket.moveInDate || unitOrTicket.unit_move_in_date || unitOrTicket.unit?.move_in_date || unitOrTicket.unit?.moveInDate;

  let renovated: boolean | null = null;
  if (typeof unitOrTicket.renovated === 'boolean') {
    renovated = unitOrTicket.renovated;
  } else if (typeof unitOrTicket.unit_renovated === 'boolean') {
    renovated = unitOrTicket.unit_renovated;
  } else if (unitOrTicket.unit && typeof unitOrTicket.unit.renovated === 'boolean') {
    renovated = unitOrTicket.unit.renovated;
  } else if (unitOrTicket.renovated && typeof unitOrTicket.renovated === 'object') {
    renovated = unitOrTicket.renovated.isRenovated ?? null;
  }

  const renovatedDate = unitOrTicket.renovated_date || unitOrTicket.renovatedDate || unitOrTicket.unit_renovated_date || unitOrTicket.unit?.renovated_date || unitOrTicket.unit?.renovatedDate || (unitOrTicket.renovated && typeof unitOrTicket.renovated === 'object' ? unitOrTicket.renovated.renovatedDate : null);

  // Renovated
  let renovatedDisplay = 'Unknown';
  if (renovated === true) {
    renovatedDisplay = renovatedDate ? `Yes (${renovatedDate})` : 'Yes';
  } else if (renovated === false) {
    renovatedDisplay = 'No';
  }

  // Move-in
  let moveInDisplay = 'Unknown';
  if (moveIn) {
    const timeInUnit = deriveTimeInUnit(moveIn, refDate);
    moveInDisplay = timeInUnit ? `${moveIn} (${timeInUnit})` : moveIn;
  }

  // Occupancy
  let occupancyDisplay = 'Unknown';
  if (occupancy === 'occupied') {
    occupancyDisplay = 'Occupied';
  } else if (occupancy === 'vacant') {
    const vacDur = deriveVacancyDuration(vacantSince, refDate);
    occupancyDisplay = vacDur ? `Vacant (${vacDur})` : 'Vacant';
  }

  return {
    renovatedDisplay,
    moveInDisplay,
    occupancyDisplay
  };
};
