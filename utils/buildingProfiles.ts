import { normalizeMatchString } from './stockpileMatching';

export interface WaterHeaterProfile {
  type: string;
  model?: string | null;
  count?: number | null;
  notes?: string | null;
}

export interface PumpProfile {
  type: string;
  notes?: string | null;
}

export interface SolarPanelsProfile {
  installed: boolean | null;
  notes?: string | null;
}

export interface BuildingProfile {
  totalUnitsOverride?: number | null;
  floors?: number | null;
  elevator?: boolean | null;
  heatingType?: string | null;
  heatingFuel?: string | null;
  heatingDescription?: string | null;
  mechanicalRoomLocation?: string | null;
  waterHeaters?: WaterHeaterProfile[] | null;
  pumps?: PumpProfile[] | null;
  solarPanels?: SolarPanelsProfile | null;
  storageNote?: string | null;
  notes?: string | null;
}

export const BUILDING_PROFILES: Record<string, BuildingProfile> = {
  // 18 Elm St: All facts from Jose's Oct 28, 2026 mechanical-room file + Oct 30 summary
  '18 elm st': {
    totalUnitsOverride: null, // Let UI compute 17 tracked units
    floors: 4,
    elevator: false,
    heatingType: 'Central heating',
    heatingFuel: 'Natural gas',
    heatingDescription: 'Central hydronic heating — boiler + indirect DHW plant, NOT a plain water heater.',
    mechanicalRoomLocation: 'Downstairs boiler room (mechanical room)',
    waterHeaters: [
      {
        type: 'NTI FTVM Residential Condensing Gas Boiler',
        model: 'FTVM199',
        notes: 'Serial 2108292238203640; factory set for natural gas; input max 199 MBH (58.5 kW), heating capacity 184 MBH (53.9 kW), net AHRI 160 MBH (46.9 kW); electrical 120V / 1ph / 60Hz / 12A; minimum inlet/manifold pressures and clearances were not cleanly legible — re-read plate before quoting.'
      },
      {
        type: 'Weil-McLain Aqua Plus indirect tank',
        model: 'Aqua Plus 45',
        count: 2,
        notes: '45 gal (170 L) each, max boiler supply 200°F, max working pressure 150 PSIG; the two tanks are piped together at the top; one has an anode cap + Boiler Supply / Tank In label.'
      }
    ],
    pumps: [
      {
        type: 'Grundfos circulator',
        notes: 'Red circulators, one per zone/unit, on a manifold wall with green-handle ball valves above and below each pump, insulated pipe runs; pump bodies hand-labelled with unit numbers — do not quote a pump-to-unit assignment from photos alone.'
      }
    ],
    solarPanels: null, // NOT recorded for 18 Elm -> UI renders "Not recorded"
    storageNote: 'Small storage at 18 Elm (stockpile record exists; contents not yet photographed — menu shows an honest empty state until photographed).',
    notes: 'Zone controls: 3x Taco SR506-EXP 6-zone switching relays (Boxes 1–3, per the taped THERMOSTAT LEGEND sheet); 1x Taco SR501 1-zone relay (purpose unconfirmed); Johnson Controls A419 temperature controller (purpose unconfirmed). Thermostat legend maps units to Box+Zone, e.g. 411 = Box #1 Zone #6, 414 = Box #3 Zone #1.\n\nTotal units (tracked): 17 — 101P + 111–114, 211–214, 311–314, 411–414; B/C variants in Yardi are splits of the same physical units, NOT separate units. 18 Elm is in the Elm complex with 24 Elm (203 Colborne sits behind it by proximity).'
  },

  // 1721 Bath Rd — mechanical + storage building, BD complex
  '1721 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Hot water: SHARED plant in the 1721 mech room, shared with 1719 + 1723 Bath (attached trio, shared electrical + water heating). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: '1721 Bath mech room (mechanical room, also a storage area — Jose, Oct 27, 2026: "1721 is both").',
    waterHeaters: [
      {
        type: 'Water heater bank — 7 heaters total',
        notes: '5 plumbed, only 3 running (2 John Wood + 1 AO Smith) — electrical capacity cannot feed 5, gas conversion never approved; 1 weeping John Wood ProLine (WO 20316: weeping tee joint, ECO trips, scaled lower element); 2 disconnected/rotting, including two valved-off 46-gal AO Smiths holding stagnant water (drain + management health flag pending, OPEN field job); the 7th heater state was never specified — stays TBD (3 + 1 + 2 = 6 accounted). Room also holds all fiber connections + electrical shutoffs for the trio.'
      }
    ],
    pumps: null,
    solarPanels: null,
    storageNote: 'Mech room is BOTH equipment and storage (Jose, Oct 27). Stockpile record id 15 exists; CONTENTS unknown (Jose says it stores parts, no item list) — menu shows an honest empty state until photographed. Do not seed contents.',
    notes: 'Tracked units: 12 (BD Bath pool). Attached trio with 1719 + 1723 Bath, shared electrical + water heating. Laundry: 1721 has NO sink (1719 YES, 1723 YES). 1721 yellow/amber storage box in Properties must navigate like 511\'s — that navigation was built in 8065826; this profile does not change it.'
  },

  // 1731 Bath Rd — shared mech room building, BD complex
  '1731 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Hot water: SHARED mech room with 1733 Bath (attached pair, shared electrical). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: '1731/1733 shared mech room (one room for both buildings).',
    waterHeaters: [
      {
        type: 'Electric water heater — shared mech room',
        notes: '1 electric water heater in the shared room (model/specs NOT recorded — do not invent them). SharkBite valve planned for the laundry hot-water job (1/2" copper).'
      }
    ],
    pumps: null,
    solarPanels: null,
    storageNote: 'Shared mech room also holds 2 donor fridges (parts sources, not in service — already recorded as stored-appliance rows at stockpile 13, NOT as unit appliances). Do not duplicate them here as a list; link to the existing storage menu.',
    notes: 'Tracked units: 9 (BD Bath pool; Yardi mislabels 163/261/262 as "1723" — do not re-label them here). Attached pair with 1733 Bath, shared electrical. Laundry: 1731 basement WITH sink (1733 without). Recurring drain-stack blockage in this building (WO 19555 and related plumbing tickets).'
  },

  // 1733 Bath Rd — shared mech room building, BD complex
  '1733 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Hot water: SHARED mech room with 1731 Bath (attached pair, shared electrical). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: '1731/1733 shared mech room (one room for both buildings).',
    waterHeaters: [
      {
        type: 'Electric water heater — shared mech room',
        notes: '1 electric water heater in the shared room (model/specs NOT recorded). Shared with 1731 Bath — this is the same single heater, not a second heater.'
      }
    ],
    pumps: null,
    solarPanels: null,
    storageNote: 'Shared mech room also holds 2 donor fridges (parts sources, not in service — already recorded as stored-appliance rows at stockpile 13). Do not duplicate them here as a list.',
    notes: 'Tracked units: 12 (BD Bath pool; same Yardi label conflict as 1731 on 158/260 — do not re-label here). Attached pair with 1731 Bath, shared electrical. Laundry: 1733 basement WITHOUT sink (1731 with).'
  },

  // 511 Days Rd — BD central storage building, Days complex
  '511 days rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: null,
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: 'CENTRAL storage for the BD complex: 511 basement (stockpile record exists, 10 allocations live: Parts stash, USG ceiling tiles, Lumber, Stove, Step ladder Featherlite, Tools unspecified, Vapor/pressure washer, Snow shovel, Cleaning supplies/chemicals, Karcher wet/dry vac — the Parts menu is the master list, do not duplicate the full list here; link to it). 511 refresh still pending: stove plates + parts-stash detail need a photo pass.',
    notes: 'Tracked units: 9 (BD Days pool). Attached pair with 509 Days, shared mech room (holder building unspecified). Laundry: 511 WITH sink (509 believed no sink, UNVERIFIED — do not state 509\'s sink as fact here). 511 is BD\'s storage building; its yellow/amber storage box navigates to the storage menu (built in 8065826).'
  },

  // 107 Amherst Dr — Amherst storage node
  '107 amherst dr': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: null,
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: 'Storage node for the Amherst row (stockpile record exists, 7 TBD placeholders live from Sep 29, 2026 photos: cleaning chemicals, paint/drywall supplies, electrical/plumbing parts, pre-made window screens + screen tools, fire extinguisher, first-aid kit — plus tools recorded as equipment: miter saw, shop vac, air-mover fan, miter box. Two white coil stoves recorded as stored appliances. Disassembled bath-exhaust-fan housing is UNCONFIRMED repair-in-progress — do NOT list it as stock. Parts menu is the master list; link to it, do not duplicate it.',
    notes: 'Tracked units: 35 (same roster as 103 Amherst — 103 was confirmed Oct 22, 2026 as a real TWIN of 107 that Jose had forgotten; do not merge 103 and 107). 107 doubles as the Amherst storage node.'
  }
};

/**
 * Resolve a building profile by searching with normalized name or address.
 */
export function getBuildingProfile(nameOrAddress?: string | null): BuildingProfile | null {
  if (!nameOrAddress) return null;
  const normalized = normalizeMatchString(nameOrAddress);
  
  if (BUILDING_PROFILES[normalized]) {
    return BUILDING_PROFILES[normalized];
  }
  
  for (const [key, profile] of Object.entries(BUILDING_PROFILES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return profile;
    }
  }
  
  return null;
}
