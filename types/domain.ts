
export interface Property {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  applianceCount: number;
  is3DReady: boolean;
  sqFt?: string;
  yearBuilt?: string;
  lotSize?: string;
  comments?: string;
  definedRooms?: string[];
  floors?: string[];
}

export interface ApplianceSpecs {
  btuInput?: string;
  btuOutput?: string;
  kw?: string;
  fuelType?: string;
  volts?: string;
  watts?: string;
  phase?: string;
  hertz?: string;
  airTempRise?: string;
  capacity?: string;
  installDate?: string;
  location?: string;
  breakerRating?: string;
  panelSlot?: string;
  motorHp?: string;
  maxUnitAmp?: string;
  filterSize?: string;
  refrigerantType?: string;
  efficiency?: string;
  // Dashboard Specific Specs
  returnTemp?: string;
  supplyTemp?: string;
  staticPressure?: string;
  fanSpeed?: string;
  waterTemp?: string;
  systemPressure?: string;
  flowRate?: string;
  gasValve?: string; // 'OPEN' or 'CLOSED' usually
}

export interface CanvasPosition {
  x: number;
  y: number;
  floor: string;
}

export interface Appliance {
  id: string;
  name: string;
  brand: string;
  propertyId: string;
  status: 'operational' | 'needs_service' | 'error' | 'idle' | 'connected';
  lastService: string;
  type: string;
  category?: string;
  imageUrl?: string;
  location?: string;
  embedModelUrl?: string;
  serialNumber?: string;
  modelNumber?: string;
  alert?: string;
  meta?: string;
  specs?: ApplianceSpecs;
  maintenanceHistory?: MaintenanceRecord[];
  manualUrl?: string;
  warrantyUrl?: string;
  installationUrl?: string;
  ratingPlateUrl?: string;
  position?: CanvasPosition;
  connectedToId?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  date: string;
  type: string;
  notes: string;
  technician: string;
}
