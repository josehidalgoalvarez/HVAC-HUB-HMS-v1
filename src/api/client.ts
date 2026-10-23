/**
 * HVACHome v2 Typed API Client
 * Connects React frontend to Slim 4 JSON API
 */

import type {
  Ticket,
  Correction,
  Notice,
  RunSheet,
  RunSheetBlock,
  BatchSuggestionResult,
  Job,
  JobPart,
  JobNote,
  JobPhoto,
  JobCloseoutPayload,
  OutboxItem,
  Part,
  PartRecord,
  Stockpile,
  SupplierRecord,
  ShoppingListResponse,
  WatchRecord,
  WatchDigestResponse,
  WatchEvaluateResponse,
} from '../../types/domain';
import { appCache } from '../offline/cache.ts';

export interface ApiResponseEnvelope<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string = 'api_error', status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends ApiError {
  constructor(message: string = 'Unauthorized', code: string = 'unauthorized', status: number = 401) {
    super(message, code, status);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface UserSummary {
  id: number | string;
  name: string;
  email: string;
  role: 'tech' | 'management';
}

export interface LoginResult {
  token: string;
  user: UserSummary;
}

export interface HealthResult {
  status: string;
}

export class ApiClient {
  private baseUrl: string;
  private readonly storageKey = 'auth_token';

  constructor(baseUrl?: string) {
    // Read from Vite env, fallback to provided or empty string (relative)
    const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
    this.baseUrl = (baseUrl ?? envBase).replace(/\/+$/, '');
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getToken(): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const stored = window.sessionStorage.getItem(this.storageKey);
    if (stored) return stored;
    // In local dev/preview on localhost, default to test-tech-token so the field tech app loads out-of-the-box
    const host = window.location?.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'test-tech-token';
    }
    return null;
  }

  public setToken(token: string | null): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    if (token) {
      window.sessionStorage.setItem(this.storageKey, token);
    } else {
      window.sessionStorage.removeItem(this.storageKey);
    }
  }

  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Main request method with envelope unwrapping and typed error handling.
   */
  public async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(options.headers || {});

