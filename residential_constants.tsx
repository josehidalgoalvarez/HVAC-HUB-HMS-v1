import {
    Complex,
    BuildingCluster,
    StorageItem,
    Property,
    Unit,
    Appliance,
    ApplianceDefaultSet
} from './types/domain';

// --- Verified Kingston Portfolio & Complex Structure ---
// Iteration 2: Real portfolio structure: Complex -> Building -> Unit -> Appliance.
// Rules: Zero fabricated serial numbers, install dates, or postal codes.
// Provenance: 'verified' (work orders/photos) vs 'pattern' (generated from rules).
// The only verified postal code is 1723 Bath Rd (K7M 4Y9). All other postal codes are UNKNOWN.

// ==========================================
// 1. COMPLEXES (Task 1: BD + Elm/Colborne; rest Ungrouped)
// ==========================================

export const COMPLEXES: Complex[] = [
    {
        id: 'bd',
        slug: 'bd',
        code: 'BD',
        name: 'BD',
        description: 'Bath Road & Days Road residential complex in Kingston, ON. 511 Days Rd is the storage building.',
        address: 'Bath Rd & Days Rd, Kingston, ON',
        buildingCount: 12
    },
    {
        id: 'amherst',
        slug: 'amherst',
        code: 'AMHERST',
        name: 'Amherst',
        description: 'Long row of 43 apartment buildings in Amherstview, ON (odd numbers 107–229).',
        address: 'Amherstview, ON',
        buildingCount: 43
    },
    {
        id: 'manitou',
        slug: 'manitou',
        code: 'MANITOU',
        name: 'Manitou',
        description: 'Manitou Crescent townhouse row (1–58 Manitou Cres, anchored by 77 Manitou Cres).',
        address: 'Manitou Cres, Kingston, ON',
        buildingCount: 1
    },
    {
        id: 'princess',
        slug: 'princess',
        code: 'PRINCESS',
        name: 'Princess',
        description: 'Princess Street multi-unit properties in Kingston, ON.',
        address: 'Princess St, Kingston, ON',
        buildingCount: 7
    },
    {
        id: 'victoria',
        slug: 'victoria',
        code: 'VICTORIA',
        name: 'Victoria',
        description: 'Victoria Street residential properties in Kingston, ON.',
        address: 'Victoria St, Kingston, ON',
        buildingCount: 4
    },
    {
        id: 'alfred',
        slug: 'alfred',
        code: 'ALFRED',
        name: 'Alfred',
        description: 'Alfred Street residential multi-unit cluster in Kingston, ON.',
        address: 'Alfred St, Kingston, ON',
        buildingCount: 6
    },
    {
        id: 'frontenac',
        slug: 'frontenac',
        code: 'FRONTENAC',
        name: 'Frontenac',
        description: 'Frontenac Street residential properties in Kingston, ON.',
        address: 'Frontenac St, Kingston, ON',
        buildingCount: 2
    },
    {
        id: 'elm-colborne',
        slug: 'elm-colborne',
        code: 'ELM-COLBORNE',
        name: 'Elm + Colborne',
        description: '18 Elm St, 24 Elm St, and 203 Colborne St proximity cluster.',
        address: 'Elm St & Colborne St, Kingston, ON',
        buildingCount: 3
    }
];

// ==========================================
// 2. APPLIANCE DEFAULT SETS (First-Class Feature)
// ==========================================

