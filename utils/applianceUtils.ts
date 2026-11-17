import { ApplianceSpecs } from '../types';

export const SPEC_LABELS: Partial<Record<keyof ApplianceSpecs, string>> = {
    btuInput: 'Input Rating',
    btuOutput: 'Output Rating',
    kw: 'Power (kW)',
    fuelType: 'Fuel Source',
    volts: 'Voltage',
    watts: 'Wattage',
    amps: 'Amps',
    elements: 'Elements',
    maxLoad: 'Max Load',
    power208: 'Power @ 208V',
    phase: 'Phase',
    hertz: 'Frequency',
    airTempRise: 'Temp. Rise',
    capacity: 'Capacity',
    pressure: 'Pressure',
    color: 'Color',
    installDate: 'Install Date',
    location: 'Location',
    breakerRating: 'Breaker Rating',
    panelSlot: 'Panel Slot',
    manufactured: 'Manufactured',
    standard: 'Standard',
    refrigerantType: 'Refrigerant',
    refrigerant: 'Refrigerant'
};

const UNIT_SUFFIXES: Partial<Record<keyof ApplianceSpecs, string>> = {
    btuInput: ' BTU/h',
    btuOutput: ' BTU/h',
    kw: ' kW',
    volts: 'V',
    watts: 'W',
    hertz: 'Hz',
    airTempRise: '°F',
    breakerRating: 'A',
};

export const getTechSpecs = (specs?: ApplianceSpecs) => {
    // Define the order and selection of specs to display in the list
    const displayKeys: (keyof ApplianceSpecs)[] = [
        'btuInput',
        'btuOutput',
        'kw',
        'fuelType',
        'volts',
        'watts',
        'amps',
        'elements',
        'maxLoad',
        'power208',
        'phase',
        'hertz',
        'airTempRise',
        'breakerRating',
        'panelSlot',
        'capacity',
        'pressure',
        'color',
        'location',
        'installDate',
        'manufactured',
        'standard',
        'refrigerantType',
        'refrigerant'
    ];

    return displayKeys.map(key => {
        let value = specs?.[key];

        // Append unit if value exists and doesn't already have the unit (simple check)
        const suffix = UNIT_SUFFIXES[key];
        if (value && value !== '-' && value !== 'TBD' && suffix && !value.toString().endsWith(suffix.trim())) {
            value = `${value}${suffix}`;
        }

        return {
            label: SPEC_LABELS[key],
            value: value || '-'
        };
    });
};