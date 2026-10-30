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
