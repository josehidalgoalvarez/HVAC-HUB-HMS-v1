import { Property, Appliance, Complex, BuildingCluster, Unit, ApplianceDefaultSet } from './types';
import {
    COMPLEXES,
    BUILDING_CLUSTERS,
    RESIDENTIAL_PROPERTIES,
    RESIDENTIAL_UNITS,
    RESIDENTIAL_APPLIANCES,
    DEFAULT_APPLIANCE_SETS
} from './residential_constants';

// --- Mirrored Kingston Portfolio Data (Task 1 & Task 3) ---
// Structure: Complex -> Building -> Unit -> Appliance
// Complexes: BD (12 buildings) + Elm/Colborne (3 buildings); rest Ungrouped (73 buildings).
// Default Sets: BD Apartment, BD Apartment 1-bed, BD Townhouse, Elm+Colborne Apartment.
// Zero fabricated serial numbers, install dates, or postal codes.

export const INITIAL_COMPLEXES: Complex[] = COMPLEXES;
export const INITIAL_CLUSTERS: BuildingCluster[] = BUILDING_CLUSTERS;
export const INITIAL_PROPERTIES: Property[] = RESIDENTIAL_PROPERTIES;
export const INITIAL_UNITS: Unit[] = RESIDENTIAL_UNITS;
export const INITIAL_APPLIANCES: Appliance[] = RESIDENTIAL_APPLIANCES;
export const INITIAL_DEFAULT_SETS: ApplianceDefaultSet[] = DEFAULT_APPLIANCE_SETS;

