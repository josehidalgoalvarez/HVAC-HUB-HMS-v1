import { ApplianceDefaultItem, ApplianceSpecs } from '../types';

export interface TradeApplianceTypeOption {
  type: string;
  label: string;
  category: string;
  icon: string;
  defaultFuelType?: string;
  defaultVolts?: string;
  description: string;
  relevantFields: (keyof ApplianceSpecs | 'manualUrl')[];
}

export const TRADE_APPLIANCE_TYPES: TradeApplianceTypeOption[] = [
  {
    type: 'Refrigerator',
    label: 'Fridge',
    category: 'Kitchen',
    icon: 'kitchen',
    defaultFuelType: 'Electric',
    defaultVolts: '120',
    description: 'Food refrigeration and freezer storage',
    relevantFields: ['capacity', 'volts', 'efficiency', 'manualUrl', 'notes']
  },
  {
    type: 'Range',
    label: 'Range / Stove',
    category: 'Kitchen',
    icon: 'cooking',
    defaultFuelType: 'Electric',
    defaultVolts: '240',
    description: 'Electric coil, smooth top, or gas range & oven',
    relevantFields: ['fuelType', 'volts', 'capacity', 'manualUrl', 'notes']
  },
  {
    type: 'Dishwasher',
    label: 'Dishwasher',
    category: 'Kitchen',
    icon: 'dishwasher_gen',
    defaultFuelType: 'Electric',
    defaultVolts: '120',
    description: 'Under-counter automatic dishwasher',
    relevantFields: ['volts', 'capacity', 'fuelType', 'manualUrl', 'notes']
  },
  {
    type: 'Range Hood',
    label: 'Range Hood',
    category: 'Ventilation',
    icon: 'mode_fan',
    defaultFuelType: 'Electric',
    defaultVolts: '120',
    description: 'Kitchen exhaust / recirculating ventilation hood',
    relevantFields: ['capacity', 'volts', 'manualUrl', 'notes']
  },
  {
    type: 'Gas Furnace',
    label: 'Gas Furnace',
    category: 'Heating',
    icon: 'heat',
    defaultFuelType: 'Natural Gas',
    defaultVolts: '120',
    description: 'Central forced-air gas furnace heating',
    relevantFields: ['fuelType', 'btuInput', 'btuOutput', 'filterSize', 'volts', 'efficiency', 'manualUrl', 'notes']
  },
  {
    type: 'Air Conditioner',
    label: 'AC (Condenser / Air Handler)',
    category: 'Cooling',
    icon: 'ac_unit',
    defaultFuelType: 'Electric',
    defaultVolts: '240',
    description: 'Central AC split-system condenser or heat pump',
    relevantFields: ['capacity', 'volts', 'filterSize', 'refrigerantType', 'efficiency', 'manualUrl', 'notes']
  },
  {
    type: 'Water Heater',
    label: 'Water Heater',
    category: 'Water Heating',
    icon: 'water_heater',
    defaultFuelType: 'Electric',
    defaultVolts: '240',
    description: 'Dedicated in-suite electric or gas hot water tank',
    relevantFields: ['fuelType', 'capacity', 'volts', 'btuInput', 'efficiency', 'manualUrl', 'notes']
  },
  {
    type: 'Washer',
    label: 'Clothes Washer',
    category: 'Laundry',
    icon: 'local_laundry_service',
    defaultFuelType: 'Electric',
    defaultVolts: '120',
    description: 'In-suite automatic clothes washing machine',
    relevantFields: ['capacity', 'volts', 'manualUrl', 'notes']
  },
  {
    type: 'Dryer',
    label: 'Clothes Dryer',
    category: 'Laundry',
    icon: 'dry',
    defaultFuelType: 'Electric',
    defaultVolts: '240',
    description: 'In-suite clothes dryer (240V electric or gas)',
    relevantFields: ['fuelType', 'volts', 'capacity', 'manualUrl', 'notes']
  },
  {
    type: 'Thermostat',
    label: 'Thermostat',
    category: 'Controls',
    icon: 'thermostat',
    defaultFuelType: 'Electric',
    defaultVolts: '24',
    description: 'Low-voltage 24V digital / smart climate controller',
    relevantFields: ['volts', 'manualUrl', 'notes']
  }
];

export interface VisibleSpecItem {
  key: string;
  label: string;
  value: string;
  isUrl?: boolean;
}

/**
 * Checks if a value is considered blank, placeholder or empty.
 */
export const isBlankSpec = (val?: string | null): boolean => {
  if (val === undefined || val === null) return true;
  const trimmed = String(val).trim();
  return trimmed === '' || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined';
};

/**
 * Normalizes an appliance type string into one of the 10 core trade families.
 */
