import { Property, Appliance } from './types/domain';

// --- Real Portfolio Prototypes (Typed Test Fixtures) ---
// Retiring fictional demo data ("The Modern Gas Home", Springfield IL).
// Real portfolio prototypes: Bath Rd (1719–1737) and Days Rd (505/507), Kingston, ON.

export const RESIDENTIAL_PROPERTIES: Property[] = [
    {
        id: 'prop-bath-1719',
        name: '1719 Bath Road',
        address: '1719 Bath Rd, Kingston, ON K7M 4Y1',
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        applianceCount: 4,
        sqFt: '14200',
        yearBuilt: '1984',
        lotSize: '0.85 acres',
        comments: 'Multi-unit residential complex with basement mechanical systems and central hydronic heating.',
        definedRooms: ['Basement', 'Mechanical Room', 'Unit 273', 'Main Floor', 'Second Floor'],
        floors: ['Basement', 'First Floor', 'Second Floor']
    },
    {
        id: 'prop-bath-1723',
        name: '1723 Bath Road',
        address: '1723 Bath Rd, Kingston, ON K7M 4Y1',
        imageUrl: '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
        applianceCount: 2,
        sqFt: '11800',
        yearBuilt: '1986',
        lotSize: '0.75 acres',
        comments: 'Residential complex with rooftop make-up air unit and dedicated split systems.',
        definedRooms: ['Mechanical Room', 'Roof', 'First Floor', 'Second Floor'],
        floors: ['Main Floor', 'Second Floor', 'Roof']
    },
    {
        id: 'prop-bath-1727',
        name: '1727 Bath Road',
        address: '1727 Bath Rd, Kingston, ON K7M 4Y1',
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        applianceCount: 2,
        sqFt: '10500',
        yearBuilt: '1985',
        lotSize: '0.65 acres',
        comments: 'Multi-unit property with natural gas furnaces and dedicated outdoor condensers.',
        definedRooms: ['Basement', 'Utility Room', 'Main Floor'],
        floors: ['Basement', 'Main Floor']
    },
    {
        id: 'prop-days-505',
        name: '505 Days Road',
        address: '505 Days Rd, Kingston, ON K7M 5R6',
        imageUrl: '/uploads/photo_c61a96df0f03a7620bf1.jpg',
        applianceCount: 3,
        sqFt: '16000',
        yearBuilt: '1992',
        lotSize: '1.10 acres',
        comments: 'Days Road residential complex with PTAC heat pumps and central hot water heating.',
        definedRooms: ['Mechanical Room', 'Living Room', 'Exterior', 'Common'],
        floors: ['Main Floor', 'Second Floor']
    }
];

export const RESIDENTIAL_APPLIANCES: Appliance[] = [
    {
        id: 'app-bath-1719-wh',
        name: 'Tankless Water Heater',
        brand: 'Rinnai',
        propertyId: 'prop-bath-1719',
        status: 'operational',
        lastService: '2026-01-15',
        type: 'Heater',
        category: 'Water Heating',
        imageUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        ratingPlateUrl: '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
        unitNumber: '273',
        room: 'Basement',
        location: '1719 Bath Rd · Unit 273 · Basement',
        modelNumber: 'RU199iN',
        serialNumber: '21B.004128',
        specs: {
            fuelType: 'Gas',
            btuInput: '199,000',
            capacity: '11 GPM',
            volts: '120V',
            installDate: '2021-04-10',
            room: 'Basement',
            location: '1719 Bath Rd · Unit 273 · Basement'
        }
    },
    {
        id: 'app-bath-1719-furnace',
        name: 'High-Efficiency Gas Furnace',
        brand: 'Carrier',
        propertyId: 'prop-bath-1719',
        status: 'operational',
        lastService: '2025-11-20',
        type: 'Furnace',
        category: 'Heating',
        imageUrl: '/uploads/photo_86e84cf408480a53552b.jpg',
        ratingPlateUrl: '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
        unitNumber: '273',
        room: 'Basement',
        location: '1719 Bath Rd · Unit 273 · Basement',
        modelNumber: '59TP6B080V1716',
        serialNumber: '3422A19823',
        specs: {
            fuelType: 'Gas',
            btuInput: '80,000',
            btuOutput: '78,000',
            volts: '120V',
            filterSize: '16x25x1',
            installDate: '2022-09-15',
            room: 'Basement',
            location: '1719 Bath Rd · Unit 273 · Basement'
        }
    },
    {
        id: 'app-days-505-ptac',
        name: 'Packaged Terminal AC & Heat Pump',
        brand: 'Amana',
        propertyId: 'prop-days-505',
        status: 'operational',
        lastService: '2025-09-18',
        type: 'AC',
        category: 'Heating & Cooling',
        imageUrl: '/uploads/photo_cdde6e8442e952e7c538.jpg',
        ratingPlateUrl: '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
        unitNumber: '1',
        room: 'Living Room',
        location: '505 Days Rd · Unit 1 · Living Room',
        modelNumber: 'PTC153G35AXXX',
        serialNumber: 'AM-89211',
        specs: {
            volts: '240V',
            capacity: '15,000 BTU',
            breakerRating: '20A',
            installDate: '2023-05-12',
            room: 'Living Room',
            location: '505 Days Rd · Unit 1 · Living Room'
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
