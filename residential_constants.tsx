import { Property, Appliance, ApplianceSpecs } from './types/domain';

// --- Helper Data Generators ---

const generateId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

const createMaintenanceRecord = (date: string, type: string, notes: string, technician: string) => ({
    date,
    type,
    notes,
    technician,
});

// --- Properties ---

const PROP_GAS_ID = 'prop-gas-001';
const PROP_ELEC_ID = 'prop-elec-002';
const PROP_PROPANE_ID = 'prop-propane-003';

export const RESIDENTIAL_PROPERTIES: Property[] = [
    {
        id: PROP_GAS_ID,
        name: 'The Modern Gas Home',
        address: '123 Maple Ave, Springfield, IL',
        imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        applianceCount: 5,
        is3DReady: true,
        sqFt: '2400',
        yearBuilt: '2019',
        lotSize: '0.25 acres',
        comments: 'Modern single-family home with high-efficiency natural gas appliances.',
        definedRooms: ['Mechanical Room', 'Kitchen', 'Laundry Room'],
        floors: ['Basement', 'First Floor', 'Second Floor'],
    },
    {
        id: PROP_ELEC_ID,
        name: 'The Eco Electric',
        address: '456 Oak Dr, Austin, TX',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        applianceCount: 5,
        is3DReady: true,
        sqFt: '1800',
        yearBuilt: '2022',
        lotSize: '0.15 acres',
        comments: 'Fully electrified eco-friendly home with heat pump technology and solar readiness.',
        definedRooms: ['Garage', 'Utility Closet', 'Open Concept Living'],
        floors: ['Slab', 'Main Level'],
    },
    {
        id: PROP_PROPANE_ID,
        name: 'Country Cottage',
        address: '789 Pine Ln, Vermont, VT',
        imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        applianceCount: 4,
        is3DReady: false,
        sqFt: '1500',
        yearBuilt: '1995',
        lotSize: '2.5 acres',
        comments: 'Rural cottage running on propane. Tank located 50ft from structure.',
        definedRooms: ['Basement', 'Mudroom'],
        floors: ['Basement', 'Main Floor'],
    }
];

// --- Appliances ---

