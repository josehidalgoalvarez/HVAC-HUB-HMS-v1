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
  }
];

export const SEED_STOCKPILES: Stockpile[] = [
  {
    id: 1,
    name: '511 Days Rd Storage',
    location: '511 Days Rd',
    notes: 'Central parts depot and spare inventory',
  },
  {
    id: 2,
    name: '1719 Bath Donors',
    location: '1719 Bath Rd',
    notes: 'Decommissioned unit donors and reclaimed switches',
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