    // Automatically attach Bearer token if present
    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Default to JSON accept
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    if (isGet) {
      try {
        const meta = await appCache.getMeta(path);
        if (meta?.etag && !headers.has('If-None-Match')) {
          headers.set('If-None-Match', meta.etag);
        }
      } catch {
        // Ignore cache meta read error
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: unknown) {
      // Offline fallback: if network failed on GET, try reading from cache
      if (isGet) {
        try {
          const cached = await appCache.get<T>(path);
          if (cached !== null) {
            return cached;
          }
        } catch {
          // Ignore
        }
      }
      const msg = networkErr instanceof Error ? networkErr.message : 'Network request failed';
      throw new ApiError(`Network error: ${msg}`, 'network_error', 0);
    }

    // Handle 304 Not Modified from ETag match
    if (response.status === 304) {
      try {
        const cached = await appCache.get<T>(path);
        if (cached !== null) {
          return cached;
        }
      } catch {
        // Fall through
      }
    }

    let payload: ApiResponseEnvelope<T> | null = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        payload = (await response.json()) as ApiResponseEnvelope<T>;
      } catch {
        // Fallback for malformed JSON
        payload = null;
      }
    }

    // Check for HTTP 401 Unauthorized
    if (response.status === 401) {
      const message = payload?.error?.message || 'Authentication required';
      const code = payload?.error?.code || 'unauthorized';
      this.clearToken();
      throw new AuthError(message, code, 401);
    }

    // Handle non-OK HTTP status codes
    if (!response.ok) {
      const message = payload?.error?.message || `Request failed with status ${response.status}`;
      const code = payload?.error?.code || 'http_error';
      throw new ApiError(message, code, response.status);
    }

    // Envelope validation: If error object is populated despite 2xx status
    if (payload && payload.error) {
      throw new ApiError(payload.error.message, payload.error.code, response.status);
    }

    const resultData = payload && 'data' in payload ? (payload.data as T) : ((payload as unknown) as T);

    // Save to cache on GET with ETag or successful payload
    if (isGet && resultData !== undefined && resultData !== null) {
      const etag = response.headers.get('etag');
      appCache.set(path, resultData, etag).catch(() => {});
    }

    return resultData;
  }

  public get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Health check endpoint
   */
  public async health(): Promise<HealthResult> {
    return this.get<HealthResult>('/api/health');
  }

  /**
   * Login endpoint
   */
  public async login(email: string, password: string): Promise<LoginResult> {
    const result = await this.post<LoginResult>('/api/login', { email, password });
    if (result && result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  /**
   * Upload photo via multipart POST /api/photos
   */
  public async uploadPhoto(
    file: File | Blob,
    options?: { entityType?: string; entityId?: string | number; caption?: string }
  ): Promise<{ id?: number | string; url: string; filePath: string }> {
    const formData = new FormData();
    const filename = file instanceof File ? file.name : 'photo.jpg';
    formData.append('photo', file, filename);
    if (options?.entityType) {
      formData.append('entity_type', options.entityType);
    }
    if (options?.entityId !== undefined) {
      formData.append('entity_id', String(options.entityId));
    }
    if (options?.caption) {
      formData.append('caption', options.caption);
    }

    const res = await this.request<{ id?: number | string; url: string; filePath: string }>('/api/photos', {
      method: 'POST',
      body: formData,
    });

    // If url is relative and baseUrl is set, prepend baseUrl
    if (res && res.url && !res.url.startsWith('http://') && !res.url.startsWith('https://')) {
      const base = this.baseUrl.replace(/\/+$/, '');
      if (base) {
        res.url = `${base}${res.url.startsWith('/') ? res.url : `/${res.url}`}`;
      }
    }

    return res;
  }

  /**
   * Get tickets list (prioritized: safety first -> closable today -> rest)
   */
  public async getTickets(params?: Record<string, string | number>): Promise<Ticket[]> {
    let path = '/api/tickets';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<Ticket[]>(path);
  }

  /**
   * Get single ticket with children and rollup stats
   */
  public async getTicket(id: string | number): Promise<Ticket> {
    return this.get<Ticket>(`/api/tickets/${id}`);
  }

  /**
   * Create new ticket (wo_number is nullable)
   */
  public async createTicket(data: Partial<Ticket>): Promise<Ticket> {
    return this.post<Ticket>('/api/tickets', data);
  }

  /**
   * Update ticket fields with append-only correction audit logging
   */
  public async updateTicket(id: string | number, data: Partial<Ticket> & { reason?: string }): Promise<Ticket> {
    return this.patch<Ticket>(`/api/tickets/${id}`, data);
  }

  /**
   * Create child ticket under a parent ticket
   */
  public async createChildTicket(parentId: string | number, data: Partial<Ticket>): Promise<Ticket> {
    return this.post<Ticket>(`/api/tickets/${parentId}/children`, data);
  }

  /**
   * Get correction history log for a ticket
   */
  public async getTicketCorrections(id: string | number): Promise<Correction[]> {
    return this.get<Correction[]>(`/api/tickets/${id}/corrections`);
  }

  /**
   * Record Yardi sighting stamp (read-only mirror)
   */
  public async recordYardiSighting(
    id: string | number,
    data: { wo_number?: string; unit_raw?: string; description?: string; status?: string; payload?: unknown }
  ): Promise<{ ticket_id: number; wo_number: string; sighted_at: string; message: string }> {
    return this.post<{ ticket_id: number; wo_number: string; sighted_at: string; message: string }>(
      `/api/tickets/${id}/sighting`,
      data
    );
  }

  /**
   * Intake ticket from screenshot photo + verbatim text + verified scope text
   */
  public async intakeTicket(data: FormData | Record<string, unknown>): Promise<Ticket> {
    if (data instanceof FormData) {
      const res = await this.request<Ticket>('/api/intake', {
        method: 'POST',
        body: data,
      });
      return res;
    }
    return this.post<Ticket>('/api/intake', data);
  }

  /**
   * Get notices list
   */
  public async getNotices(params?: Record<string, string | number>): Promise<Notice[]> {
    let path = '/api/notices';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<Notice[]>(path);
  }

  /**
   * Get single notice by ID
   */
  public async getNotice(id: string | number): Promise<Notice> {
    return this.get<Notice>(`/api/notices/${id}`);
  }

  /**
   * Create notice (automatically computes 24h serve-by deadline)
   */
  public async createNotice(data: Partial<Notice>): Promise<Notice> {
    return this.post<Notice>('/api/notices', data);
  }

  /**
   * Update notice or advance state progression (drafted -> sent -> served -> verified)
   */
  public async updateNotice(id: string | number, data: Partial<Notice> & { reason?: string }): Promise<Notice> {
    return this.patch<Notice>(`/api/notices/${id}`, data);
  }

  /**
   * Get gate status for a notice (green / amber / red)
   */
  public async getNoticeGateStatus(id: string | number): Promise<{
    notice_id: number;
    status: string;
    entry_start: string;
    entry_end: string;
    serve_by_deadline: string;
    gate_status: 'green' | 'amber' | 'red';
    is_cleared: boolean;
    reason: string;
  }> {
    return this.get<{
      notice_id: number;
      status: string;
      entry_start: string;
      entry_end: string;
      serve_by_deadline: string;
      gate_status: 'green' | 'amber' | 'red';
      is_cleared: boolean;
      reason: string;
    }>(`/api/notices/${id}/gate-status`);
  }

  // --- Run Sheet & Day-Plan Methods (Phase 2) ---

  /**
   * Get list of run sheets
   */
  public async getRunSheets(params?: Record<string, string | number>): Promise<RunSheet[]> {
    let path = '/api/run-sheets';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<RunSheet[]>(path);
  }

  /**
   * Get single run sheet by ID with full ordered blocks and rollups
   */
  public async getRunSheet(id: string | number): Promise<RunSheet> {
    return this.get<RunSheet>(`/api/run-sheets/${id}`);
  }

  /**
   * Create a new run sheet
   */
  public async createRunSheet(data: Partial<RunSheet>): Promise<RunSheet> {
    return this.post<RunSheet>('/api/run-sheets', data);
  }

  /**
   * Update run sheet metadata
   */
  public async updateRunSheet(id: string | number, data: Partial<RunSheet> & { reason?: string }): Promise<RunSheet> {
    return this.patch<RunSheet>(`/api/run-sheets/${id}`, data);
  }

  /**
   * Add a time block to a run sheet
   */
  public async addRunSheetBlock(runSheetId: string | number, data: Partial<RunSheetBlock>): Promise<RunSheetBlock> {
    return this.post<RunSheetBlock>(`/api/run-sheets/${runSheetId}/blocks`, data);
  }

  /**
   * Update a run sheet block (e.g. record actual_minutes, complete block)
   */
  public async updateRunSheetBlock(
    runSheetId: string | number,
    blockId: string | number,
    data: Partial<RunSheetBlock> & { reason?: string }
  ): Promise<RunSheetBlock> {
    return this.patch<RunSheetBlock>(`/api/run-sheets/${runSheetId}/blocks/${blockId}`, data);
  }

  /**
   * Delete a block from a run sheet
   */
  public async deleteRunSheetBlock(
    runSheetId: string | number,
    blockId: string | number
  ): Promise<{ deleted: boolean; id: number }> {
    return this.delete<{ deleted: boolean; id: number }>(`/api/run-sheets/${runSheetId}/blocks/${blockId}`);
  }

  /**
   * Suggest batch of travel-ordered time blocks grouped by site proximity
   */
  public async suggestRunSheetBatch(data: {
    ticket_ids?: (string | number)[];
    start_time?: string;
  }): Promise<BatchSuggestionResult> {
    try {
      return await this.post<BatchSuggestionResult>('/api/run-sheets/suggest-batch', data);
    } catch (err) {
      console.warn('[ApiClient] suggestRunSheetBatch remote call failed, using client proximity fallback', err);
      const ticketIds = (data.ticket_ids || []).map(String);
      const allTickets = await this.getTickets();
      const selected = allTickets.filter((t) => ticketIds.includes(String(t.id)));

      // Cluster by building
      const buildingGroups = new Map<string, Ticket[]>();
      for (const t of selected) {
        const bKey = String(t.buildingId || t.building_id || t.propertyId || '1');
        if (!buildingGroups.has(bKey)) {
          buildingGroups.set(bKey, []);
        }
        buildingGroups.get(bKey)!.push(t);
      }

      const blocks: RunSheetBlock[] = [];
      let currentHour = 8;
      let sortOrder = 1;
      let lastBuildingId: string | null = null;
      let totalTravel = 0;

      for (const [bKey, group] of buildingGroups.entries()) {
        const isTransition = lastBuildingId !== null && lastBuildingId !== bKey;
        if (isTransition) {
          totalTravel += 15;
        }
        lastBuildingId = bKey;

        for (const t of group) {
          const startTime = `${String(currentHour).padStart(2, '0')}:00`;
          const endTime = `${String(currentHour + 1).padStart(2, '0')}:00`;
          currentHour++;

          blocks.push({
            id: `fallback-block-${t.id}`,
            ticket_id: t.id,
            wo_number: t.wo_number || null,
            title: t.title || 'Work Order',
            building_id: t.buildingId || t.building_id || 1,
            building_name: t.buildingName || t.building_name || t.propertyName || 'Property',
            building_address: t.address || 'Bath Rd',
            unit_id: t.unitId || t.unit_id || null,
            unit_number: t.unitNumber || t.unit_number || '1',
            sort_order: sortOrder++,
            status: 'pending',
            start_time: startTime,
            end_time: endTime,
            estimated_minutes: 60,
            is_site_transition: isTransition && group.indexOf(t) === 0,
            travel_buffer_before_minutes: isTransition && group.indexOf(t) === 0 ? 15 : 0,
            notice_gate_status: 'green',
            notice_is_cleared: true,
          });
        }
      }

      return {
        total_tickets: selected.length,
        total_sites: buildingGroups.size,
        estimated_work_minutes: selected.length * 60,
        estimated_travel_minutes: totalTravel,
        estimated_total_minutes: selected.length * 60 + totalTravel,
        blocks,
      };
    }
  }

  // --- Field Jobs & Field Loop (Phase 3) ---

  /**
   * List field jobs
   */
  public async getJobs(params?: Record<string, string | number>): Promise<Job[]> {
    let path = '/api/jobs';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<Job[]>(path);
  }

  /**
   * Get single job with all sub-resources (parts, notes, photos)
   */
  public async getJob(id: string | number): Promise<Job> {
    return this.get<Job>(`/api/jobs/${id}`);
  }

  /**
   * Create a new field job session
   */
  public async createJob(data: Partial<Job>): Promise<Job> {
    return this.post<Job>('/api/jobs', data);
  }

  /**
   * Update job session attributes
   */
  public async updateJob(id: string | number, data: Partial<Job> & { reason?: string }): Promise<Job> {
    return this.patch<Job>(`/api/jobs/${id}`, data);
  }

  /**
   * Upload / attach photo to job
   */
  public async addJobPhoto(
    id: string | number,
    data: FormData | { file_path: string; caption?: string; file_size_bytes?: number }
  ): Promise<JobPhoto> {
    if (data instanceof FormData) {
      return this.request<JobPhoto>(`/api/jobs/${id}/photos`, {
        method: 'POST',
        body: data,
      });
    }
    return this.post<JobPhoto>(`/api/jobs/${id}/photos`, data);
  }

  /**
   * Record part used on a job
   */
  public async addJobPartUsed(
    id: string | number,
    data: { part_name: string; quantity?: number; unit?: string; notes?: string }
  ): Promise<JobPart> {
    return this.post<JobPart>(`/api/jobs/${id}/parts-used`, data);
  }

  /**
   * Append technician note to a job
   */
  public async addJobNote(id: string | number, noteText: string): Promise<JobNote> {
    return this.post<JobNote>(`/api/jobs/${id}/notes`, { note_text: noteText });
  }

  /**
   * Close out a job and its linked ticket
   */
  public async closeJob(id: string | number, data: JobCloseoutPayload): Promise<Job> {
    return this.post<Job>(`/api/jobs/${id}/close`, data);
  }

  /**
   * Batch outbox synchronization
   */
  public async syncBatch(mutations: Array<{
    id?: string;
    idempotency_key?: string;
    type: string;
    job_id?: string | number;
    payload: Record<string, unknown>;
  }>): Promise<{
    synced_count: number;
    total_submitted: number;
    results: Array<{ idempotency_key: string; status: string; result?: unknown }>;
    failures: Array<{ idempotency_key: string; action: string; error: string }>;
  }> {
    return this.post('/api/sync', { mutations });
  }

  /**
   * Replay single outbox mutation item directly
   */
  public async replayOutboxItem(item: OutboxItem): Promise<unknown> {
    const jobId = item.job_id || (item.payload?.job_id as string | number);
    switch (item.type) {
      case 'create_job':
        return this.createJob(item.payload as Partial<Job>);
      case 'add_note':
        return this.addJobNote(jobId, (item.payload.note_text || item.payload.note || item.payload.text) as string);
      case 'add_part_used':
        return this.addJobPartUsed(jobId, item.payload as { part_name: string; quantity?: number; unit?: string; notes?: string });
      case 'add_photo':
        return this.addJobPhoto(jobId, item.payload as { file_path: string; caption?: string });
      case 'close_job':
        return this.closeJob(jobId, item.payload as unknown as JobCloseoutPayload);
      default:
        return this.request(item.endpoint, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
    }
  }

  // --- Phase 4 Parts Catalog, Stockpiles & Shopping Lists ---

  /**
   * Search parts catalog
   */
  public async getParts(query?: string, isReorder?: boolean): Promise<PartRecord[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (isReorder !== undefined) params.append('is_reorder', String(isReorder));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get<PartRecord[]>(`/api/parts${qs}`);
  }

  /**
   * Get single part by ID
   */
  public async getPart(id: string | number): Promise<PartRecord> {
    return this.get<PartRecord>(`/api/parts/${id}`);
  }

  /**
   * Create new catalog part
   */
  public async createPart(data: Partial<Part>): Promise<PartRecord> {
    return this.post<PartRecord>('/api/parts', data);
  }

  /**
   * Update part fields
   */
  public async updatePart(id: string | number, data: Partial<Part>, reason?: string): Promise<PartRecord> {
    return this.patch<PartRecord>(`/api/parts/${id}`, { ...data, reason });
  }

  /**
   * Log part usage on a job
   */
  public async usePart(
    id: string | number,
    payload: { quantity?: number; job_id?: number | string; stockpile_id?: number | string; reason?: string }
  ): Promise<{
    part: PartRecord;
    quantity_used: number;
    previous_quantity: number;
    new_quantity: number;
    reorder_point: number;
    is_reorder: boolean;
    reorder_warning?: string | null;
  }> {
    return this.post(`/api/parts/${id}/use`, payload);
  }

  /**
   * List stockpiles
   */
  public async getStockpiles(): Promise<Stockpile[]> {
    return this.get<Stockpile[]>('/api/stockpiles');
  }

  /**
   * Create stockpile
   */
  public async createStockpile(data: Partial<Stockpile>): Promise<Stockpile> {
    return this.post<Stockpile>('/api/stockpiles', data);
  }

  /**
   * List suppliers
   */
  public async getSuppliers(): Promise<SupplierRecord[]> {
    return this.get<SupplierRecord[]>('/api/suppliers');
  }

  /**
   * Create supplier
   */
  public async createSupplier(data: Partial<SupplierRecord>): Promise<SupplierRecord> {
    return this.post<SupplierRecord>('/api/suppliers', data);
  }

  /**
   * Build harvest-first shopping list from ticket IDs
   */
  public async buildShoppingList(ticketIds: Array<string | number>): Promise<ShoppingListResponse> {
    return this.post<ShoppingListResponse>('/api/shopping-lists/from-tickets', { ticket_ids: ticketIds });
  }

  // --- Proactive Watch Engine Methods (Phase 6) ---

  /**
   * List watches with optional state / type filtering
   */
  public async getWatches(params?: {
    state?: string;
    watch_type?: string;
    target_type?: string;
    target_id?: number | string;
    view?: string;
  }): Promise<WatchRecord[]> {
    let path = '/api/watches';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<WatchRecord[]>(path);
  }

  /**
   * Get single watch by ID
   */
  public async getWatch(id: number | string): Promise<WatchRecord> {
    return this.get<WatchRecord>(`/api/watches/${id}`);
  }

  /**
   * Create new watch
   */
  public async createWatch(data: Partial<WatchRecord>): Promise<WatchRecord> {
    return this.post<WatchRecord>('/api/watches', data);
  }

  /**
   * Modify watch fields
   */
  public async updateWatch(id: number | string, data: any): Promise<WatchRecord> {
    return this.patch<WatchRecord>(`/api/watches/${id}`, data);
  }

  /**
   * Snooze a watch (1h, 4h, tomorrow, or custom timestamp)
   */
  public async snoozeWatch(
    id: number | string,
    duration: '1h' | '4h' | 'tomorrow' | string = '1h',
    simulatedTime?: string
  ): Promise<WatchRecord> {
    return this.patch<WatchRecord>(`/api/watches/${id}`, {
      action: 'snooze',
      duration,
      simulated_time: simulatedTime,
    });
  }

  /**
   * Acknowledge a triggered watch
   */
  public async acknowledgeWatch(id: number | string): Promise<WatchRecord> {
    return this.patch<WatchRecord>(`/api/watches/${id}`, { action: 'acknowledge' });
  }

  /**
   * Resolve a watch permanently
   */
  public async resolveWatch(id: number | string): Promise<WatchRecord> {
    return this.patch<WatchRecord>(`/api/watches/${id}`, { action: 'resolve' });
  }

  /**
   * Reactivate a watch
   */
  public async reactivateWatch(id: number | string): Promise<WatchRecord> {
    return this.patch<WatchRecord>(`/api/watches/${id}`, { action: 'reactivate' });
  }

  /**
   * Delete a watch
   */
  public async deleteWatch(id: number | string): Promise<{ deleted: boolean; id: number }> {
    return this.delete<{ deleted: boolean; id: number }>(`/api/watches/${id}`);
  }

  /**
   * Run evaluation on all active watches
   */
  public async evaluateWatches(options?: {
    simulated_time?: string;
    quiet_start?: number;
    quiet_end?: number;
  }): Promise<WatchEvaluateResponse> {
    return this.post<WatchEvaluateResponse>('/api/watches/evaluate', options ?? {});
  }

  /**
   * Check if rain is expected for a given date (defaults to today)
   */
  public async checkRainExpected(date?: string): Promise<boolean> {
    const d = date || new Date().toISOString().slice(0, 10);
    try {
      const res = await this.get<{ date: string; rain_expected: boolean }>(`/api/weather/rain-check?date=${encodeURIComponent(d)}`);
      return !!res?.rain_expected;
    } catch {
      return false;
    }
  }

  /**
   * Fetch proactive daily digest
   */
  public async getWatchDigest(params?: {
    simulated_time?: string;
    quiet_start?: number;
    quiet_end?: number;
  }): Promise<WatchDigestResponse> {
    let path = '/api/watches/digest';
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      const qs = q.toString();
      if (qs) path += `?${qs}`;
    }
    return this.get<WatchDigestResponse>(path);
  }

  /**
   * Check online status via navigator and lightweight /api/health ping
   */
  public async isOnline(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    try {
      const res = await this.health();
      return res?.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