export const RESIDENTIAL_APPLIANCES: Appliance[] = [
    // --- Gas Home Appliances ---
    {
        id: generateId('gas-app', 0),
        propertyId: PROP_GAS_ID,
        name: 'High-Efficiency Gas Furnace',
        brand: 'Tempstar/Carrier',
        type: 'HVAC',
        category: 'Heating',
        status: 'operational',
        lastService: '2024-10-15',
        serialNumber: 'A193048914',
        modelNumber: 'N95ESN0401712A',
        location: 'Mechanical Room',
        imageUrl: 'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?auto=format&fit=crop&w=800&q=80',
        manualUrl: 'https://www.shareddocs.com/hvac/docs/1009/Public/0C/N95ESN-05SI.pdf',
        warrantyUrl: 'https://www.carrier.com/residential/en/us/warranty/',
        notes: 'Unit is running efficiently. Filter size 16x25x1.',
        specs: {
            btuInput: '40,000 BTU/h',
            btuOutput: '39,000 BTU/h',
            fuelType: 'Natural Gas',
            volts: '115V',
            phase: '1',
            hertz: '60Hz',
            airTempRise: '40-70°F (22-39°C)',
            motorHp: '1/2 HP',
            watts: '373W',
            maxUnitAmp: '7.5A',
            breakerRating: '15A',
            installDate: '2019-08-20',
            location: 'Basement Mechanical',
            panelSlot: '5',
            // Dashboard Specs
            returnTemp: '72°F',
            supplyTemp: '120°F', // Heating mode
            staticPressure: '0.6 in.wc',
            fanSpeed: '1100 RPM',
            filterSize: '16x25x1',
            efficiency: '96% AFUE'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2024-10-15', 'Annual Service', 'Cleaned flame sensor, checked pressure switches. Inlet pressure 6.8 inwc.', 'Mike R.'),
            createMaintenanceRecord('2023-10-02', 'Annual Service', 'Replaced air filter, checked heat exchanger.', 'Mike R.'),
            createMaintenanceRecord('2022-09-15', 'Routine Maintenance', 'Blower motor capacitor check. Within spec.', 'Mike R.'),
            createMaintenanceRecord('2021-11-05', 'Repair', 'Replaced faulty igniter.', 'FastFix HVAC'),
            createMaintenanceRecord('2020-09-20', 'Annual Service', 'Routine cleaning and inspection.', 'Install Team A'),
            createMaintenanceRecord('2019-08-20', 'Installation', 'New install of N95ESN unit. Verified gas pressure and venting.', 'Install Team A'),
        ]
    },
    {
        id: generateId('gas-app', 1),
        propertyId: PROP_GAS_ID,
        name: 'Tankless Water Heater',
        brand: 'Rheem',
        type: 'WaterPro',
        category: 'Water Heating',
        status: 'operational',
        lastService: '2024-05-10',
        modelNumber: 'ECOH200DVLN-3',
        serialNumber: 'RHNG98234712',
        location: 'Mechanical Room',
        imageUrl: 'https://images.unsplash.com/photo-1542013936693-88463833f955?auto=format&fit=crop&w=800&q=80',
        manualUrl: 'https://s3.amazonaws.com/WebPartners/ProductDocuments/09E3C562-E93C-4316-8367-735A9031267D.pdf',
        notes: 'Descaling required annually due to hard water area.',
        specs: {
            btuInput: '80,000 BTU/h',
            fuelType: 'Natural Gas',
            volts: '120V',
            phase: '1',
            hertz: '60Hz',
            maxUnitAmp: '5A',
            installDate: '2019-08-21',
            location: 'Wall Mounted / Mech Room',
            panelSlot: '7',
            capacity: 'Endless (9.5 GPM @ 35°F Rise)',
            // Dashboard Specs
            waterTemp: '120°F',
            systemPressure: '60 PSI',
            flowRate: '0.0 GPM', // Idle
            gasValve: 'CLOSED',
            efficiency: '0.96 UEF'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2024-05-10', 'Flush', 'Descaled heat exchanger with vinegar solution.', 'Sarah L.'),
            createMaintenanceRecord('2023-04-15', 'Flush', 'Annual descaling. Screen cleaning.', 'Sarah L.'),
            createMaintenanceRecord('2022-04-12', 'Repair', 'Replaced flow sensor error code 11.', 'Sarah L.'),
            createMaintenanceRecord('2021-03-20', 'Flush', 'Routine maintenance.', 'Homeowner'),
            createMaintenanceRecord('2019-08-21', 'Installation', 'Unit installed and registered.', 'PlumbPerfect'),
        ]
    },
    {
        id: generateId('gas-app', 2),
        propertyId: PROP_GAS_ID,
        name: 'Gas Dryer',
        brand: 'Samsung',
        type: 'Laundry',
        category: 'Appliances',
        status: 'operational',
        lastService: '2023-01-10',
        modelNumber: 'DVG42H5000W',
        serialNumber: 'SGD23894723',
        location: 'Laundry Room',
        manualUrl: 'https://downloadcenter.samsung.com/content/UM/202102/20210216102142273/DV5000H_DC68-03381Q-06_EN_CFR_MES.pdf',
        notes: 'Vent line is long, check airflow regularly.',
        specs: {
            btuInput: '20,000 BTU/h',
            fuelType: 'Natural Gas',
            volts: '120V',
            phase: '1',
            hertz: '60Hz',
            maxUnitAmp: '15A',
            installDate: '2019-09-01',
            location: 'Laundry Room',
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-01-10', 'Vent Clean', 'Cleaned dryer vent ducting to outside.', 'DuctMasters Inc.'),
            createMaintenanceRecord('2021-06-15', 'Repair', 'Replaced belt tensioner.', 'Appliance Fix Inc.'),
        ]
    },
    {
        id: generateId('gas-app', 3),
        propertyId: PROP_GAS_ID,
        name: 'Gas Range',
        brand: 'Samsung',
        type: 'Kitchen',
        category: 'Appliances',
        status: 'operational',
        lastService: '2022-11-05',
        modelNumber: 'NX60T8711SS',
        serialNumber: 'SRG92384723',
        location: 'Kitchen',
        manualUrl: 'https://downloadcenter.samsung.com/content/UM/202101/20210114143435132/NX60T8711SS_AA_01_EN.pdf',
        notes: 'Convection fan makes slight noise on start-up. Normal operation.',
        specs: {
            btuInput: '58,000 BTU/h (Total)',
            fuelType: 'Natural Gas',
            volts: '120V',
            maxUnitAmp: '5A',
            phase: '1',
            installDate: '2020-03-12',
            location: 'Kitchen Island',
            panelSlot: '11',
            breakerRating: '15A'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2024-01-20', 'Inspection', 'Checked burner flame pattern. Adjusted air shutter.', 'GasSafe Pros'),
        ]
    },
    {
        id: generateId('gas-app', 4),
        propertyId: PROP_GAS_ID,
        name: 'Dishwasher',
        brand: 'Bosch',
        type: 'Kitchen',
        category: 'Appliances',
        status: 'operational',
        lastService: '2023-05-20',
        modelNumber: 'SHPM65Z55N',
        serialNumber: 'BDW82736482',
        location: 'Kitchen',
        manualUrl: 'https://media3.bosch-home.com/Documents/9001450479_A.pdf',
        notes: 'Filter cleaned monthly by owner.',
        specs: {
            volts: '120V',
            maxUnitAmp: '12A',
            watts: '1440W',
            phase: '1',
            installDate: '2020-03-12',
            location: 'Kitchen',
            panelSlot: '9',
            breakerRating: '20A',
            capacity: '16 Place Settings'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-05-20', 'Filter Check', 'Checked drain pump and filter.', 'Appliance Fix Inc.'),
            createMaintenanceRecord('2021-12-10', 'Repair', 'Cleared drain blockage.', 'Homeowner'),
        ]
    },

    // --- Electric Home Appliances ---
    {
        id: generateId('elec-app', 0),
        propertyId: PROP_ELEC_ID,
        name: 'Infinity Heat Pump System',
        brand: 'Carrier',
        type: 'HVAC',
        category: 'Heating/Cooling',
        status: 'operational',
        lastService: '2024-06-01',
        modelNumber: '25VNA436A003',
        serialNumber: 'EHC834723984',
        location: 'Side Yard / Garage',
        manualUrl: 'https://www.shareddocs.com/hvac/docs/1009/Public/01/25VNA4-01SI.pdf',
        notes: 'Communicating thermostat required. Do not bypass.',
        specs: {
            btuOutput: '36,000 BTU/h (Heating)',
            kw: '10 kW (Aux Heat)',
            fuelType: 'Electric',
            volts: '208/230V',
            phase: '1',
            hertz: '60Hz',
            maxUnitAmp: '30A (Outdoor)',
            breakerRating: '40A',
            installDate: '2021-03-15',
            location: 'Outdoor Pad',
            panelSlot: '24,26',
            capacity: '3 Ton',
            // Dashboard Specs
            returnTemp: '71°F',
            supplyTemp: '52°F', // Cooling mode
            staticPressure: '0.5 in.wc',
            fanSpeed: '1250 RPM',
            refrigerantType: 'R410A',
            efficiency: '18 SEER'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2024-06-01', 'Cooling Check', 'Checked refrigerant levels, cleaned condenser coils.', 'EcoHvac LLC'),
            createMaintenanceRecord('2023-05-15', 'Annual Service', 'Washed outdoor coil. Checked contactor.', 'EcoHvac LLC'),
            createMaintenanceRecord('2022-05-20', 'Annual Service', 'Routine system check. All OK.', 'EcoHvac LLC'),
            createMaintenanceRecord('2021-03-15', 'Installation', 'System startup and commissioning.', 'EcoHvac LLC'),
        ]
    },
    {
        id: generateId('elec-app', 1),
        propertyId: PROP_ELEC_ID,
        name: 'ProTerra Hybrid Water Heater',
        brand: 'Rheem',
        type: 'WaterPro',
        category: 'Water Heating',
        status: 'operational',
        lastService: '2025-01-05',
        modelNumber: 'XE50T10H45U0',
        serialNumber: 'RHP89237489',
        location: 'Garage',
        manualUrl: 'https://s3.amazonaws.com/WebPartners/ProductDocuments/67305910-6C78-4D6B-8822-7D7E64B44917.pdf',
        notes: 'Keep air filter clean for heat pump efficiency.',
        specs: {
            volts: '208/240V',
            fuelType: 'Electric',
            watts: '4500W',
            maxUnitAmp: '25A',
            breakerRating: '30A',
            phase: '1',
            installDate: '2022-03-16',
            location: 'Garage',
            panelSlot: '18,20',
            capacity: '50 Gallons (189L)',
            // Dashboard Specs
            waterTemp: '125°F',
            systemPressure: '55 PSI',
            flowRate: '0.0 GPM',
            efficiency: '3.50 UEF'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2025-01-05', 'Filter Clean', 'Cleaned air intake filter on heat pump unit.', 'Homeowner'),
            createMaintenanceRecord('2024-01-10', 'Filter Clean', 'Cleaned air intake filter.', 'Homeowner'),
            createMaintenanceRecord('2023-02-15', 'Inspection', 'Checked anode rod. Status: Good.', 'PlumbPerfect'),
        ]
    },
    {
        id: generateId('elec-app', 2),
        propertyId: PROP_ELEC_ID,
        name: 'Electric Dryer',
        brand: 'Samsung',
        type: 'Laundry',
        category: 'Laundry',
        status: 'needs_service',
        lastService: '2023-11-20',
        modelNumber: 'DV42H5000EW',
        serialNumber: 'SME82734628',
        location: 'Utility Closet',
        manualUrl: 'https://downloadcenter.samsung.com/content/UM/202102/20210216102142273/DV5000H_DC68-03381Q-06_EN_CFR_MES.pdf',
        alert: 'Long dry times reported',
        notes: 'Customer reported damp clothes. Suspect blocked vent or element issue.',
        specs: {
            volts: '240V',
            fuelType: 'Electric',
            watts: '5400W',
            maxUnitAmp: '24A',
            breakerRating: '30A',
            phase: '1',
            installDate: '2022-04-01',
            location: 'Utility Closet',
            panelSlot: '14,16',
            capacity: '7.5 cu. ft.'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-11-20', 'Diagnosis', 'Technician suspected clogged vent. Use caution.', 'Appliance Fix Inc.'),
            createMaintenanceRecord('2022-10-05', 'Vent Clean', 'Routine vent cleaning.', 'DuctMasters Inc.'),
        ]
    },
    {
        id: generateId('elec-app', 3),
        propertyId: PROP_ELEC_ID,
        name: 'Smart Front Load Washer',
        brand: 'LG',
        type: 'Laundry',
        category: 'Laundry',
        status: 'connected',
        lastService: '2024-01-15',
        modelNumber: 'WM4000HWA',
        serialNumber: 'LGW99283472',
        location: 'Utility Closet',
        manualUrl: 'https://gscs-b2c.lge.com/downloadFile?fileId=KROWM0000000000000000000000000000&fileName=KROWM0000000000000000000000000000.pdf',
        notes: 'Wi-Fi setup on "HomeNet".',
        specs: {
            volts: '120V',
            fuelType: 'Electric',
            maxUnitAmp: '10A',
            phase: '1',
            watts: '1200W',
            installDate: '2022-04-01',
            location: 'Utility Closet',
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-08-10', 'Cleaning', 'Ran tub clean cycle with bleach.', 'Homeowner'),
        ]
    },
    {
        id: generateId('elec-app', 4),
        propertyId: PROP_ELEC_ID,
        name: 'Induction Range',
        brand: 'Samsung',
        type: 'Kitchen',
        category: 'Appliances',
        status: 'operational',
        lastService: '2023-08-15',
        modelNumber: 'NE63T8911SS',
        serialNumber: 'SIR92837423',
        location: 'Kitchen',
        manualUrl: 'https://downloadcenter.samsung.com/content/UM/202108/20210813134320281/NE63T8911SS_AA_03_EN.pdf',
        notes: 'Requires magnetic cookware. Glass top pristine.',
        specs: {
            volts: '240V',
            maxUnitAmp: '40A',
            kw: '11.6kW',
            phase: '1',
            installDate: '2022-04-05',
            location: 'Kitchen',
            panelSlot: '8,10',
            breakerRating: '40A',
            capacity: '6.3 cu. ft.'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-01-15', 'Update', 'Firmware updated via SmartThings app.', 'Homeowner'),
        ]
    },

    // --- Propane Home Appliances ---
    {
        id: generateId('propane-app', 0),
        propertyId: PROP_PROPANE_ID,
        name: 'Propane Converted Furnace',
        brand: 'Carrier',
        type: 'HVAC',
        category: 'Heating',
        status: 'operational',
        lastService: '2023-12-10',
        modelNumber: '59SC2D060S14--12',
        serialNumber: 'CP723489234',
        location: 'Basement',
        manualUrl: 'https://www.shareddocs.com/hvac/docs/1009/Public/0A/59SC2D-02SI.pdf',
        notes: 'Converted to Propane using kit #KPN7348. Inlet Pressure 11.0 inwc. Do not adjust manifold pressure without kit chart.',
        specs: {
            btuInput: '60,000 BTU/h',
            btuOutput: '57,000 BTU/h',
            fuelType: 'Liquid Propane',
            volts: '115V',
            maxUnitAmp: '8.2A',
            breakerRating: '15A',
            phase: '1',
            installDate: '2018-11-10',
            location: 'Basement',
            panelSlot: '3',
            // Dashboard Specs
            returnTemp: '70°F',
            supplyTemp: '125°F',
            staticPressure: '0.7 in.wc',
            fanSpeed: '1150 RPM',
            efficiency: '95% AFUE'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2023-12-10', 'Fuel Check', 'Verified LP pressure at manifold 10 inwc. Checked tank level.', 'Rural Gas Co.'),
            createMaintenanceRecord('2022-11-05', 'Annual Service', 'Cleaned flame sensor. Checked nozzle.', 'Rural Gas Co.'),
            createMaintenanceRecord('2021-10-20', 'Annual Service', 'Routine maintenance.', 'Rural Gas Co.'),
            createMaintenanceRecord('2018-11-10', 'Conversion', 'Converted unit to Propane.', 'Rural Gas Co.'),
        ]
    },
    {
        id: generateId('propane-app', 1),
        propertyId: PROP_PROPANE_ID,
        name: 'Propane Dryer',
        brand: 'Samsung',
        type: 'Laundry',
        category: 'Laundry',
        status: 'idle',
        lastService: '2020-05-15',
        modelNumber: 'DVG42H5000W',
        serialNumber: 'SLP82347289',
        location: 'Mudroom',
        manualUrl: 'https://downloadcenter.samsung.com/content/UM/202102/20210216102142273/DV5000H_DC68-03381Q-06_EN_CFR_MES.pdf',
        notes: 'LP Conversion Kit installed.',
        specs: {
            btuInput: '20,000 BTU/h',
            fuelType: 'Liquid Propane',
            volts: '120V',
            maxUnitAmp: '15A',
            installDate: '2018-11-15',
            location: 'Mudroom',
            panelSlot: '7',
            breakerRating: '15A'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2020-05-15', 'Repair', 'Replaced igniter coil.', 'Appliance Fix Inc.'),
            createMaintenanceRecord('2018-11-15', 'Conversion', 'Converted to LP.', 'Install Team'),
        ]
    },
    {
        id: generateId('propane-app', 2),
        propertyId: PROP_PROPANE_ID,
        name: 'Propane Range',
        brand: 'GE',
        type: 'Kitchen',
        category: 'Appliances',
        status: 'operational',
        lastService: '2021-02-10',
        modelNumber: 'JGS760SELSS',
        serialNumber: 'LPR8273642',
        location: 'Kitchen',
        manualUrl: 'https://products.geappliances.com/MarketingObjectRetrieval/Dispatcher?RequestType=PDF&Name=49-2000236-1.pdf',
        notes: 'Converted to LP. Orifice kit stored in back of unit.',
        specs: {
            btuInput: '56,000 BTU/h',
            fuelType: 'Liquid Propane',
            volts: '120V',
            maxUnitAmp: '15A',
            installDate: '2018-11-20',
            location: 'Kitchen',
            panelSlot: '11',
            breakerRating: '15A'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2021-02-10', 'Calibration', 'Adjusted flame color.', 'GasSafe Pros'),
        ]
    },
    {
        id: generateId('propane-app', 3),
        propertyId: PROP_PROPANE_ID,
        name: 'Standby Generator',
        brand: 'Generac',
        type: 'Power',
        category: 'Generators',
        status: 'operational',
        lastService: '2024-09-01',
        modelNumber: '70432',
        serialNumber: 'GEN92837423',
        location: 'Side Yard',
        manualUrl: 'https://www.generac.com/service-support/product-support-lookup/product-manuals?modelNo=70432',
        notes: 'Automatic transfer switch installed. Weekly self-test set for Mondays at 10am.',
        specs: {
            kw: '22kW',
            fuelType: 'Liquid Propane',
            volts: '240V',
            maxUnitAmp: '91.7A',
            phase: '1',
            hertz: '60Hz',
            installDate: '2019-05-15',
            location: 'Outdoor Pad',
            panelSlot: 'Transfer Switch',
            capacity: '22 kW'
        },
        maintenanceHistory: [
            createMaintenanceRecord('2024-09-01', 'Annual Maintenance', 'Oil change, spark plugs replaced, valve clearance checked.', 'PowerGen Pros'),
            createMaintenanceRecord('2024-03-15', 'Inspection', 'Spring battery check and test run.', 'PowerGen Pros'),
            createMaintenanceRecord('2023-09-01', 'Annual Maintenance', 'Routine service completed. Oil change.', 'PowerGen Pros'),
            createMaintenanceRecord('2023-03-10', 'Inspection', 'Spring checkup.', 'PowerGen Pros'),
            createMaintenanceRecord('2022-09-05', 'Annual Maintenance', 'Oil change and filter.', 'PowerGen Pros'),

        ]
    }
];

// --- Dashboard Constants ---

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