export const DEFAULT_APPLIANCE_SETS: ApplianceDefaultSet[] = [
    {
        id: 'set-bd-apt',
        complexSlug: 'bd',
        complexId: 'bd',
        name: 'BD / Apartment (default)',
        unitType: 'apartment',
        isDefault: true,
        bedrooms: 2,
        bathrooms: 1,
        stories: 1,
        hasUnitWaterHeater: false,
        appliances: [
            { category: 'Kitchen', label: 'Fridge (default)', name: 'Fridge (default)', type: 'Refrigerator', isDefault: true, specs: { capacity: '18 cu. ft.', volts: '120', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Stove (electric coil)', name: 'Stove (electric coil) (default)', type: 'Range', isDefault: true, specs: { fuelType: 'Electric', volts: '240', capacity: '5.3 cu. ft.' } },
            { category: 'Kitchen', label: 'Dishwasher (default)', name: 'Dishwasher (default)', type: 'Dishwasher', isDefault: true, specs: { volts: '120', capacity: '14 Place Settings', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Range Hood (default)', name: 'Range Hood (default)', type: 'Range Hood', isDefault: true, specs: { volts: '120', fuelType: 'Electric', capacity: '300 CFM' } }
        ],
        notes: '2 bed / 1 washroom. Shared laundry room appliances, shared water heaters on building/mechanical room.'
    },
    {
        id: 'set-bd-apt-1bed',
        complexSlug: 'bd',
        complexId: 'bd',
        name: 'BD / Apartment 1-bed (variant)',
        unitType: 'apartment',
        isDefault: false,
        bedrooms: 1,
        bathrooms: 1,
        stories: 1,
        hasUnitWaterHeater: false,
        appliances: [
            { category: 'Kitchen', label: 'Fridge (default)', name: 'Fridge (default)', type: 'Refrigerator', isDefault: true, specs: { capacity: '18 cu. ft.', volts: '120', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Stove (electric coil)', name: 'Stove (electric coil) (default)', type: 'Range', isDefault: true, specs: { fuelType: 'Electric', volts: '240', capacity: '5.3 cu. ft.' } },
            { category: 'Kitchen', label: 'Dishwasher (default)', name: 'Dishwasher (default)', type: 'Dishwasher', isDefault: true, specs: { volts: '120', capacity: '14 Place Settings', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Range Hood (default)', name: 'Range Hood (default)', type: 'Range Hood', isDefault: true, specs: { volts: '120', fuelType: 'Electric', capacity: '300 CFM' } }
        ],
        notes: '1 bed / 1 washroom variant. Same appliance list as default apartment set.'
    },
    {
        id: 'set-bd-townhouse',
        complexSlug: 'bd',
        complexId: 'bd',
        name: 'BD / Townhouse',
        unitType: 'townhouse',
        isDefault: true,
        bedrooms: 3,
        bathrooms: 2,
        stories: 3,
        hasUnitWaterHeater: true,
        appliances: [
            { category: 'Kitchen', label: 'Fridge (default)', name: 'Fridge (default)', type: 'Refrigerator', isDefault: true, specs: { capacity: '18 cu. ft.', volts: '120', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Stove (electric coil)', name: 'Stove (default)', type: 'Range', isDefault: true, specs: { fuelType: 'Electric', volts: '240', capacity: '5.3 cu. ft.' } },
            { category: 'Kitchen', label: 'Dishwasher (default)', name: 'Dishwasher (default)', type: 'Dishwasher', isDefault: true, specs: { volts: '120', capacity: '14 Place Settings', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Range Hood (default)', name: 'Range Hood (default)', type: 'Range Hood', isDefault: true, specs: { volts: '120', fuelType: 'Electric', capacity: '300 CFM' } },
            { category: 'Water Heating', label: 'Unit Water Heater (default)', name: 'Unit Water Heater (default)', type: 'Water Heater', isDefault: true, specs: { fuelType: 'Electric', btuInput: '4500W', capacity: '60 Gallons', volts: '240' } }
        ],
        notes: '3 stories (2 floors + basement), 2 washrooms, per-unit water heater.'
    },
    {
        id: 'set-elm-apt',
        complexSlug: 'elm-colborne',
        complexId: 'elm-colborne',
        name: 'Elm + Colborne / Apartment',
        unitType: 'apartment',
        isDefault: true,
        bedrooms: 2,
        bathrooms: 1,
        stories: 1,
        hasUnitWaterHeater: false,
        appliances: [
            { category: 'Kitchen', label: 'Fridge (default)', name: 'Fridge (default)', type: 'Refrigerator', isDefault: true, specs: { capacity: '18 cu. ft.', volts: '120', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Stove (electric coil)', name: 'Stove (default)', type: 'Range', isDefault: true, specs: { fuelType: 'Electric', volts: '240', capacity: '5.3 cu. ft.' } },
            { category: 'Kitchen', label: 'Dishwasher (default)', name: 'Dishwasher (default)', type: 'Dishwasher', isDefault: true, specs: { volts: '120', capacity: '14 Place Settings', fuelType: 'Electric' } },
            { category: 'Kitchen', label: 'Range Hood (default)', name: 'Range Hood (default)', type: 'Range Hood', isDefault: true, specs: { volts: '120', fuelType: 'Electric', capacity: '300 CFM' } }
        ],
        notes: 'Independent copy of BD apartment set for Elm + Colborne. Editable in one place.'
    }
];

// ==========================================
// 2. BUILDING CLUSTERS & SHARED SYSTEMS
// ==========================================

export const BUILDING_CLUSTERS: BuildingCluster[] = [
    {
        id: 'cluster-bd-1719-1723',
        name: '1719–1723 Bath Rd Attached Trio',
        complexId: 'bd',
        buildingIds: ['prop-bath-1719', 'prop-bath-1721', 'prop-bath-1723'],
        sharedSystems: [
            {
                type: 'electrical',
                locationBuildingId: 'prop-bath-1721',
                locationName: '1721 Bath Rd Mechanical Room',
                description: 'Shared electrical service, shutoffs, and fiber optic hub for 1719, 1721, and 1723 Bath Rd.'
            },
            {
                type: 'water_heating',
                locationBuildingId: 'prop-bath-1721',
                locationName: '1721 Bath Rd Mechanical Room',
                description: 'Shared water heating bank: 7 water heaters (3 operational, 2 valved-off holding stagnant water, 2 disconnected rotting).'
            }
        ],
        notes: 'Attached trio. Laundry in all three: 1719 sink YES, 1721 NO, 1723 YES.'
    },
    {
        id: 'cluster-bd-1731-1733',
        name: '1731–1733 Bath Rd Attached Pair',
        complexId: 'bd',
        buildingIds: ['prop-bath-1731', 'prop-bath-1733'],
        sharedSystems: [
            {
                type: 'electrical',
                locationBuildingId: 'prop-bath-1731',
                locationName: '1731/1733 Shared Mechanical Room',
                description: 'Shared electrical feed between attached pair.'
            },
            {
                type: 'mechanical',
                locationBuildingId: 'prop-bath-1731',
                locationName: '1731/1733 Shared Mechanical Room',
                description: 'Shared mechanical room between buildings: 1 electric water heater + 2 donor fridges (parts sources).'
            }
        ],
        notes: 'Laundry in both basements: 1731 WITH sink, 1733 without sink.'
    },
    {
        id: 'cluster-bd-509-511',
        name: '509–511 Days Rd Attached Pair',
        complexId: 'bd',
        buildingIds: ['prop-days-509', 'prop-days-511'],
        sharedSystems: [
            {
                type: 'mechanical',
                locationBuildingId: 'prop-days-511',
                locationName: '511 Days Rd Basement & Mechanical Room',
                description: 'Attached pair with shared mechanical room and complex storage node in 511 basement.'
            }
        ],
        notes: 'Laundry: 511 WITH sink; 509 no sink (believed // TODO-verify).'
    },
    {
        id: 'cluster-elm-colborne',
        name: 'Elm & Colborne Proximity Cluster',
        complexId: 'elm-colborne',
        buildingIds: ['prop-elm-18', 'prop-elm-24', 'prop-colborne-203'],
        sharedSystems: [
            {
                type: 'proximity',
                locationBuildingId: 'prop-colborne-203',
                locationName: 'Colborne / Elm Shared Lot',
                description: 'The Elm buildings sit directly behind 203 Colborne St.'
            }
        ]
    }
];

// ==========================================
// 3. STORAGE INVENTORIES (Verified)
// ==========================================

export const STORAGE_511_DAYS: StorageItem[] = [
    { id: 'st-511-dw', name: 'Stored Dishwasher', category: 'appliances', quantity: 1, notes: 'Model TODO-verify', provenance: 'verified' },
    { id: 'st-511-stoves', name: 'White Stoves', category: 'appliances', quantity: 2, notes: 'Models TODO-verify. White stoves rule: donor coils by size only.', provenance: 'verified' },
    { id: 'st-511-wh', name: 'Rheem Tank Water Heater', category: 'appliances', quantity: 1, notes: 'Spare tank water heater', provenance: 'verified' },
    { id: 'st-511-parts', name: 'Parts Stash', category: 'parts', notes: 'General HVAC/plumbing spares stash', provenance: 'verified' },
    { id: 'st-511-ladder', name: 'Featherlite Step Ladder', category: 'tools', quantity: 1, provenance: 'verified' },
    { id: 'st-511-tools', name: 'Hand & Power Tools', category: 'tools', provenance: 'verified' },
    { id: 'st-511-washer', name: 'Vapor / Pressure Washer', category: 'equipment', quantity: 1, provenance: 'verified' },
    { id: 'st-511-shovel', name: 'Snow Shovel', category: 'tools', quantity: 1, provenance: 'verified' },
    { id: 'st-511-chems', name: 'Cleaning Supplies & Chemicals', category: 'supplies', provenance: 'verified' },
    { id: 'st-511-vac', name: 'Kärcher Wet/Dry Vac', category: 'equipment', quantity: 1, provenance: 'verified' },
    { id: 'st-511-tiles', name: 'USG Ceiling Tiles', category: 'supplies', notes: 'Acoustic/drop ceiling replacement tiles', provenance: 'verified' },
    { id: 'st-511-lumber', name: 'Lumber', category: 'supplies', notes: 'Framing and repair lumber boards', provenance: 'verified' },
    { id: 'st-511-pump', name: 'Spare Askoll M376 Drain Pump', category: 'parts', quantity: 1, notes: 'Part A16944601 for Frigidaire dishwashers', provenance: 'verified' }
];

export const STORAGE_107_AMHERST: StorageItem[] = [
    { id: 'st-107-chems', name: 'Cleaning Chemicals', category: 'supplies', provenance: 'verified' },
    { id: 'st-107-paint', name: 'Paint & Drywall Supplies', category: 'supplies', provenance: 'verified' },
    { id: 'st-107-saw', name: 'Miter Saw & Tools', category: 'tools', quantity: 1, provenance: 'verified' },
    { id: 'st-107-parts', name: 'Electrical & Plumbing Parts', category: 'parts', notes: 'Switches, fittings, valves, breakers', provenance: 'verified' },
    { id: 'st-107-stoves', name: 'White Coil Stoves', category: 'appliances', quantity: 2, notes: 'White stoves rule: donor coils by size only — never into gray Frigidaire.', provenance: 'verified' },
    { id: 'st-107-screens', name: 'Pre-made Window Screens & Screen Tools', category: 'supplies', provenance: 'verified' },
    { id: 'st-107-exting', name: 'Fire Extinguisher', category: 'equipment', quantity: 1, provenance: 'verified' },
    { id: 'st-107-firstaid', name: 'First-Aid Kit', category: 'supplies', quantity: 1, provenance: 'verified' }
];

export const STORAGE_1719_BATH: StorageItem[] = [
    {
        id: 'st-1719-stoves',
        name: 'White Coil-Top Stoves',
        category: 'appliances',
        quantity: 4,
        notes: 'Stoves flagged: strip usable elements -> dispose (pending job).',
        flags: ['strip_usable_elements', 'dispose_pending'],
        provenance: 'verified'
    },
    {
        id: 'st-1719-fridges',
        name: 'White Top-Freezer Refrigerators',
        category: 'appliances',
        quantity: 3,
        notes: 'Donor appliances on site at 1719 Bath basement',
        provenance: 'verified'
    },
    {
        id: 'st-1719-danby-ac',
        name: 'Danby Portable AC',
        category: 'appliances',
        quantity: 1,
        notes: 'Portable seasonal cooling unit in basement storage',
        provenance: 'verified'
    }
];

// ==========================================
// 4. PROPERTIES (89 Total across 10 Complexes)
// ==========================================

// Helper: list of 43 Amherst building numbers
const AMHERST_NUMBERS = [
    229, 225, 219, 217, 213, 211, 209, 207, 205, 201,
    199, 197, 195, 193, 191, 187, 183, 179, 177, 175,
    173, 171, 169, 167, 165, 161, 157, 153, 149, 145,
    141, 137, 135, 133, 131, 129, 127, 125, 123, 119,
    115, 111, 107
];

export const RESIDENTIAL_PROPERTIES: Property[] = [
    // ----------------------------------------------------
    // 1) BD Complex (Bath Rd + Days Rd) — 12 Buildings
    // ----------------------------------------------------
    {
        id: 'prop-days-505',
        complexId: 'bd',
        complexName: 'BD',
        code: 'bd0505',
        name: '505 Days Road',
        address: '505 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_c61a96df0f03a7620bf1.jpg',
        applianceCount: 1,
        comments: 'STANDALONE electrical (the exception in BD complex), different layout/floors, nothing stored here.',
        definedRooms: ['Unit 103'],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },
    {
        id: 'prop-days-507',
        complexId: 'bd',
        complexName: 'BD',
        code: 'bd0507',
        name: '507 Days Road',
        address: '507 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
        applianceCount: 0,
        comments: 'TOWNHOUSES: 3 stories (2 floors + basement), 2 washrooms, own water heater per unit (believed // TODO-verify), laundry WITH sink, NO storage. 2-digit unit numbers.',
        definedRooms: ['Unit 32'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: true, notes: 'Laundry WITH sink' },
        provenance: 'verified'
    },
    {
        id: 'prop-days-509',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-509-511',
        code: 'bd0509',
        name: '509 Days Road',
        address: '509 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
        applianceCount: 0,
        comments: 'Attached pair with 511 Days Rd. Shared mechanical room with 511. Laundry: no sink (believed // TODO-verify).',
        definedRooms: ['Mechanical Room'],
        floors: ['Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, notes: 'No sink (believed // TODO-verify)' },
        provenance: 'verified'
    },
    {
        id: 'prop-days-511',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-509-511',
        code: 'bd0511',
        name: '511 Days Road',
        address: '511 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_c61a96df0f03a7620bf1.jpg',
        applianceCount: 0,
        isStorageNode: true,
        storageInventory: STORAGE_511_DAYS,
        comments: 'Attached pair with 509 Days Rd, SHARED mechanical room. Complex storage node in 511 basement. Storage building. Laundry: WITH sink.',
        definedRooms: ['Basement Storage', 'Mechanical Room', 'Laundry Room'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: true, notes: '511 laundry WITH sink' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1719',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-1719-1723',
        code: 'bd1719',
        name: '1719 Bath Road',
        address: '1719 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 1,
        isStorageNode: true,
        storageInventory: STORAGE_1719_BATH,
        comments: 'Attached trio (1719-1721-1723), SHARED electrical + water heating at 1721. Laundry: sink YES. 1719 basement storage: 3-4 white coil stoves + 2-3 fridges + Danby AC.',
        definedRooms: ['Basement', 'Mechanical Room', 'Unit 273', 'Laundry Room'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: true, notes: 'Laundry sink YES' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1721',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-1719-1723',
        code: 'bd1721',
        name: '1721 Bath Road',
        address: '1721 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 7,
        comments: 'Attached trio hub: shared mechanical room containing 7 water heaters (3 working, 2 valved-off stagnant, 2 disconnected rotting), fiber connections, electrical shutoffs. Laundry: sink NO.',
        definedRooms: ['Shared Mechanical Room', 'Unit 268', 'Unit 266', 'Laundry Room'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, notes: 'Laundry sink NO' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1723',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-1719-1723',
        code: 'bd1723',
        name: '1723 Bath Road',
        address: '1723 Bath Rd, Kingston, ON K7M 4Y9', // Verified postal code
        imageUrl: '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
        applianceCount: 1,
        comments: 'Attached trio with 1719 & 1721. Shared electrical & water heating from 1721. Laundry: sink YES. Verified postal code: K7M 4Y9.',
        definedRooms: ['Unit 266', 'Unit 67', 'Kitchen', 'Laundry Room'],
        floors: ['Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: true, notes: 'Laundry sink YES' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1725',
        complexId: 'bd',
        complexName: 'BD',
        code: 'bd1725',
        name: '1725 Bath Road',
        address: '1725 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_3fba10b6250dd34fcc10.jpg',
        applianceCount: 0,
        comments: 'Apartments with inner hallways. Laundry contains Bell cable setup + 1 water heater (believed // TODO-verify). Automated timer lights. NO electrical room located (open item: main panel unknown; kept power during past outage while 507 lost it). 2-digit units.',
        definedRooms: ['Laundry Room', 'Inner Hallways'],
        floors: ['Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, hasTimer: true, notes: 'Bell setup + 1 water heater (believed // TODO-verify). Lights on timer.' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1727',
        complexId: 'bd',
        complexName: 'BD',
        code: 'bd1727',
        name: '1727 Bath Road',
        address: '1727 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 0,
        comments: 'TOWNHOUSES, no hallway, no communal laundry. 2-digit unit numbers. Restored verified property.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, notes: 'No communal laundry' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1731',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-1731-1733',
        code: 'bd1731',
        name: '1731 Bath Road',
        address: '1731 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
        applianceCount: 3,
        comments: 'Attached pair with 1733, SHARED electrical. Shared mechanical room between them: 1 electric water heater + 2 donor fridges (parts sources). Laundry: WITH sink. Building drain stack recurring blockages.',
        definedRooms: ['Unit G63', 'Unit 161', 'Shared Mechanical Room', 'Laundry Room'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: true, notes: 'Laundry in basement WITH sink' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1733',
        complexId: 'bd',
        complexName: 'BD',
        clusterId: 'cluster-bd-1731-1733',
        code: 'bd1733',
        name: '1733 Bath Road',
        address: '1733 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_5a0393354bd60e0ac63f.jpg',
        applianceCount: 0,
        comments: 'Attached pair with 1731, SHARED electrical. Laundry in basement: without sink.',
        definedRooms: ['Basement Laundry'],
        floors: ['Basement', 'Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, notes: 'Laundry in basement without sink' },
        provenance: 'verified'
    },
    {
        id: 'prop-bath-1737',
        complexId: 'bd',
        complexName: 'BD',
        code: 'bd1737',
        name: '1737 Bath Road',
        address: '1737 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8db7e895c76fcfce8de5.jpg',
        applianceCount: 0,
        comments: 'TOWNHOUSES (count 4-6 // TODO-verify), no hallway, no communal laundry. 2-digit unit numbers.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        laundryConfig: { hasSink: false, notes: 'No communal laundry' },
        provenance: 'verified'
    },

    // ----------------------------------------------------
    // 2) AMHERST (Amherstview) — 43 Buildings (107–229)
    // ----------------------------------------------------
    ...AMHERST_NUMBERS.map(num => {
        const id = `prop-amherst-${num}`;
        const isTownhouse = num === 125;
        const isStorage = num === 107;
        const isVerifiedUnit137 = num === 137;

        return {
            id,
            complexId: 'amherst',
            complexName: 'Amherst',
            code: `${num} Amherst Dr`,
            name: `${num} Amherst Drive`,
            address: `${num} Amherst Dr, Amherstview, ON`, // TODO-verify postal code (UNKNOWN)
            imageUrl: isVerifiedUnit137
                ? '/uploads/photo_7b90897a4994f447765e.jpg'
                : '/uploads/photo_7b90897a4994f447765e.jpg',
            applianceCount: isVerifiedUnit137 ? 2 : 0,
            isStorageNode: isStorage,
            storageInventory: isStorage ? STORAGE_107_AMHERST : undefined,
            comments: isTownhouse
                ? 'Amherst Townhouse building in the time tracking system.'
                : isStorage
                    ? 'Storage node for Amherst (supplies, tools, 2 white coil stoves). Unit pattern: 101-112, 201-212, 301-312 (36 units).'
                    : isVerifiedUnit137
                        ? 'Residential unit building. Verified unit 137 (range, water heater).'
                        : 'Apartment building in Amherst row (odd numbers 107-229). Floor-coded units.',
            definedRooms: isVerifiedUnit137 ? ['Unit 137', 'Kitchen'] : isStorage ? ['Storage Area', 'Utility Room'] : [],
            floors: ['First Floor', 'Second Floor', 'Third Floor'],
            provenance: isVerifiedUnit137 || isStorage || isTownhouse ? ('verified' as const) : ('pattern' as const)
        };
    }),

    // ----------------------------------------------------
    // 3) PRINCESS — 7 Buildings
    // ----------------------------------------------------
    ...[563, 565, 567, 630, 655, 800, 837].map(num => ({
        id: `prop-princess-${num}`,
        complexId: 'princess',
        complexName: 'Princess',
        code: `${num} Princess St`,
        name: `${num} Princess Street`,
        address: `${num} Princess St, Kingston, ON`, // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_cdde6e8442e952e7c538.jpg',
        applianceCount: 0,
        comments: 'Princess Street multi-unit property.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified' as const
    })),

    // ----------------------------------------------------
    // 4) VICTORIA — 4 Buildings
    // ----------------------------------------------------
    ...[585, 614, 616, 620].map(num => ({
        id: `prop-victoria-${num}`,
        complexId: 'victoria',
        complexName: 'Victoria',
        code: `${num} Victoria St`,
        name: `${num} Victoria Street`,
        address: `${num} Victoria St, Kingston, ON`, // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
        applianceCount: 0,
        comments: 'Victoria Street residential property.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified' as const
    })),

    // ----------------------------------------------------
    // 5) ALFRED — 6 Buildings
    // ----------------------------------------------------
    ...[353, 359, 361, 376, 378, 394].map(num => ({
        id: `prop-alfred-${num}`,
        complexId: 'alfred',
        complexName: 'Alfred',
        code: `${num} Alfred St`,
        name: `${num} Alfred Street`,
        address: `${num} Alfred St, Kingston, ON`, // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 0,
        comments: 'Alfred Street residential multi-unit cluster.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified' as const
    })),

    // ----------------------------------------------------
    // 6) FRONTENAC — 2 Buildings
    // ----------------------------------------------------
    ...[501, 520].map(num => ({
        id: `prop-frontenac-${num}`,
        complexId: 'frontenac',
        complexName: 'Frontenac',
        code: `${num} Frontenac St`,
        name: `${num} Frontenac Street`,
        address: `${num} Frontenac St, Kingston, ON`, // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 0,
        comments: 'Frontenac Street residential property.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified' as const
    })),

    // ----------------------------------------------------
    // 7) ELM + COLBORNE Complex — 3 Buildings
    // ----------------------------------------------------
    {
        id: 'prop-elm-18',
        complexId: 'elm-colborne',
        complexName: 'Elm + Colborne',
        clusterId: 'cluster-elm-colborne',
        code: '18 Elm St',
        name: '18 Elm Street',
        address: '18 Elm St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_3fba10b6250dd34fcc10.jpg',
        applianceCount: 0,
        comments: 'Sits right behind 203 Colborne St.',
        definedRooms: [],
        floors: ['First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'],
        provenance: 'verified'
    },
    {
        id: 'prop-elm-24',
        complexId: 'elm-colborne',
        complexName: 'Elm + Colborne',
        clusterId: 'cluster-elm-colborne',
        code: '24 Elm St',
        name: '24 Elm Street',
        address: '24 Elm St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_3fba10b6250dd34fcc10.jpg',
        applianceCount: 0,
        comments: 'Sits right behind 203 Colborne St.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },
    {
        id: 'prop-colborne-203',
        complexId: 'elm-colborne',
        complexName: 'Elm + Colborne',
        clusterId: 'cluster-elm-colborne',
        code: '203 Colborne St',
        name: '203 Colborne Street',
        address: '203 Colborne St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_cdde6e8442e952e7c538.jpg',
        applianceCount: 0,
        comments: 'Front building facing Colborne; 18 & 24 Elm sit directly behind.',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },

    // ----------------------------------------------------
    // 8) MANITOU — Townhouses 1–58
    // ----------------------------------------------------
    {
        id: 'prop-manitou-cres',
        complexId: 'manitou',
        complexName: 'Manitou',
        code: 'MANITOU',
        name: 'Manitou Crescent Townhouses',
        address: '1–58 Manitou Cres, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_5a0393354bd60e0ac63f.jpg',
        applianceCount: 0,
        comments: 'Townhouses, 1-58 Manitou Cres (anchored by 77 Manitou Cres entry).',
        definedRooms: [],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },

    // ----------------------------------------------------
    // 9) SINGLES & STANDALONE — 9 Entries [Ungrouped]
    // ----------------------------------------------------
    {
        id: 'prop-blackburn-810',
        code: '810 Blackburn Mews',
        name: '810 Blackburn Mews',
        address: '810 Blackburn Mews, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8db7e895c76fcfce8de5.jpg',
        applianceCount: 0,
        comments: 'Commercial / standalone unit.',
        definedRooms: [],
        provenance: 'verified'
    },
    {
        id: 'prop-park-85',
        code: '85 Park St',
        name: '85 Park Street',
        address: '85 Park St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 0,
        comments: 'Residential standalone property.',
        definedRooms: [],
        provenance: 'verified'
    },
    {
        id: 'prop-railway-176',
        code: '176 Railway St',
        name: '176 Railway Street',
        address: '176 Railway St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 0,
        comments: 'Residential standalone property.',
        definedRooms: [],
        provenance: 'verified'
    },
    {
        id: 'prop-ontario-55',
        code: '55 Ontario St',
        name: '55 Ontario Street',
        address: '55 Ontario St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_4339fa51f592921622d8.jpg',
        applianceCount: 0,
        comments: 'Waterfront / downtown residential property.',
        definedRooms: [],
        provenance: 'verified'
    },
    {
        id: 'prop-durham-36',
        code: '36 Durham St',
        name: '36 Durham Street',
        address: '36 Durham St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
        applianceCount: 0,
        comments: 'Standalone residential building.',
        definedRooms: [],
        provenance: 'verified'
    },
    {
        id: 'prop-ontario-265',
        code: '265 Ontario St',
        name: '265 Ontario Street',
        address: '265 Ontario St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_4339fa51f592921622d8.jpg',
        applianceCount: 0,
        comments: 'Residential property. Unit 2 verified.',
        definedRooms: ['Unit 2'],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },
    {
        id: 'prop-albert-415',
        code: '415 Albert St',
        name: '415 Albert Street',
        address: '415 Albert St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_cdde6e8442e952e7c538.jpg',
        applianceCount: 0,
        comments: 'Multi-unit residential property. Units 415B, 415E verified.',
        definedRooms: ['Unit 415B', 'Unit 415E'],
        floors: ['Main Floor', 'Second Floor'],
        provenance: 'verified'
    },
    {
        id: 'prop-armstrong-539',
        code: '539 Armstrong Rd',
        name: '539 Armstrong Road',
        address: '539 Armstrong Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_5a0393354bd60e0ac63f.jpg',
        applianceCount: 0,
        isStorageNode: true,
        comments: 'Stockpile location. White stoves rule everywhere: donor coils by SIZE only — never switches into gray Frigidaire stoves.',
        definedRooms: ['Stockpile Storage'],
        provenance: 'verified'
    },
    {
        id: 'prop-dev-847',
        code: '847 Development',
        name: '847 Development',
        address: 'Kingston, ON',
        imageUrl: '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
        applianceCount: 0,
        comments: 'Project entry, not an address.',
        definedRooms: [],
        provenance: 'verified'
    },

    // ----------------------------------------------------
    // 10) OPERATIONS & OFFICE — 1 Entry [Ungrouped]
    // ----------------------------------------------------
    {
        id: 'prop-office-mckay-698',
        code: '698 McKay St',
        name: '698 McKay Street (Office)',
        address: '698 McKay St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 0,
        comments: 'Location type "office", not a rental property; route origin.',
        definedRooms: ['Dispatch Office', 'Equipment Bay'],
        provenance: 'verified'
    }
];

// ==========================================
// 5. PATTERN-GENERATED UNIT ROSTERS
// ==========================================

export function generateUnitRoster(building: Building): Unit[] {
    const units: Unit[] = [];
    const bId = building.id;

    // BD Complex
    if (building.complexId === '1' || building.complexId === 'complex-bd') {
        if (bId === 'prop-bath-1727') {
            // 1727 Bath Rd: real building with no units yet
            return [];
        } else if (bId === 'prop-days-507' || bId === 'prop-bath-1737') {
            // Townhouses: 2-digit unit numbers, 3 stories, 2 washrooms, own water heater
            const count = bId === 'prop-days-507' ? 12 : 6;
            for (let i = 1; i <= count; i++) {
                const uNum = bId === 'prop-days-507' ? (i === 1 ? '32' : `${20 + i}`) : `${10 + i}`;
                const isVerified = (bId === 'prop-days-507' && uNum === '32');
                units.push({
                    id: `unit-${bId}-${uNum}`,
                    buildingId: bId,
                    unitNumber: uNum,
                    floor: 'Multi-Floor Townhouse',
                    unitType: 'townhouse',
                    defaultSetId: 'set-bd-townhouse',
                    stories: 3,
                    bathrooms: 2,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    comments: '3 stories (2 floors + basement), 2 washrooms, own water heater (believed // TODO-verify)',
                    provenance: isVerified ? 'verified' : 'pattern'
                });
            }
        } else if (bId === 'prop-bath-1725') {
            // 2-digit units
            for (let i = 1; i <= 8; i++) {
                const uNum = `${20 + i}`;
                units.push({
                    id: `unit-${bId}-${uNum}`,
                    buildingId: bId,
                    unitNumber: uNum,
                    floor: i <= 4 ? 'Main Floor' : 'Second Floor',
                    unitType: 'apartment',
                    defaultSetId: 'set-bd-apt',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        } else if (bId === 'prop-bath-1719') {
            // Unit 273 verified
            units.push({
                id: `unit-${bId}-273`,
                buildingId: bId,
                unitNumber: '273',
                floor: 'Basement',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                comments: 'Verified unit with basement mechanical access & refrigerator',
                provenance: 'verified'
            });
            for (let i = 1; i <= 6; i++) {
                units.push({
                    id: `unit-${bId}-10${i}`,
                    buildingId: bId,
                    unitNumber: `10${i}`,
                    floor: 'First Floor',
                    unitType: 'apartment',
                    defaultSetId: 'set-bd-apt',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        } else if (bId === 'prop-bath-1721') {
            units.push({
                id: `unit-${bId}-266`,
                buildingId: bId,
                unitNumber: '266',
                floor: 'Second Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                provenance: 'verified'
            });
            units.push({
                id: `unit-${bId}-268`,
                buildingId: bId,
                unitNumber: '268',
                floor: 'Second Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                provenance: 'verified'
            });
        } else if (bId === 'prop-bath-1723') {
            units.push({
                id: `unit-${bId}-266`,
                buildingId: bId,
                unitNumber: '266',
                floor: 'Second Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                comments: 'Verified unit with Frigidaire FFCD2418US3A dishwasher',
                provenance: 'verified'
            });
            units.push({
                id: `unit-${bId}-67`,
                buildingId: bId,
                unitNumber: '67',
                floor: 'Main Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                provenance: 'verified'
            });
        } else if (bId === 'prop-bath-1731') {
            units.push({
                id: `unit-${bId}-G63`,
                buildingId: bId,
                unitNumber: 'G63',
                floor: 'Ground Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                provenance: 'verified'
            });
            units.push({
                id: `unit-${bId}-161`,
                buildingId: bId,
                unitNumber: '161',
                floor: 'First Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                provenance: 'verified'
            });
        } else if (bId === 'prop-days-505') {
            units.push({
                id: `unit-${bId}-103`,
                buildingId: bId,
                unitNumber: '103',
                floor: 'First Floor',
                unitType: 'apartment',
                defaultSetId: 'set-bd-apt',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                comments: 'Verified unit with noisy freezer complaint (WO 19255)',
                provenance: 'verified'
            });
            for (let i = 1; i <= 6; i++) {
                if (i !== 3) {
                    units.push({
                        id: `unit-${bId}-10${i}`,
                        buildingId: bId,
                        unitNumber: `10${i}`,
                        floor: 'First Floor',
                        unitType: 'apartment',
                        defaultSetId: 'set-bd-apt',
                        bedrooms: 2,
                        bathrooms: 1,
                        renovated: { isRenovated: false, renovatedDate: null },
                        moveInDate: null,
                        tenancyDate: null,
                        provenance: 'pattern'
                    });
                }
            }
        } else {
            // Standard BD apartment default
            for (let i = 1; i <= 6; i++) {
                units.push({
                    id: `unit-${bId}-10${i}`,
                    buildingId: bId,
                    unitNumber: `10${i}`,
                    floor: 'First Floor',
                    unitType: 'apartment',
                    defaultSetId: 'set-bd-apt',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        }
    } else if (bId === 'prop-elm-18') {
        // 18 Elm St: base numbers only 101–414 across 4 floors (specifically including 411)
        const floors = ['First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];
        for (let fl = 1; fl <= 4; fl++) {
            for (let u = 1; u <= 14; u++) {
                const uNum = `${fl}${u < 10 ? '0' + u : u}`;
                units.push({
                    id: `unit-${bId}-${uNum}`,
                    buildingId: bId,
                    unitNumber: uNum,
                    floor: floors[fl - 1],
                    unitType: 'apartment',
                    defaultSetId: 'set-elm-apt',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    comments: uNum === '411' ? '18 Elm St unit 411 (base unit, ignores Yardi letter suffix)' : '18 Elm St residential unit',
                    provenance: 'pattern'
                });
            }
        }
    } else if (bId.startsWith('prop-amherst-')) {
        if (bId === 'prop-amherst-107') {
            // 107 Amherst storage node & default row pattern: floor-coded 101–112, 201–212, 301–312 (36 units)
            for (let floor = 1; floor <= 3; floor++) {
                for (let u = 1; u <= 12; u++) {
                    const uNum = `${floor}${u < 10 ? '0' : ''}${u}`;
                    units.push({
                        id: `unit-${bId}-${uNum}`,
                        buildingId: bId,
                        unitNumber: uNum,
                        floor: floor === 1 ? 'First Floor' : floor === 2 ? 'Second Floor' : 'Third Floor',
                        unitType: 'apartment',
                        bedrooms: 2,
                        bathrooms: 1,
                        renovated: { isRenovated: false, renovatedDate: null },
                        moveInDate: null,
                        tenancyDate: null,
                        provenance: 'pattern'
                    });
                }
            }
        } else if (bId === 'prop-amherst-125') {
            // Townhouse building
            for (let i = 1; i <= 8; i++) {
                units.push({
                    id: `unit-${bId}-${i}`,
                    buildingId: bId,
                    unitNumber: `${i}`,
                    floor: 'Townhouse',
                    unitType: 'townhouse',
                    stories: 3,
                    bathrooms: 2,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        } else if (bId === 'prop-amherst-137') {
            units.push({
                id: `unit-${bId}-137`,
                buildingId: bId,
                unitNumber: '137',
                floor: 'First Floor',
                unitType: 'apartment',
                bedrooms: 2,
                bathrooms: 1,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                comments: 'Verified unit with Frigidaire range & Rheem water heater (WO on hold)',
                provenance: 'verified'
            });
            for (let i = 1; i <= 11; i++) {
                const uNum = `10${i < 10 ? '0' + i : i}`;
                units.push({
                    id: `unit-${bId}-${uNum}`,
                    buildingId: bId,
                    unitNumber: uNum,
                    floor: 'First Floor',
                    unitType: 'apartment',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        } else {
            // Standard Amherst pattern (6 units representative per building)
            for (let i = 1; i <= 6; i++) {
                units.push({
                    id: `unit-${bId}-10${i}`,
                    buildingId: bId,
                    unitNumber: `10${i}`,
                    floor: 'First Floor',
                    unitType: 'apartment',
                    bedrooms: 2,
                    bathrooms: 1,
                    renovated: { isRenovated: false, renovatedDate: null },
                    moveInDate: null,
                    tenancyDate: null,
                    provenance: 'pattern'
                });
            }
        }
    } else if (bId === 'prop-manitou-cres') {
        // Manitou 1–58 townhouses
        for (let i = 1; i <= 58; i++) {
            units.push({
                id: `unit-${bId}-${i}`,
                buildingId: bId,
                unitNumber: `${i}`,
                floor: 'Townhouse',
                unitType: 'townhouse',
                stories: 3,
                bathrooms: 2,
                renovated: { isRenovated: false, renovatedDate: null },
                moveInDate: null,
                tenancyDate: null,
                comments: 'Manitou Crescent townhouse row (1–58 // TODO-verify)',
                provenance: 'pattern'
            });
        }
    } else if (bId === 'prop-albert-415') {
        units.push({
            id: `unit-${bId}-415B`,
            buildingId: bId,
            unitNumber: '415B',
            floor: 'Main Floor',
            unitType: 'apartment',
            bedrooms: 2,
            bathrooms: 1,
            renovated: { isRenovated: false, renovatedDate: null },
            moveInDate: null,
            tenancyDate: null,
            provenance: 'verified'
        });
        units.push({
            id: `unit-${bId}-415E`,
            buildingId: bId,
            unitNumber: '415E',
            floor: 'Second Floor',
            unitType: 'apartment',
            bedrooms: 2,
            bathrooms: 1,
            renovated: { isRenovated: false, renovatedDate: null },
            moveInDate: null,
            tenancyDate: null,
            provenance: 'verified'
        });
    } else if (bId === 'prop-ontario-265') {
        units.push({
            id: `unit-${bId}-2`,
            buildingId: bId,
            unitNumber: '2',
            floor: 'Main Floor',
            unitType: 'apartment',
            bedrooms: 1,
            bathrooms: 1,
            renovated: { isRenovated: false, renovatedDate: null },
            moveInDate: null,
            tenancyDate: null,
            provenance: 'verified'
        });
    }

    return units;
}

export const RESIDENTIAL_UNITS: Unit[] = RESIDENTIAL_PROPERTIES.flatMap(p => generateUnitRoster(p));

// ==========================================
// 6. APPLIANCES (Verified & Equipment)
// ==========================================

export const RESIDENTIAL_APPLIANCES: Appliance[] = [
    // 1. Dishwasher — Frigidaire FFCD2418US3A — 1723 Bath Rd, Unit 266, Kitchen.
    {
        id: 'app-bath-1723-dw',
        name: 'Dishwasher',
        brand: 'Frigidaire',
        modelNumber: 'FFCD2418US3A',
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-bath-1723',
        status: 'operational',
        lastService: '2026-10-15',
        type: 'Dishwasher',
        category: 'Kitchen',
        imageUrl: 'https://frigidaire.bynder.com/transform/e1966ae3-49aa-4b00-86e2-92f2e0ebf80e/FFCD2418US-HOV_824-psd?preset=three-bears',
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '266',
        room: 'Kitchen',
        location: '1723 Bath Rd · Unit 266 · Kitchen',
        notes: 'Askoll M376 pump (part A16944601) replaced 2026-10-15; load test pending.',
        provenance: 'verified',
        specs: {
            capacity: '14 Place Settings',
            volts: '120V',
            room: 'Kitchen',
            location: '1723 Bath Rd · Unit 266 · Kitchen'
        },
        maintenanceHistory: [
            {
                date: '2026-10-15',
                type: 'Repair',
                notes: 'Drain pump replaced (Askoll M376, part A16944601). Load test still pending.',
                technician: 'Technician'
            }
        ]
    },
    // 2. Electric range, gray — Frigidaire, model UNKNOWN — 137 Amherst Dr, Unit 137, Kitchen.
    {
        id: 'app-amherst-137-range',
        name: 'Electric Range',
        brand: 'Frigidaire',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-amherst-137',
        status: 'needs_service',
        lastService: '2026-09-30',
        type: 'Range',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '137',
        room: 'Kitchen',
        location: '137 Amherst Dr · Unit 137 · Kitchen',
        notes: 'Gray Frigidaire range. Switch WB24T10025; status: on hold.',
        flags: ['on_hold', 'switch_needed'],
        provenance: 'verified',
        specs: {
            room: 'Kitchen',
            location: '137 Amherst Dr · Unit 137 · Kitchen'
        },
        maintenanceHistory: [
            {
                date: '2026-09-30',
                type: 'Inspection',
                notes: 'Rear burner heats to half dial then stops (failing infinite switch WB24T10025, order by model); front burner receptacle worn. Work on hold.',
                technician: 'Technician'
            }
        ]
    },
    // 3. Water heater — Rheem, model UNKNOWN — 137 Amherst Dr, Unit 137.
    {
        id: 'app-amherst-137-wh',
        name: 'Water Heater',
        brand: 'Rheem',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-amherst-137',
        status: 'needs_service',
        lastService: '2026-10-08',
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '137',
        room: '', // TODO-verify
        location: '137 Amherst Dr · Unit 137',
        notes: 'No hot water since ~2026-10-08; on hold.',
        flags: ['on_hold', 'no_hot_water'],
        provenance: 'verified',
        specs: {
            location: '137 Amherst Dr · Unit 137'
        },
        maintenanceHistory: [
            {
                date: '2026-10-08',
                type: 'Inspection',
                notes: 'No hot water reported. Work on hold pending management.',
                technician: 'Technician'
            }
        ]
    },
    // 4. John Wood ProLine water heater — 1721 mech room (shared trio).
    {
        id: 'app-bath-1721-wh-proline',
        name: 'Water Heater (ProLine)',
        brand: 'John Wood',
        modelNumber: 'ProLine', // ProLine series
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-bath-1721',
        status: 'needs_service',
        lastService: '2026-10-19', // WO 20316
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'Issues: weeping at tee joint, ECO trips every few days, scaled lower element (WO 20316). Parts spec: 4500W/240V screw-in element + gasket, upper + lower thermostats.',
        flags: ['weeping_tee', 'eco_trips', 'scaled_element'],
        provenance: 'verified',
        specs: {
            volts: '240V',
            watts: '4500W',
            room: 'Mechanical Room',
            location: '1721 Bath Rd · Shared Mechanical Room'
        },
        maintenanceHistory: [
            {
                date: '2026-10-19',
                type: 'Inspection',
                notes: 'Weeping at tee joint; ECO trips every few days; scaled lower element. Planned: 4500W/240V element + gasket, upper/lower thermostats (WO 20316).',
                technician: 'Technician'
            }
        ]
    },
    // 5. Electric water heater — 1731/1733 shared mech room.
    {
        id: 'app-bath-1731-wh',
        name: 'Electric Water Heater',
        brand: '', // TODO-verify: brand UNKNOWN
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-bath-1731',
        status: 'operational',
        lastService: '2026-10-16',
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1731/1733 Shared Mechanical Room',
        notes: '1/2" copper supply (16–17mm OD); SharkBite 1/2" push-fit ball valve planned. Building drain stack has recurring blockages.',
        provenance: 'verified',
        specs: {
            room: 'Mechanical Room',
            location: '1731/1733 Shared Mechanical Room'
        },
        maintenanceHistory: [
            {
                date: '2026-10-16',
                type: 'Inspection',
                notes: 'Hot-water gate valve on 1/2" copper (16–17mm OD) to be replaced with SharkBite 1/2" push-fit ball valve.',
                technician: 'Technician'
            }
        ]
    },
    // 6. Refrigerator — Frigidaire FFHT1826LS9 — 1719 Bath Rd, Unit 273, Kitchen.
    {
        id: 'app-bath-1719-fridge',
        name: 'Refrigerator',
        brand: 'Frigidaire',
        modelNumber: 'FFHT1826LS9', // Verified from WOs 20061/20062
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-bath-1719',
        status: 'needs_service',
        lastService: '2026-10-19',
        type: 'Refrigerator',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN photo
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '273',
        room: 'Kitchen',
        location: '1719 Bath Rd · Unit 273 · Kitchen',
        notes: '1719 Bath unit 273 kitchen (WOs 20061/20062). Crisper drawer 240337103 BOUGHT 2026-10-19; door shelf 240338101 ORDERED, pickup pending.',
        flags: ['parts_ordered'],
        provenance: 'verified',
        specs: {
            room: 'Kitchen',
            location: '1719 Bath Rd · Unit 273 · Kitchen'
        },
        maintenanceHistory: [
            {
                date: '2026-10-19',
                type: 'Repair',
                notes: 'Crisper drawer 240337103 replaced (bought at Dependable). Door shelf 240338101 ordered, pickup pending.',
                technician: 'Technician'
            }
        ]
    },
    // 7. Freezer — brand/model UNKNOWN — 505 Days Rd, Unit 103.
    {
        id: 'app-days-505-freezer',
        name: 'Freezer',
        brand: '', // TODO-verify: brand UNKNOWN
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        propertyId: 'prop-days-505',
        status: 'needs_service',
        lastService: '2026-09-30',
        type: 'Freezer',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '103',
        room: '', // TODO-verify
        location: '505 Days Rd · Unit 103',
        notes: 'Recurring noise (WO 19255).',
        flags: ['noise_complaint'],
        provenance: 'verified',
        specs: {
            location: '505 Days Rd · Unit 103'
        },
        maintenanceHistory: [
            {
                date: '2026-09-30',
                type: 'Inspection',
                notes: 'Recurring freezer noise complaint (WO 19255). Tenant called first before visits.',
                technician: 'Technician'
            }
        ]
    },
    // 8. Donor fridges ×2 — 1731/1733 mech room (parts sources, not in service).
    {
        id: 'app-bath-1731-donor-fridge-1',
        name: 'Donor Refrigerator #1',
        brand: '', // TODO-verify
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1731',
        status: 'donor',
        lastService: '2026-10-20',
        type: 'Refrigerator',
        category: 'Parts Source',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1731/1733 Shared Mechanical Room',
        notes: 'Donor fridge #1 in shared mech room (parts source, not in service).',
        provenance: 'verified',
        maintenanceHistory: [
            {
                date: '2026-10-20',
                type: 'Note',
                notes: 'Held as parts sources, not in service.',
                technician: 'Technician'
            }
        ]
    },
    {
        id: 'app-bath-1731-donor-fridge-2',
        name: 'Donor Refrigerator #2',
        brand: '', // TODO-verify
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1731',
        status: 'donor',
        lastService: '2026-10-20',
        type: 'Refrigerator',
        category: 'Parts Source',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1731/1733 Shared Mechanical Room',
        notes: 'Donor fridge #2 in shared mech room (parts source, not in service).',
        provenance: 'verified',
        maintenanceHistory: [
            {
                date: '2026-10-20',
                type: 'Note',
                notes: 'Held as parts sources, not in service.',
                technician: 'Technician'
            }
        ]
    },
    // 1721 Shared Mechanical Room Bank (Other Water Heaters of the 7)
    {
        id: 'app-bath-1721-wh-jw',
        name: 'Water Heater (John Wood Working)',
        brand: 'John Wood',
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'operational',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'Working water heater in 1721 shared bank (working ×3 group).',
        provenance: 'verified',
        maintenanceHistory: []
    },
    {
        id: 'app-bath-1721-wh-aos',
        name: 'Water Heater (AO Smith Working)',
        brand: 'AO Smith',
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'operational',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'Working water heater in 1721 shared bank (working ×3 group).',
        provenance: 'verified',
        maintenanceHistory: []
    },
    {
        id: 'app-bath-1721-wh-valved-1',
        name: 'Water Heater (AO Smith 46-gal Valved-Off #1)',
        brand: 'AO Smith',
        modelNumber: '', // TODO-verify: 46-gal AO Smith
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'valved_off',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'AO Smith 46-gal, still holding stagnant water — flag: drain + management health note.',
        flags: ['stagnant_water', 'drain_required', 'health_note'],
        provenance: 'verified',
        maintenanceHistory: []
    },
    {
        id: 'app-bath-1721-wh-valved-2',
        name: 'Water Heater (AO Smith 46-gal Valved-Off #2)',
        brand: 'AO Smith',
        modelNumber: '', // TODO-verify: 46-gal AO Smith
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'valved_off',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'AO Smith 46-gal, still holding stagnant water — flag: drain + management health note.',
        flags: ['stagnant_water', 'drain_required', 'health_note'],
        provenance: 'verified',
        maintenanceHistory: []
    },
    {
        id: 'app-bath-1721-wh-disc-1',
        name: 'Disconnected Water Heater #1',
        brand: '', // TODO-verify
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'disconnected',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'Disconnected, rotting — flag: removal authorization pending.',
        flags: ['rotting', 'removal_auth_pending'],
        provenance: 'verified',
        maintenanceHistory: []
    },
    {
        id: 'app-bath-1721-wh-disc-2',
        name: 'Disconnected Water Heater #2',
        brand: '', // TODO-verify
        modelNumber: '', // TODO-verify
        serialNumber: '', // TODO-verify
        propertyId: 'prop-bath-1721',
        status: 'disconnected',
        lastService: '',
        type: 'Heater',
        category: 'Water Heating',
        unitNumber: 'Common',
        room: 'Mechanical Room',
        location: '1721 Bath Rd · Shared Mechanical Room',
        notes: 'Disconnected, rotting — flag: removal authorization pending.',
        flags: ['rotting', 'removal_auth_pending'],
        provenance: 'verified',
        maintenanceHistory: []
    }
];

// ==========================================
// 7. SENSOR GRID DEFAULT READING TEMPLATES
// ==========================================

export const DEFAULT_HVAC_SPECS = [
    { id: '1', label: 'Return Temp', value: '72', unit: '°F' },
    { id: '2', label: 'Supply Temp', value: '54', unit: '°F' },
    { id: '3', label: 'Static Pressure', value: '0.5', unit: 'in.wc' },
    { id: '4', label: 'Fan Speed', value: '1250', unit: 'RPM' },
];

export const DEFAULT_HEATER_SPECS = [
    { id: '1', label: 'Water Temp', value: '120', unit: '°F' },
    { id: '2', label: 'System Pressure', value: '60', unit: 'PSI' },
    { id: '3', label: 'Flow Rate', value: '4.5', unit: 'GPM' },
    { id: '4', label: 'Gas Valve', value: 'OPEN', unit: '' },
];

export const DEFAULT_GENERIC_SPECS = [
    { id: '1', label: 'Input Voltage', value: '120', unit: 'V' },
    { id: '2', label: 'Current Draw', value: '4.2', unit: 'A' },
    { id: '3', label: 'Power', value: '504', unit: 'W' },
];
