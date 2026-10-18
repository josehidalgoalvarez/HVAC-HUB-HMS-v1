export interface Building {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  comments?: string;
  is3DReady?: boolean;
  definedRooms?: string[];
  floors?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Unit {
  id: string;
  buildingId: string;
  unitNumber: string;
  floor?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Property maintains backward compatibility with v1 while extending Building
 */
export interface Property extends Building {
  imageUrl: string;
  applianceCount: number;
  is3DReady: boolean;
  sqFt?: string;
  yearBuilt?: string;
  lotSize?: string;
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

// --- v2 Domain Entities ---

export type TicketState =
  | 'new'
  | 'verified'
  | 'in-progress'
  | 'blocked'
  | 'on-hold'
  | 'done'
  | 'closed'
  | 'closed-elsewhere'
  | 'open'
  | 'in_progress'
  | 'pending_parts'
  | 'resolved';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketRollup {
  total: number;
  done: number;
  blocked: number;
  inProgress: number;
  states: Record<string, number>;
}

export interface Ticket {
  id: string;
  wo_number: string | null;           // nullable per spec (unnumbered jobs allowed, linkable later)
  parent_ticket_id: string | null;    // nullable per spec (1 parent -> N children)
  buildingId: string;
  unitId?: string | null;
  buildingName?: string;
  unitNumber?: string;
  title: string;
  description?: string;
  verbatim_text?: string | null;      // raw screenshot text from Yardi/tenant
  verified_scope?: string | null;     // technician confirmed job description
  photo_url?: string | null;          // screenshot photo url
  state: TicketState;
  status?: TicketState;               // API compatibility alias
  priority: TicketPriority;
  blocker_reason?: string | null;
  last_seen_in_yardi?: string | null; // null = not yet verified in Yardi; >=7d = stale warning
  is_stale_yardi?: boolean;
  yardi_warning?: string | null;
  children?: Ticket[];
  childrenCount?: number;
  childrenRollup?: TicketRollup;
  assignedTechId?: string | null;
  assigned_tech_name?: string | null;
  notice?: Notice;
  notice_id?: number | string | null;
  notice_status?: NoticeStatus | null;
  notice_gate_status?: NoticeGateStatus | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type RunSheetStatus = 'draft' | 'active' | 'completed';
export type BlockStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface RunSheetBlock {
  id: string | number;
  run_sheet_id?: string | number;
  ticket_id?: string | number | null;
  wo_number?: string | null;
  title: string;
  notes?: string | null;
  building_id?: string | number | null;
  building_name?: string | null;
  building_address?: string | null;
  unit_id?: string | number | null;
  unit_number?: string | null;
  sort_order: number;
  status: BlockStatus;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes: number;
  actual_minutes?: number | null;
  variance_minutes?: number | null;
  required_tools?: string | null;
  required_tools_list?: string[];
  required_parts?: string | null;
  required_parts_list?: string[];
  exceeds_carry_capacity?: boolean;
  carry_warning?: string | null;
  carry_reason?: string | null;
  estimated_weight_lbs?: number;
  notice_id?: string | number | null;
  notice_status?: NoticeStatus | null;
  notice_gate_status?: NoticeGateStatus;
  notice_is_cleared?: boolean;
  notice_gate_reason?: string | null;
  travel_buffer_before_minutes?: number;
  is_site_transition?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RunSheetRollup {
  total_blocks: number;
  completed_blocks: number;
  pending_blocks: number;
  progress_percentage: number;
  total_estimated_minutes: number;
  total_actual_minutes: number;
  variance_minutes: number;
  red_gate_count: number;
  amber_gate_count: number;
  green_gate_count: number;
  exceeds_capacity_count: number;
}

export interface RunSheet {
  id: string | number;
  techId?: string;
  tech_id?: string | number;
  tech_name?: string;
  runDate?: string;
  run_date: string; // YYYY-MM-DD
  status: RunSheetStatus;
  routeOrder?: string[];
  route_order?: any;
  ticketIds?: string[];
  notes?: string;
  blocks?: RunSheetBlock[];
  blocks_count?: number;
  completed_blocks_count?: number;
  total_estimated_minutes?: number;
  total_actual_minutes?: number;
  rollup?: RunSheetRollup;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface BatchSuggestionResult {
  total_tickets: number;
  total_sites: number;
  estimated_work_minutes: number;
  estimated_travel_minutes: number;
  estimated_total_minutes: number;
  blocks: RunSheetBlock[];
}

export type NoticeStatus = 'drafted' | 'sent' | 'served' | 'verified';
export type NoticeGateStatus = 'green' | 'amber' | 'red';
export type NoticeType = 'entry' | 'maintenance' | 'inspection' | 'general';

export interface Notice {
  id: string;
  ticketId?: string | null;
  ticket_id?: string | number | null;
  buildingId: string;
  building_id?: string | number;
  buildingName?: string;
  building_name?: string;
  unitId?: string | null;
  unit_id?: string | number | null;
  unitNumber?: string;
  unit_number?: string;
  woNumber?: string | null;
  wo_number?: string | null;
  ticketTitle?: string | null;
  ticket_title?: string | null;
  title: string;
  content: string;
  status: NoticeStatus;
  noticeType: NoticeType;
  notice_type?: NoticeType;
  entryDate?: string | null;
  entry_date?: string | null;
  entryStart?: string | null;
  entry_start?: string | null;
  entryEnd?: string | null;
  entry_end?: string | null;
  serveByDeadline?: string | null;
  serve_by_deadline?: string | null;
  draftedAt?: string | null;
  drafted_at?: string | null;
  sentAt?: string | null;
  sent_at?: string | null;
  servedAt?: string | null;
  served_at?: string | null;
  verifiedAt?: string | null;
  verified_at?: string | null;
  servedMethod?: string | null;
  served_method?: string | null;
  verifiedByUserId?: string | null;
  verified_by_user_id?: string | number | null;
  gateStatus?: NoticeGateStatus;
  gate_status?: NoticeGateStatus;
  isCleared?: boolean;
  is_cleared?: boolean;
  gateReason?: string;
  gate_reason?: string;
  createdBy?: string;
  created_by?: string | number;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
}

export interface Watch {
  id: string;
  userId: string;
  entityType: 'ticket' | 'part' | 'appliance' | 'building' | 'unit';
  entityId: string;
  triggerCondition: string;
  isActive: boolean;
  lastCheckedAt?: string | null;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Stockpile {
  id: string;
  name: string;
  location: string;
  buildingId?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Part {
  id: string;
  name: string;
  partNumber?: string;
  category?: string;
  description?: string;
  quantityOnHand: number;
  minQuantity: number;
  unitCost?: number;
  stockpileId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Correction {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  reason?: string | null;
  createdAt: string;
}