export const getApplianceTradeFamily = (type?: string, name?: string): string => {
  const t = `${type || ''} ${name || ''}`.toLowerCase();
  if (t.includes('water heater') || t.includes('water_heater') || t.includes('tank') || t.includes('hwt')) {
    return 'water_heater';
  }
  if (t.includes('fridge') || t.includes('refrigerat') || t.includes('freezer')) {
    return 'fridge';
  }
  if (t.includes('furnace') || t.includes('heating') || t.includes('boiler') || (t.includes('heat') && !t.includes('water') && !t.includes('pump'))) {
    return 'furnace';
  }
  if (t.includes('air conditioner') || t.includes('ac') || t.includes('cool') || t.includes('condenser') || t.includes('handler') || t.includes('heat pump')) {
    return 'ac';
  }
  if (t.includes('range') || t.includes('stove') || t.includes('cooktop') || t.includes('oven')) {
    return 'range';
  }
  if (t.includes('dishwasher')) {
    return 'dishwasher';
  }
  if (t.includes('hood') || t.includes('ventilat') || t.includes('exhaust')) {
    return 'hood';
  }
  if (t.includes('washer') && !t.includes('dishwasher')) {
    return 'washer';
  }
  if (t.includes('dryer')) {
    return 'dryer';
  }
  if (t.includes('thermostat') || t.includes('control')) {
    return 'thermostat';
  }
  return 'generic';
};

/**
 * Determines whether a spec field is relevant to a specific appliance type.
 */
export const isSpecFieldRelevant = (
  type: string,
  field: keyof ApplianceSpecs | 'manualUrl',
  fuelType?: string
): boolean => {
  const family = getApplianceTradeFamily(type);

  switch (family) {
    case 'fridge':
      // Fridge shows capacity, volts, model, manualUrl, notes.
      // NEVER filterSize, BTU, or fuelType.
      return ['capacity', 'volts', 'efficiency', 'manualUrl', 'notes'].includes(field);

    case 'furnace':
      // Furnace shows fuelType, btuInput, btuOutput, filterSize, volts, efficiency, manualUrl, notes.
      return ['fuelType', 'btuInput', 'btuOutput', 'filterSize', 'volts', 'efficiency', 'manualUrl', 'notes'].includes(field);

    case 'ac':
      // AC shows capacity, volts, filterSize where applicable, refrigerantType, efficiency, manualUrl, notes.
      return ['capacity', 'volts', 'filterSize', 'refrigerantType', 'efficiency', 'manualUrl', 'notes'].includes(field);

    case 'water_heater': {
      // Water heater shows fuelType, capacity, volts (electric) / BTU (gas), efficiency, manualUrl, notes.
      const isGas = (fuelType || '').toLowerCase().includes('gas');
      if (isGas) {
        return ['fuelType', 'capacity', 'btuInput', 'volts', 'efficiency', 'manualUrl', 'notes'].includes(field);
      }
      return ['fuelType', 'capacity', 'volts', 'btuInput', 'efficiency', 'manualUrl', 'notes'].includes(field);
    }

    case 'range':
      return ['fuelType', 'volts', 'capacity', 'manualUrl', 'notes'].includes(field);

    case 'dishwasher':
      return ['volts', 'capacity', 'fuelType', 'manualUrl', 'notes'].includes(field);

    case 'hood':
      return ['capacity', 'volts', 'manualUrl', 'notes'].includes(field);

    case 'washer':
      return ['capacity', 'volts', 'manualUrl', 'notes'].includes(field);

    case 'dryer':
      return ['fuelType', 'volts', 'capacity', 'manualUrl', 'notes'].includes(field);

    case 'thermostat':
      return ['volts', 'manualUrl', 'notes'].includes(field);

    default:
      // Generic fallback: exclude fields that are completely empty
      return true;
  }
};

/**
 * In VIEW mode, returns only spec fields that are:
 * (a) Relevant to the appliance type AND
 * (b) Populated (non-empty, not blank, not '—').
 * Blank or irrelevant fields render nothing — no empty rows, no '—' placeholders.
 */
