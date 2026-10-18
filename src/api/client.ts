/**
 * HVACHome v2 Typed API Client
 * Connects React frontend to Slim 4 JSON API
 */

import type { Ticket, Correction, Notice, RunSheet, RunSheetBlock, BatchSuggestionResult } from '../../types/domain';

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
    return window.sessionStorage.getItem(this.storageKey);
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

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Network request failed';
      throw new ApiError(`Network error: ${msg}`, 'network_error', 0);
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

    if (payload && 'data' in payload) {
      return payload.data as T;
    }

    return (payload as unknown) as T;
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
    return this.post<BatchSuggestionResult>('/api/run-sheets/suggest-batch', data);
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
