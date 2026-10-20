export interface Building {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  comments?: string;
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
  room?: string;
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
  room?: string;
  unitNumber?: string;
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
  | 'on_hold'
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
  building_id?: string | number;
  propertyId?: string | number;
  unitId?: string | null;
  unit_id?: string | number | null;
  buildingName?: string;
  building_name?: string;
  propertyName?: string;
  address?: string;
  unitNumber?: string;
  unit_number?: string;
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
  exterior_work?: boolean;
  weather_note?: string | null;
  notice_needed?: boolean;
  notice_sent_at?: string | null;
  notice_confirmed_by?: string | null;
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

export type NoticeStatus = 'drafted' | 'handed_off' | 'sent' | 'scheduled' | 'served' | 'verified';
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
  handedOffAt?: string | null;
  handed_off_at?: string | null;
  handedOffTo?: string | null;
  handed_off_to?: string | null;
  sentAt?: string | null;
  sent_at?: string | null;
  scheduledAt?: string | null;
  scheduled_at?: string | null;
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
  id: string | number;
  name: string;
  location: string;
  buildingId?: string | number | null;
  building_id?: number | null;
  building_name?: string | null;
  notes?: string | null;
  distinct_parts_count?: number;
  total_units_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockpileAllocation {
  id: number;
  part_id: number;
  stockpile_id: number;
  stockpile_name: string;
  stockpile_location: string;
  quantity: number;
  status: 'available' | 'on_hold' | 'in_use';
  location_notes?: string | null;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  supplier?: string;
}

export interface SupplierRecord {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
  account_number?: string | null;
  supplied_parts_count?: number;
  created_at?: string;
}

export interface Part {
  id: string | number;
  name: string;
  partNumber?: string | null;
  part_number?: string | null;
  category?: string | null;
  description?: string | null;
  quantityOnHand: number;
  quantity_on_hand?: number;
  minQuantity: number;
  min_quantity?: number;
  reorder_point?: number;
  reorderPoint?: number;
  unitCost?: number | null;
  unit_cost?: number | null;
  stockpileId?: string | number | null;
  stockpile_id?: number | null;
  compatible_models?: string[];
  compatibleModels?: string[];
  price_history?: PriceHistoryEntry[];
  priceHistory?: PriceHistoryEntry[];
  preferred_supplier_id?: number | null;
  preferred_supplier?: SupplierRecord | null;
  is_reorder?: boolean;
  stockpiles?: StockpileAllocation[];
  stock_summary?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartRecord extends Part {
  id: number;
  part_number: string;
  compatible_models: string[];
  price_history: PriceHistoryEntry[];
  is_reorder: boolean;
  quantity_on_hand: number;
  reorder_point: number;
}

export interface ShoppingListItem {
  part_number: string;
  part_name: string;
  part_id?: number | null;
  description?: string | null;
  category?: string | null;
  total_needed: number;
  ticket_count: number;
  ticket_ids: number[];
  tickets_meta: Array<{ ticket_id: number; wo_number?: string | null; title?: string | null }>;
  available_in_stock: number;
  harvest_quantity: number;
  buy_quantity: number;
  source: 'harvest' | 'buy';
  harvest_tag?: string | null;
  buy_tag?: string | null;
  stockpile_id?: number | null;
  stockpile_name?: string | null;
  stockpile_location?: string | null;
  preferred_supplier?: {
    name: string;
    phone?: string | null;
    hours?: string | null;
  };
  unit_cost?: number;
  compatible_models?: string[];
}

export interface ShoppingListResponse {
  items: ShoppingListItem[];
  total_parts_count: number;
  total_items_needed: number;
  harvest_count: number;
  buy_count: number;
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

export type JobStatus = 'in_progress' | 'completed' | 'canceled';

export interface JobPart {
  id?: number;
  job_id?: number;
  part_name: string;
  quantity: number;
  unit?: string;
  notes?: string;
  created_at?: string;
}

export interface JobNote {
  id?: number;
  job_id?: number;
  tech_id?: number;
  note_text: string;
  created_at?: string;
  author_name?: string;
}

export interface JobPhoto {
  id?: number;
  file_path: string;
  file_size_bytes?: number;
  caption?: string;
  created_at?: string;
}

export interface Job {
  id: number;
  ticket_id?: number | null;
  run_sheet_block_id?: number | null;
  building_id?: number | null;
  unit_id?: number | null;
  tech_id?: number | null;
  title: string;
  status: JobStatus;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes: number;
  actual_minutes?: number | null;
  notes?: string | null;
  parts_used?: JobPart[];
  notes_list?: JobNote[];
  photos?: JobPhoto[];
  variance_minutes?: number | null;
  wo_number?: string | null;
  ticket_title?: string | null;
  ticket_status?: string | null;
  ticket_priority?: string | null;
  building_name?: string | null;
  building_address?: string | null;
  unit_number?: string | null;
  tech_name?: string | null;
  parts_count?: number;
  notes_count?: number;
  photos_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JobCloseoutPayload {
  actual_minutes: number;
  notes?: string;
  parts_used?: Array<{
    part_name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  photos?: Array<{
    file_path: string;
    caption?: string;
    file_size_bytes?: number;
  }>;
}

export type OutboxMutationType =
  | 'create_job'
  | 'add_note'
  | 'add_part_used'
  | 'add_photo'
  | 'close_job'
  | 'update_ticket'
  | 'custom';

export interface OutboxItem {
  id: string;
  idempotency_key: string;
  type: OutboxMutationType;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: Record<string, unknown>;
  job_id?: number | string;
  createdAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

// --- Proactive Watch Engine (Phase 6) ---
export type WatchType = 'notice_deadline' | 'notice_handoff' | 'reply_waiting' | 'weather_freeze' | 'scheduled_task' | 'weather_manual';
export type WatchState = 'active' | 'triggered' | 'acknowledged' | 'snoozed' | 'resolved';

export interface WatchRecord {
  id: number;
  user_id?: number | null;
  watch_type: WatchType;
  title: string;
  description?: string | null;
  target_type?: string | null;
  target_id?: number | null;
  state: WatchState;
  config?: Record<string, any>;
  snoozed_until?: string | null;
  last_evaluated_at?: string | null;
  last_triggered_at?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  latest_trigger_reason?: string | null;
  latest_trigger_data?: Record<string, any>;
  quiet_hours_delayed?: boolean;
  batched_for_morning?: boolean;
  batch_message?: string;
  is_snoozed_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchDigestResponse {
  date: string;
  current_time: string;
  is_quiet_hours: boolean;
  items: WatchRecord[];
  total_active_alerts: number;
  morning_batch: WatchRecord[];
  morning_batch_count: number;
  snoozed_count: number;
}

export interface WatchEvaluateResponse {
  evaluated_at: string;
  evaluated_count: number;
  triggered_count: number;
  quiet_hours_active: boolean;
  quiet_hours_delayed_count: number;
  triggered_watches: WatchRecord[];
  message: string;
}

