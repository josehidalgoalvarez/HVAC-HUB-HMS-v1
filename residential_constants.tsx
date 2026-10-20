import { Property, Appliance } from './types/domain';

// --- Verified Kingston Portfolio Data ---
// Verified from Jose's Patry work orders. 1727 and 1735 Bath Rd removed (no work orders).
// The only verified postal code is 1723 Bath Rd (K7M 4Y9). All other postal codes are UNKNOWN.
// Zero fabricated serial numbers, install dates, or postal codes.

export const RESIDENTIAL_PROPERTIES: Property[] = [
    {
        id: 'prop-bath-1719',
        code: 'bd1719',
        name: '1719 Bath Road',
        address: '1719 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 1,
        comments: 'Multi-unit residential complex. Stockpile: donor appliances on site at 1719 Bath.',
        definedRooms: ['Basement', 'Mechanical Room', 'Unit 273'],
        floors: ['Basement', 'Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1721',
        code: 'bd1721',
        name: '1721 Bath Road',
        address: '1721 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 0,
        comments: 'Multi-unit residential complex.',
        definedRooms: ['Unit 268', 'Unit 266'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1723',
        code: 'bd1723',
        name: '1723 Bath Road',
        address: '1723 Bath Rd, Kingston, ON K7M 4Y9', // Verified postal code
        imageUrl: '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
        applianceCount: 1,
        comments: 'Multi-unit residential complex.',
        definedRooms: ['Unit 266', 'Unit 67', 'Kitchen'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1725',
        code: 'bd1725',
        name: '1725 Bath Road',
        address: '1725 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_3fba10b6250dd34fcc10.jpg',
        applianceCount: 0,
        comments: 'Multi-unit residential complex.',
        definedRooms: [], // TODO-verify: specific units/rooms unknown
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1731',
        code: 'bd1731',
        name: '1731 Bath Road',
        address: '1731 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
        applianceCount: 1,
        comments: 'Multi-unit complex. Note: building drain stack has recurring blockages.',
        definedRooms: ['Unit G63', 'Unit 161', 'Laundry Room'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1733',
        code: 'bd1733',
        name: '1733 Bath Road',
        address: '1733 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_5a0393354bd60e0ac63f.jpg',
        applianceCount: 0,
        comments: 'Multi-unit residential complex.',
        definedRooms: [], // TODO-verify: specific units/rooms unknown
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-bath-1737',
        code: 'bd1737',
        name: '1737 Bath Road',
        address: '1737 Bath Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_8db7e895c76fcfce8de5.jpg',
        applianceCount: 0,
        comments: 'End-of-block multi-family property.',
        definedRooms: [], // TODO-verify: specific units/rooms unknown
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-days-505',
        code: 'bd0505',
        name: '505 Days Road',
        address: '505 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_c61a96df0f03a7620bf1.jpg',
        applianceCount: 1,
        comments: 'Days Road residential complex. Stockpiles nearby: 511 Days Rd storage (holds spare Askoll pump), 509 Days Rd storage rooms.',
        definedRooms: ['Unit 103'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-days-507',
        code: 'bd0507',
        name: '507 Days Road',
        address: '507 Days Rd, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
        applianceCount: 0,
        comments: 'Residential apartments. Stockpiles nearby: 509 & 511 Days Rd storage rooms.',
        definedRooms: ['Unit 32'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-amherst-137',
        code: '137 Amherst Dr',
        name: '137 Amherst Drive',
        address: '137 Amherst Dr, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_7b90897a4994f447765e.jpg',
        applianceCount: 2,
        comments: 'Residential units. Stockpiles nearby: 107 Amherst and 539 Armstrong.',
        definedRooms: ['Unit 137', 'Kitchen'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-albert-415',
        code: '415 Albert St',
        name: '415 Albert Street',
        address: '415 Albert St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_cdde6e8442e952e7c538.jpg',
        applianceCount: 0,
        comments: 'Multi-unit residential property.',
        definedRooms: ['Unit 415B', 'Unit 415E'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    },
    {
        id: 'prop-ontario-265',
        code: '265 Ontario St',
        name: '265 Ontario Street',
        address: '265 Ontario St, Kingston, ON', // TODO-verify postal code (UNKNOWN)
        imageUrl: '/uploads/photo_4339fa51f592921622d8.jpg',
        applianceCount: 0,
        comments: 'Residential property.',
        definedRooms: ['Unit 2'],
        floors: ['Main Floor', 'Second Floor'] // TODO-verify
    }
];

export const RESIDENTIAL_APPLIANCES: Appliance[] = [
    {
        id: 'app-bath-1723-dw',
        name: 'Dishwasher',
        brand: 'Frigidaire',
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
        modelNumber: 'FFCD2418US3A',
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: 'Drain pump Askoll M376 (part A16944601) replaced 2026-10-15; status operational, load test pending.',
        specs: {
            capacity: '14 Place Settings',
            volts: '120V',
            room: 'Kitchen',
            location: '1723 Bath Rd · Unit 266 · Kitchen'
        }
    },
    {
        id: 'app-amherst-137-range',
        name: 'Electric Range',
        brand: 'Frigidaire',
        propertyId: 'prop-amherst-137',
        status: 'needs_service',
        lastService: '', // TODO-verify: service history unknown
        type: 'Range',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '137',
        room: 'Kitchen',
        location: '137 Amherst Dr · Unit 137 · Kitchen',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: 'Gray electric range. Burner infinite switch WB24T10025 (order by model #). Status: needs repair (on hold).',
        specs: {
            room: 'Kitchen',
            location: '137 Amherst Dr · Unit 137 · Kitchen'
        }
    },
    {
        id: 'app-amherst-137-wh',
        name: 'Water Heater',
        brand: 'Rheem',
        propertyId: 'prop-amherst-137',
        status: 'needs_service',
        lastService: '', // TODO-verify: service history unknown
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '137',
        room: '', // TODO-verify: room unknown
        location: '137 Amherst Dr · Unit 137',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: 'No hot water since ~2026-10-08. Status: needs repair (on hold).',
        specs: {
            location: '137 Amherst Dr · Unit 137'
        }
    },
    {
        id: 'app-bath-1731-wh',
        name: 'Water Heater (Laundry)',
        brand: '', // TODO-verify: brand UNKNOWN
        propertyId: 'prop-bath-1731',
        status: 'operational',
        lastService: '', // TODO-verify: service history unknown
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: 'Common',
        room: 'Laundry Room',
        location: '1731 Bath Rd · Laundry Room',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: '1/2" copper supply (16–17mm OD); SharkBite 1/2" push-fit ball valve planned. Building drain stack has recurring blockages.',
        specs: {
            room: 'Laundry Room',
            location: '1731 Bath Rd · Laundry Room'
        }
    },
    {
        id: 'app-bath-1719-fridge',
        name: 'Refrigerator',
        brand: '', // TODO-verify: brand UNKNOWN (rating-plate photo pending)
        propertyId: 'prop-bath-1719',
        status: 'needs_service',
        lastService: '', // TODO-verify: service history unknown
        type: 'Refrigerator',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '273',
        room: 'Kitchen',
        location: '1719 Bath Rd · Unit 273 · Kitchen',
        modelNumber: '', // TODO-verify: model UNKNOWN (rating-plate photo pending)
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: 'Needs crisper drawer + door shelf, ordered via Dependable Appliances once the model is known. Rating-plate photo pending.',
        specs: {
            room: 'Kitchen',
            location: '1719 Bath Rd · Unit 273 · Kitchen'
        }
    },
    {
        id: 'app-days-505-freezer',
        name: 'Freezer',
        brand: '', // TODO-verify: brand UNKNOWN
        propertyId: 'prop-days-505',
        status: 'needs_service',
        lastService: '', // TODO-verify: service history unknown
        type: 'Freezer',
        category: 'Kitchen',
        imageUrl: '', // Leave empty for UNKNOWN-model
        ratingPlateUrl: '', // TODO-verify: field photo pending
        unitNumber: '103',
        room: '', // TODO-verify: room unknown
        location: '505 Days Rd · Unit 103',
        modelNumber: '', // TODO-verify: model UNKNOWN
        serialNumber: '', // TODO-verify: serial UNKNOWN
        notes: 'Recurring noise complaint (WO 19255).',
        specs: {
            location: '505 Days Rd · Unit 103'
        }
    }
];

// --- Sensor Grid Default Reading Templates ---

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
