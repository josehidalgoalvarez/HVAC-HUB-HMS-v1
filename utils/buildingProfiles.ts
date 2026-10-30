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
  },

  // 1719 Bath Rd — BD attached trio, basement storage building
  '1719 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Hot water: SHARED plant in the 1721 mech room, shared with 1721 + 1723 Bath (attached trio, shared electrical + water heating). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: 'Basement storage (contents UNCERTAIN — never seed exact counts): 3–4 white coil-top stoves + 2–3 white top-freezer fridges + 1 Danby portable AC, counts as reported by Jose, not counted. Pending job (Jose opens the ticket): strip usable parts from the very old basement stoves, then dispose. Do not list these as counted stock; the Parts menu is the master list.',
    notes: 'Tracked units: 9 (BD Bath pool). Attached trio with 1721 + 1723 Bath, shared electrical + water heating. Laundry: 1719 basement WITH sink (1721 NO, 1723 YES).'
  },

  // 1723 Bath Rd — BD attached trio
  '1723 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Hot water: SHARED plant in the 1721 mech room, shared with 1719 + 1721 Bath (attached trio, shared electrical + water heating). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: null,
    notes: 'Tracked units: 10 (BD Bath pool). Attached trio with 1719 + 1721 Bath, shared electrical + water heating. Laundry: 1723 basement WITH sink (1719 YES, 1721 NO). Unit-level appliance facts (e.g. unit 266) belong on the unit, NOT in this building profile.'
  },

  // 1725 Bath Rd — BD apartments, inner hallways
  '1725 bath rd': {
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
    storageNote: null,
    notes: 'Tracked units: 12 (BD Bath pool, apartments 45–56). Inner hallways. Laundry holds the Bell cable setup + 1 water heater (BELIEVED, not confirmed — do not state it as fact). NO electrical room located — OPEN field item. Do not guess where the electrical room is.'
  },

  // 505 Days Rd — BD Days apartments
  '505 days rd': {
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
    storageNote: null,
    notes: 'Tracked units: 12 (BD Days pool). Laundry: UNVERIFIED (do not state sink yes/no). 505 Days Pool is a SEPARATE record, PERMANENTLY OUT OF ORDER — inactive record, not a building unit source; do not merge it into this building. Unit-level facts (e.g. unit 103 freezer) belong on the unit, NOT here.'
  },

  // 507 Days Rd — BD Days townhouses (COMPLETE roster)
  '507 days rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Townhouse: own water heater per unit (BELIEVED, from the BD townhouse description — not confirmed per unit). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: null,
    notes: 'Tracked units: 21 (BD Days townhouses, COMPLETE roster — unit 13 does NOT exist, do not create it). Townhouse description (believed): 3 stories, 2 washrooms, own water heater per unit. Access note from the field: unit 32 access runs through Maxine — that is a unit/ticket fact, NOT a building profile fact; do not put it here.'
  },

  // 509 Days Rd — BD Days apartments, attached pair with 511
  '509 days rd': {
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
    storageNote: null,
    notes: 'Tracked units: 12 (BD Days pool). Attached pair with 511 Days, shared mech room (holder building unspecified). Laundry: 509 believed NO sink (UNVERIFIED — do not state it as fact; 511 WITH sink is the confirmed side).'
  },

  // 1727 Bath Rd — BD townhouses
  '1727 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Townhouse: own water heater per unit (BELIEVED, from the BD townhouse description — not confirmed per unit). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: null,
    notes: 'Tracked units: 4 (BD Bath townhouses 33–36). No communal laundry. Townhouse description (believed): 3 stories, 2 washrooms, own water heater per unit.'
  },

  // 1737 Bath Rd — BD townhouses
  '1737 bath rd': {
    totalUnitsOverride: null,
    floors: null,
    elevator: null,
    heatingType: null,
    heatingFuel: null,
    heatingDescription: 'Townhouse: own water heater per unit (BELIEVED, from the BD townhouse description — not confirmed per unit). Space heating type: Not yet recorded.',
    mechanicalRoomLocation: null,
    waterHeaters: null,
    pumps: null,
    solarPanels: null,
    storageNote: null,
    notes: 'Tracked units: 8 (BD Bath townhouses 37–44). Townhouse description (believed): 3 stories, 2 washrooms, own water heater per unit. Laundry: NOT recorded for 1737 (do not copy 1727\'s no-communal-laundry note here — 1727 and 1737 are separate buildings).'
  },

  // 103 Amherst Dr — Amherst row, twin of 107
  '103 amherst dr': {
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
    storageNote: null,
    notes: 'Tracked units: 35 + UTILITY (UTILITY is a space, NOT a unit — do not count it as a unit; if the UI computes 35, that matches, UTILITY aside; report the computed total and the UTILITY note together). Same roster as 107 Amherst — 103 was confirmed Oct 22, 2026 as a real TWIN of 107 that Jose had forgotten; do not merge 103 and 107. 103 is in the Amherst row (44 buildings, odd numbers 103–229).'
  },

  // 137 Amherst Dr — Amherst row, on-hold building
  '137 amherst dr': {
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
    storageNote: null,
    notes: 'Unit count: NOT asserted in the notes — record the UI-computed total as found, do not state a tracked count for 137. Field note: the whole 137 job is ON HOLD per management until rent is paid (tenant Christian Ngwale, unit 137; Yardi pest line showed Completed Oct 27, but the job itself is ON HOLD — ticket status is master, do not close or promise work on Yardi Completed alone). Enbridge gas shutoff risk is live for this building (per Jose\'s Oct 27 note). Unit-level appliance facts (range, water heater) belong on the unit, NOT here.'
  },

  // 24 Elm St — Elm complex, lettered + numeric numbering
  '24 elm st': {
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
    storageNote: null,
    notes: 'Tracked units: 14. Numbering is DUAL: lettered system 1A, 1B, 1C, 2A, 2B, 2C, 2D, 3A, 3B, 3C, 4A, 4B, 4C, 4D (14 labelled units on the Mircom intercom, matching the 14-unit count) AND numeric system 101–104 / 201–204 / 301–303 / 401–403. Letter-to-number mapping is PRESUMED, not confirmed (1A = 101 presumed, mailbox evidence 1C = 103) — especially floors 1 and 4 to confirm on site. OPEN question: if 303D/403D variants are physical 4th apartments, 24 Elm = 16 not 14 — if the UI computes 16, report that as the open-question answer, do not force it to 14. Yardi labels carried a "24-" prefix, stripped in app data.'
  },

  // 203 Colborne St — Elm proximity cluster, conditional profile
  '203 colborne st': {
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
    storageNote: null,
    notes: 'Sits right behind 18/24 Elm, in that proximity cluster. NO Yardi extract yet — units unknown, do not state a unit count. NO storage (per Jose). Do not create unit records for 203 Colborne from this profile.'
  },

  // 501 Frontenac St — Frontenac, 1 building, 101 units
  '501 frontenac st': {
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
    storageNote: null,
    notes: 'Tracked units: 101, 1 building. Floors: F1: 101–107, 111–120 (108–110 do NOT exist) · F2: 201–221 · F3: 301–321 · F4: 401–421 · F5: 501–516, 519–521 (517, 518 do NOT exist). P-suffix entries are spaces, NOT units — do not create them as units. Signage reads 501 Frontenac; Yardi property of record is 495 Frontenac Street — do not split this into two buildings over the address difference. Mixed ownership: per-unit ownership field exists (patry default / external) — nobody guesses per-unit ownership; Jose will name external units. Do not state any specific unit as external here.'
  },

  // 300 Skyfall Ln / Le Santé — uniform-appliance building, Armstrong–Skyfall complex
  'le sant': {
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
    storageNote: null,
    notes: 'Tracked units: 161. Numbering is SPARSE BY DESIGN (phased build-out, ~334 planned; gaps = unreleased units, NOT missing data — do not fill gaps). Uniform-appliance building: candidate pattern from unit 101 plates (Oct 26, 2026) — fridge, range, dishwasher, water heater, AC as the default set, microwave as a direct unit-101 row ONLY (not a default row, to preserve the 6-item roster suites). Do NOT re-list the models here; the default set is the master list. Washer/dryer OPTIONAL per unit. Yardi spelling: 19 units + all WAIT entries read "Sante" (one L) — recorded as TODO-verify, do NOT split the building over the one-L spelling. WAIT entries are waitlist placeholders — NEVER create them as units.'
  },

  // 2274 Princess St — uniform-appliance building, Armstrong–Skyfall complex, largest single building
  '2274 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 236 — largest single building in the portfolio. Zero letter suffixes, zero gaps. Uniform-appliance building: shows the same candidate pattern as Le Santé BY REFERENCE — flagged as a CANDIDATE SHARE, UNCONFIRMED until one 2274 unit\'s plates are checked; do NOT state it as confirmed that 2274 matches Le Santé. Washer/dryer OPTIONAL per unit (3-state). Do NOT re-list the models here; the default set is the master list.'
  },

  // 563 Princess St — Princess trio
  '563 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 23, plus house unit \'1\' as listed in the roster (report the UI-computed total as found alongside this note; do not force a total). Unit 602 does NOT exist — do not create it. Princess trio: 563 + 565 + 567 — Jose has NOT said to move the whole trio to the quadrant; only 565 moved (see its profile). Do not move 563 to the quadrant here.'
  },

  // 565 Princess St — Princess trio, quadrant move
  '565 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. This is the ONLY Princess trio building moved to the frontenac-alfred quadrant (done) — Jose has NOT said to move the whole trio, so 563 and 567 stay in the Princess complex. Do not move them from this profile.'
  },

  // 567 Princess St — Princess trio
  '567 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Princess trio: 563 + 565 + 567 — only 565 moved to the quadrant; 567 stays in the Princess complex. Do not move it here.'
  },

  // 698 McKay St — office, NOT a rental building
  '698 mckay st': {
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
    storageNote: 'OFFICE + warehouse + sea containers (NOT a rental storage unit). Stockpile records: 698 McKay Warehouse (id 11, 20 allocations live), 698 McKay Sea Containers (id 12, ONE group record for all cans — STAYS, holds no items; individual cans list alongside it), Sea Can 2 (id 14, 9 allocations live), Sea Cans 3–14 (ids 16–27, photo-verified Oct 28, 2026, seeded live). Cans 2–14 photo-verified (13 cans); Can 1 still unseen — NEVER seed it. Parts menu is the master list; link to it, do not duplicate it.',
    notes: 'Office (standalone, NOT a rental building — do not treat it as a residential unit source). Address settled: 698 McKay St, NOT 692. Held as too vague/unconfirmed and NOT in any profile list: McKay key-copy machine + "Milwaukee tools" (vague), vans (not tools). Can 12\'s photo-verified key machine + bench machine (DRNE) is a DIFFERENT, specific machine, already recorded as EQUIPMENT — do not merge it with the vague McKay key-copy machine note. Unit count: record the UI-computed total as found; do not assert a residential unit count for an office.'
  },

  // 539 Armstrong Rd — singles, organized storage + Zoom Boom
  '539 armstrong rd': {
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
    storageNote: 'Excellent organized storage (stockpile record exists). Contents: NOT photographed in detail in the notes — menu shows the live stockpile state, do not invent a contents list. Parts menu is the master list.',
    notes: 'Tracked units: 112. Caveat: rows 516–522 were included by count validation + symmetric pattern, TODO-verify spot-check owed — if the UI computes a different total, report that as the spot-check answer, do not force it to 112. Equipment note: a Zoom Boom (telehandler lift) is parked here, already recorded as equipment (Oct 28, 2026) — do not duplicate it as a storage item.'
  },

  // 394 Alfred St — quadrant main storage, converted house
  '394 alfred st': {
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
    storageNote: 'Main storage for the Frontenac/Alfred quadrant (stockpile record exists). Contents: UNKNOWN — not photographed in detail; menu shows an honest empty state until photographed. Do not invent contents.',
    notes: 'Tracked units: 7. Converted house (letters = rooms in the Alfred converted houses). Duplicate Yardi codes exist for 378 and 394 — one building each, both codes recorded as external IDs; do not split 394 into two buildings and do not merge it with 378.'
  },

  // 265 Ontario St — singles, restaurant downstairs, junk basement
  '265 ontario st': {
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
    storageNote: 'Basement: huge junk-filled basement (cleanup project) — records exist with a junk-note and ZERO items, menu empty BY DESIGN. NEVER seed the basement junk as stock. Upstairs storage record also exists. Do not list junk as inventory.',
    notes: 'Tracked units: 14. El Gringo restaurant downstairs (restaurant work Mondays when closed). Roof problem is beyond Jose\'s scope — do not promise roof work in this profile. Unit-level tenant facts belong on the unit, NOT here.'
  },

  // 810 Blackburn Mews — singles, storage role
  '810 blackburn mews': {
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
    storageNote: 'Storage role recorded in the storage network list (stockpile record exists). Contents: UNKNOWN — not photographed in detail; menu shows an honest empty state until photographed. Do not invent contents.',
    notes: 'Tracked units: 66.'
  },

  // 85 Park St — singles, small stash
  '85 park st': {
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
    storageNote: 'Small stash (stockpile record exists). Contents: UNKNOWN in detail — menu shows the live stockpile state, do not invent a contents list.',
    notes: 'Tracked units: 15. No unit 13 (do not create it).'
  },

  // 181 Hillendale Ave — standalone, storage role-flagged
  '181 hillendale ave': {
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
    storageNote: 'Role-flagged storage (stockpile record exists with EMPTY contents). Contents: UNKNOWN — not photographed; menu shows an honest empty state until photographed. Do not invent contents.',
    notes: 'Standalone building (far outlier in the portfolio list). Unit count: NOT asserted in the notes — record the UI-computed total as found, do not state a tracked count for 181 Hillendale. No Yardi unit extract for 181 Hillendale is in the notes — do not invent units.'
  },

  // 77 Manitou Cres — Manitou townhouses
  '77 manitou cres': {
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
    storageNote: null,
    notes: 'Tracked units: 58 townhouses (1–58). Manitou complex: 88 units across 4 buildings (77 Manitou Crescent + 77A + 77B + 77C). Brand-cluster idea is OPEN: Frigidaire / Midea ~10 / old white Frigidaire ~10 as assumed make/model defaults — needs Jose\'s data, do NOT assign any brand cluster to this building, to any Manitou building, or to any unit in this prompt.'
  },

  // 77A Manitou Cres — Manitou, shared pool
  '77a manitou cres': {
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
    storageNote: null,
    notes: 'Tracked units: 10. 77A / 77B / 77C share ONE numbering pool (10 + 11 + 9 = 30 across the three, plus 58 townhouses = 88 Manitou total) — do NOT merge A/B/C into one building, and do NOT re-pool their units here. Brand clusters: OPEN, same note as 77 Manitou Crescent — do NOT assign a brand to 77A.'
  },

  // 77B Manitou Cres — Manitou, shared pool
  '77b manitou cres': {
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
    storageNote: null,
    notes: 'Tracked units: 11. Shares ONE numbering pool with 77A + 77C (see 77A note) — do NOT merge them. Brand clusters: OPEN — do NOT assign a brand to 77B.'
  },

  // 77C Manitou Cres — Manitou, shared pool
  '77c manitou cres': {
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
    storageNote: null,
    notes: 'Tracked units: 9. Shares ONE numbering pool with 77A + 77B (see 77A note) — do NOT merge them. Brand clusters: OPEN — do NOT assign a brand to 77C.'
  },

  // 415 Albert St — singles, lettered units are units here
  '415 albert st': {
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
    storageNote: null,
    notes: 'Tracked units: 6 — 415, 415B, 415C, 415D, 415E, 415F. EXCEPTION to the portfolio rule: lettered entries ARE units here (elsewhere, letter suffixes on a base entry are rooms/spaces, never separate units). Floor split is UNVERIFIED: an earlier agent assigned 415D/E/F to a "Second Floor" NOT present in the Yardi extract — do NOT state that floor split as fact; floors must be derived from units, and if the UI computes a floor split, report it as found, not as confirmed.'
  },

  // 36 Durham St — singles, single unit
  '36 durham st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Singles list — no other context in the notes; do not invent any.'
  },

  // 353 Alfred St — Alfred converted house
  '353 alfred st': {
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
    storageNote: null,
    notes: 'Tracked units: 3. Converted house (in the Alfred converted houses, letters = rooms — do not treat lettered entries here as separate units unless the roster says so; report the UI-computed total as found alongside this note).'
  },

  // 359 Alfred St — Alfred converted house
  '359 alfred st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Converted house (letters = rooms in the Alfred converted houses).'
  },

  // 361 Alfred St — Alfred converted house
  '361 alfred st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Converted house (letters = rooms in the Alfred converted houses).'
  },

  // 376 Alfred St — Alfred converted house
  '376 alfred st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Converted house (letters = rooms in the Alfred converted houses).'
  },

  // 378 Alfred St — Alfred converted house, single-unit house, triple-leak field note
  '378 alfred st': {
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
    storageNote: null,
    notes: 'Tracked units: 1. Single-unit house. Duplicate Yardi codes exist for 378 and 394 — one building each, both codes recorded as external IDs; do not split 378 into two buildings and do not merge it with 394. Field note (Oct 30, 2026, three separate jobs, NOT one job): Olsen boiler leak, Giant electric water heater leak, white top-load washer leak — leak source per appliance NOT confirmed, tenant/WO still pending at the time of that note. Do NOT promise a fix, do NOT close any of the three, and do NOT model any of them as an appliance row in this prompt. A tank-body leak at that age would be a replacement ticket to management, not a same-visit repair promise — but that is a triage rule, not a confirmed diagnosis here, because the leak source per appliance is unknown.'
  },

  // 630 Princess St — Princess, standalone, under construction
  '630 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 26. Standalone (far, under construction) — do not assert occupancy or completion; report the UI-computed total as found alongside the under-construction note. Do not move 630 Princess to any other complex here.'
  },

  // 800 Princess St — Princess, "The 800" (big record)
  '800 princess st': {
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
    storageNote: null,
    notes: 'Tracked units: 51. Alias: "The 800" (big record). Do NOT merge this record with the 800 annex (next profile) — they are separate records.'
  },

  // 800 Princess St Annex — Princess, separate record
  '800 princess st annex': {
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
    storageNote: null,
    notes: 'Tracked units: 4. Separate record from the 800 big record (51) — do NOT merge them. If the annex does NOT resolve to a distinct building in the repo, STOP for this building and report "800 annex: not a distinct repo building — no profile created, no merge with the big record" — that is a successful outcome for this building, not a failure.'
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
