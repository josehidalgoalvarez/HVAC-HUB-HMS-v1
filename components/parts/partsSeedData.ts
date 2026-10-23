import type { PartRecord, Stockpile, SupplierRecord } from '../../types/domain';

export const SEED_SUPPLIERS: SupplierRecord[] = [
  {
    id: 1,
    name: 'Dependable Appliances',
    contact_name: 'Parts Desk',
    phone: '613-542-8822',
    hours: 'Mon–Fri 8:30–5',
    address: 'Kingston, ON',
    account_number: 'DEP-HVAC-9941',
  },
  {
    id: 2,
    name: 'Home Depot (Gardiners Rd, Kingston)',
    contact_name: 'Pro Desk',
    phone: '613-389-8800',
    hours: 'Mon–Sat 6am–9pm, Sun 8am–7pm',
    address: '605 Gardiners Rd, Kingston, ON K7M 3Y4',
    account_number: '',
  }
];

export const SEED_STOCKPILES: Stockpile[] = [
  {
    id: 1,
    name: '511 Days Rd Storage',
    location: '511 Days Rd',
    buildingId: 'prop-days-511',
    building_id: 15,
    notes: 'Central storage building and main distribution hub',
  },
  {
    id: 2,
    name: '107 Amherst Storage',
    location: '107 Amherst Dr',
    buildingId: 'prop-amherst-107',
    building_id: 58,
    notes: 'Amherst cluster storage depot',
  },
  {
    id: 3,
    name: '539 Armstrong Stockpile',
    location: '539 Armstrong Rd',
    buildingId: 'prop-armstrong-539',
    building_id: 87,
    notes: 'Riverstone storage location',
  },
  {
    id: 4,
    name: '394 Alfred Storage',
    location: '394 Alfred St',
    buildingId: 'prop-alfred-394',
    building_id: 75,
    notes: 'Alfred cluster storage building',
  },
  {
    id: 5,
    name: '810 Blackburn Mews Storage',
    location: '810 Blackburn Mews',
    buildingId: 'prop-blackburn-810',
    building_id: 82,
    notes: 'Stonecrest storage stockpile',
  },
  {
    id: 6,
    name: '85 Park St Storage',
    location: '85 Park St',
    buildingId: 'prop-park-85',
    building_id: 83,
    notes: 'Park St storage location',
  },
  {
    id: 7,
    name: '181 Hillendale Ave Storage',
    location: '181 Hillendale Ave',
    buildingId: 'prop-hillendale-181',
    building_id: 97,
    notes: 'Hillendale storage depot',
  },
  {
    id: 8,
    name: '18 Elm St Storage',
    location: '18 Elm St',
    buildingId: 'prop-elm-18',
    building_id: 78,
    notes: 'Elm cluster storage stockpile',
  },
  {
    id: 9,
    name: '265 Ontario St Upstairs Storage',
    location: '265 Ontario St (Upstairs)',
    buildingId: 'prop-ontario-265',
    building_id: 12,
    notes: '265 Ontario St upstairs storage room',
  },
  {
    id: 10,
    name: '265 Ontario St Basement Storage',
    location: '265 Ontario St (Basement)',
    buildingId: 'prop-ontario-265',
    building_id: 12,
    notes: '265 Ontario St basement storage room',
  },
  {
    id: 11,
    name: '698 McKay St Warehouse',
    location: '698 McKay St',
    buildingId: 'prop-mckay-698',
    building_id: 89,
    notes: '698 McKay St main warehouse storage',
  },
  {
    id: 12,
    name: '698 McKay Sea Containers',
    location: '698 McKay St (Yard)',
    buildingId: 'prop-mckay-698',
    building_id: 89,
    notes: '698 McKay exterior sea container storage units',
  }
];

export const SEED_PARTS: PartRecord[] = [
  {
    id: 1,
    name: 'Robertshaw Infinite Switch',
    part_number: 'WB24T10025',
    category: 'Electric Range',
    description: 'Surface burner infinite rotary control switch 240V',
    quantity_on_hand: 2,
    quantityOnHand: 2,
    min_quantity: 2,
    minQuantity: 2,
    reorder_point: 2,
    reorderPoint: 2,
    unit_cost: 42.50,
    unitCost: 42.50,
    compatible_models: ['GE JBP24', 'Hotpoint RB525', 'Kenmore 911', 'GE Spectra'],
    price_history: [
      { date: '2026-01-15', price: 39.50, supplier: 'Dependable Appliances' },
      { date: '2026-02-10', price: 42.50, supplier: 'Dependable Appliances' }
    ],
    is_reorder: true,
    stockpiles: [
      {
        id: 1,
        part_id: 1,
        stockpile_id: 1,
        stockpile_name: '511 Days Rd Storage',
        stockpile_location: '511 Days Rd',
        quantity: 2,
        status: 'available',
        location_notes: 'Central Storage Shelf A'
      },
      {
        id: 2,
        part_id: 1,
        stockpile_id: 1,
        stockpile_name: '511 Days Rd Storage',
        stockpile_location: '137 Amherst',
        quantity: 2,
        status: 'on_hold',
        location_notes: '137 Amherst on hold'
      },
      {
        id: 3,
        part_id: 1,
        stockpile_id: 2,
        stockpile_name: '1719 Bath Donors',
        stockpile_location: '1719 Bath Rd',
        quantity: 2,
        status: 'in_use',
        location_notes: '1719 unit 174'
      }
    ],
    stock_summary: '2 at 511 Days Rd, 2 on hold (137 Amherst), 2 in use (1719 unit 174)',
    preferred_supplier: {
      id: 1,
      name: 'Dependable Appliances',
      phone: '613-542-8822',
      hours: 'Mon–Fri 8:30–5'
    }
  },
  {
    id: 2,
    name: 'Askoll Drain Pump M376',
    part_number: 'M376',
    category: 'Laundry',
    description: 'Universal magnetic drain pump motor for front-load washers',
    quantity_on_hand: 1,
    quantityOnHand: 1,
    min_quantity: 1,
    minQuantity: 1,
    reorder_point: 1,
    reorderPoint: 1,
    unit_cost: 34.00,
    unitCost: 34.00,
    compatible_models: ['Whirlpool WFW', 'Maytag MHW', 'Bosch 300 Series'],
    price_history: [
      { date: '2026-01-08', price: 34.00, supplier: 'Dependable Appliances' }
    ],
    is_reorder: true,
    stockpiles: [
      {
        id: 4,
        part_id: 2,
        stockpile_id: 1,
        stockpile_name: '511 Days Rd Storage',
        stockpile_location: '511 Days Rd',
        quantity: 1,
        status: 'available',
        location_notes: 'Spare inventory'
      },
      {
        id: 5,
        part_id: 2,
        stockpile_id: 2,
        stockpile_name: '1719 Bath Donors',
        stockpile_location: '1719 Bath Rd',
        quantity: 1,
        status: 'in_use',
        location_notes: 'installed'
      }
    ],
    stock_summary: '1 spare at 511 Days Rd, 1 installed (1719 Bath)',
    preferred_supplier: {
      id: 1,
      name: 'Dependable Appliances',
      phone: '613-542-8822',
      hours: 'Mon–Fri 8:30–5'
    }
  }
];
