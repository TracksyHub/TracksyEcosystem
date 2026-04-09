export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export interface ClientOptions {
  timeoutMs?: number
  userAgent?: string
}

type Query = Record<string, string | number | boolean | undefined>

/**
 * HTTP client for fetching and managing signals from ArchiNet.
 */
export class SignalApiClient {
  private timeoutMs: number
  private userAgent?: string

  constructor(private baseUrl: string, private apiKey?: string, options: ClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.userAgent = options.userAgent
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    if (this.userAgent) headers["User-Agent"] = this.userAgent
    return headers
  }

  private buildUrl(path: string, query?: Query): string {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl
    const p = path.startsWith("/") ? path : `/${path}`
    if (!query || Object.keys(query).length === 0) return `${base}${p}`
    const u = new URL(`${base}${p}`)
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
    }
    return u.toString()
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...this.buildHeaders(), ...(init.headers || {}) },
        signal: controller.signal,
      })
      const status = res.status
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { success: false, status, error: text || `HTTP ${status}` }
      }
      const data = (await res.json()) as T
      return { success: true, status, data }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    } finally {
      clearTimeout(timer)
    }
  }

  /** List all signals with optional filters/pagination */
  async fetchAllSignals(params?: {
    limit?: number
    cursor?: string
    type?: string
    since?: number // unix ms
    until?: number // unix ms
  }): Promise<ApiResponse<Signal[]>> {
    const url = this.buildUrl("/signals", {
      limit: params?.limit,
      cursor: params?.cursor,
      type: params?.type,
      since: params?.since,
      until: params?.until,
    })
    return this.request<Signal[]>(url, { method: "GET" })
  }

  /** Fetch a single signal by ID */
  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    const url = this.buildUrl(`/signals/${encodeURIComponent(id)}`)
    return this.request<Signal>(url, { method: "GET" })
  }

  /** Create a new signal */
  async createSignal(input: Omit<Signal, "id" | "timestamp"> & Partial<Pick<Signal, "timestamp">>): Promise<ApiResponse<Signal>> {
    const url = this.buildUrl("/signals")
    const body = JSON.stringify({ ...input, timestamp: input.timestamp ?? Date.now() })
    return this.request<Signal>(url, { method: "POST", body })
  }

  /** Update an existing signal (partial) */
  async updateSignal(id: string, patch: Partial<Signal>): Promise<ApiResponse<Signal>> {
    const url = this.buildUrl(`/signals/${encodeURIComponent(id)}`)
    return this.request<Signal>(url, { method: "PATCH", body: JSON.stringify(patch) })
  }

  /** Delete a signal by ID */
  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    const url = this.buildUrl(`/signals/${encodeURIComponent(id)}`)
    return this.request<null>(url, { method: "DELETE" })
  }
}
