import { ApplianceSpecs } from '../types';

export const SPEC_LABELS: Record<keyof ApplianceSpecs, string> = {
    btuInput: 'Input Rating',
    btuOutput: 'Output Rating',
    kw: 'Power (kW)',
    fuelType: 'Fuel Source',
    volts: 'Voltage',
    watts: 'Wattage',
    phase: 'Phase',
    hertz: 'Frequency',
    airTempRise: 'Temp. Rise',
    capacity: 'Capacity',
    installDate: 'Install Date',
    location: 'Location',
    breakerRating: 'Breaker Rating',
    panelSlot: 'Panel Slot'
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
        'phase',
        'hertz',
        'airTempRise',
        'breakerRating',
        'panelSlot',
        'capacity',
        'location',
        'installDate'
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