export const getVisibleSpecFields = (appItem: ApplianceDefaultItem): VisibleSpecItem[] => {
  const specs = appItem.specs || {};
  const type = appItem.type || appItem.name || '';
  const fuelType = specs.fuelType;
  const items: VisibleSpecItem[] = [];

  // Manual URL (if populated)
  const manualUrl = appItem.manualUrl || specs.manualUrl;
  if (!isBlankSpec(manualUrl)) {
    items.push({
      key: 'manualUrl',
      label: 'Manual',
      value: manualUrl!.trim(),
      isUrl: true
    });
  }

  // Fuel Type
  if (isSpecFieldRelevant(type, 'fuelType', fuelType) && !isBlankSpec(specs.fuelType)) {
    items.push({
      key: 'fuelType',
      label: 'Fuel Type',
      value: specs.fuelType!.trim()
    });
  }

  // Voltage
  if (isSpecFieldRelevant(type, 'volts', fuelType) && !isBlankSpec(specs.volts)) {
    const v = specs.volts!.trim();
    items.push({
      key: 'volts',
      label: 'Voltage',
      value: v.endsWith('V') ? v : `${v}V`
    });
  }

  // Capacity / Tonnage / CFM / Settings
  if (isSpecFieldRelevant(type, 'capacity', fuelType) && !isBlankSpec(specs.capacity)) {
    const family = getApplianceTradeFamily(type);
    let label = 'Capacity';
    if (family === 'hood') label = 'Airflow (CFM)';
    else if (family === 'dishwasher') label = 'Place Settings';
    else if (family === 'ac') label = 'Capacity / Tonnage';
    else if (family === 'water_heater') label = 'Tank Capacity';
    else if (family === 'washer' || family === 'dryer') label = 'Drum Capacity';
    else if (family === 'range') label = 'Oven Capacity';

    items.push({
      key: 'capacity',
      label,
      value: specs.capacity!.trim()
    });
  }

  // BTU Input / Power / Heating Element
  if (isSpecFieldRelevant(type, 'btuInput', fuelType) && !isBlankSpec(specs.btuInput)) {
    const family = getApplianceTradeFamily(type);
    const isGas = (fuelType || '').toLowerCase().includes('gas');
    let label = 'BTU Input';
    if (family === 'water_heater') {
      label = isGas ? 'BTU Input' : 'Heating Element';
    } else if (family === 'furnace') {
      label = 'BTU Input';
    }

    items.push({
      key: 'btuInput',
      label,
      value: specs.btuInput!.trim()
    });
  }

  // BTU Output
  if (isSpecFieldRelevant(type, 'btuOutput', fuelType) && !isBlankSpec(specs.btuOutput)) {
    items.push({
      key: 'btuOutput',
      label: 'BTU Output',
      value: specs.btuOutput!.trim()
    });
  }

  // Filter Size
  if (isSpecFieldRelevant(type, 'filterSize', fuelType) && !isBlankSpec(specs.filterSize)) {
    items.push({
      key: 'filterSize',
      label: 'Filter Size',
      value: specs.filterSize!.trim()
    });
  }

  // Refrigerant Type
  if (isSpecFieldRelevant(type, 'refrigerantType', fuelType) && !isBlankSpec(specs.refrigerantType)) {
    items.push({
      key: 'refrigerantType',
      label: 'Refrigerant',
      value: specs.refrigerantType!.trim()
    });
  }

  // Efficiency
  if (isSpecFieldRelevant(type, 'efficiency', fuelType) && !isBlankSpec(specs.efficiency)) {
    items.push({
      key: 'efficiency',
      label: 'Efficiency',
      value: specs.efficiency!.trim()
    });
  }

  // Specification Notes
  const notesVal = appItem.notes || specs.notes;
  if (!isBlankSpec(notesVal) && notesVal !== 'Specification pending (TODO)') {
    items.push({
      key: 'notes',
      label: 'Notes',
      value: notesVal!.trim()
    });
  }

  return items;
};

/**
 * Returns which input fields must be displayed in the EDIT form for an appliance type.
 * In EDIT mode, shows the FULL input set for the appliance's type (populated or not, so user can fill them in).
 */
export const getEditFormFieldsForType = (type: string, fuelType?: string) => {
  const family = getApplianceTradeFamily(type);
  return {
    showFuelType: isSpecFieldRelevant(type, 'fuelType', fuelType),
    showVolts: isSpecFieldRelevant(type, 'volts', fuelType),
    showCapacity: isSpecFieldRelevant(type, 'capacity', fuelType),
    showBtuInput: isSpecFieldRelevant(type, 'btuInput', fuelType),
    showBtuOutput: isSpecFieldRelevant(type, 'btuOutput', fuelType),
    showFilterSize: isSpecFieldRelevant(type, 'filterSize', fuelType),
    showRefrigerantType: isSpecFieldRelevant(type, 'refrigerantType', fuelType),
    showEfficiency: isSpecFieldRelevant(type, 'efficiency', fuelType),
    capacityLabel: family === 'hood' ? 'Airflow Capacity (CFM)' :
                   family === 'dishwasher' ? 'Capacity (Place Settings)' :
                   family === 'ac' ? 'Capacity / Tonnage (e.g. 2.5 Ton / 30k BTU)' :
                   family === 'water_heater' ? 'Tank Capacity (e.g. 60 Gallons)' :
                   family === 'washer' || family === 'dryer' ? 'Drum Capacity (e.g. 4.5 cu. ft.)' :
                   family === 'range' ? 'Oven Capacity (e.g. 5.3 cu. ft.)' :
                   family === 'fridge' ? 'Capacity (e.g. 18 cu. ft.)' : 'Capacity',
    btuInputLabel: family === 'water_heater' && !(fuelType || '').toLowerCase().includes('gas')
                   ? 'Heating Element / Wattage (e.g. 4500W)'
                   : 'BTU Input Rating (e.g. 60,000 BTU)'
  };
};
