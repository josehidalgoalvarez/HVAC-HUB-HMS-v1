import { Property, Appliance, Complex, BuildingCluster, Unit } from './types';
import {
    COMPLEXES,
    BUILDING_CLUSTERS,
    RESIDENTIAL_PROPERTIES,
    RESIDENTIAL_UNITS,
    RESIDENTIAL_APPLIANCES
} from './residential_constants';

// --- Mirrored Kingston Portfolio Data (Iteration 2) ---
// Structure: Complex -> Building -> Unit -> Appliance
// Groups: 10 complexes (BD, Amherst, Princess, Victoria, Alfred, Frontenac, Elm, Manitou, Singles, Office)
// BD: 13 entries (including permanently out of order 505 pool).
// Amherst: 43 buildings (odd numbers 107–229).
// Manitou: 1–58 townhouses.
// Zero fabricated serial numbers, install dates, or postal codes.

export const INITIAL_COMPLEXES: Complex[] = COMPLEXES;
export const INITIAL_CLUSTERS: BuildingCluster[] = BUILDING_CLUSTERS;
export const INITIAL_PROPERTIES: Property[] = RESIDENTIAL_PROPERTIES;
export const INITIAL_UNITS: Unit[] = RESIDENTIAL_UNITS;
export const INITIAL_APPLIANCES: Appliance[] = RESIDENTIAL_APPLIANCES;
