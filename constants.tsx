import { Property, Appliance } from './types';
import { RESIDENTIAL_PROPERTIES, RESIDENTIAL_APPLIANCES } from './residential_constants';

// --- Mirrored Kingston Portfolio Data ---
// Mirrored from residential_constants.tsx (Jose's verified Kingston portfolio data).
// Verified from Jose's Patry work orders. 1727 and 1735 Bath Rd removed (no work orders).
// The only verified postal code is 1723 Bath Rd (K7M 4Y9). All other postal codes are UNKNOWN.
// Zero fabricated serial numbers, install dates, or postal codes.

export const INITIAL_PROPERTIES: Property[] = RESIDENTIAL_PROPERTIES;

export const INITIAL_APPLIANCES: Appliance[] = RESIDENTIAL_APPLIANCES;
