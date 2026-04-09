export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export interface FetchOptions {
  startTime?: number // unix ms
  endTime?: number   // unix ms
  limit?: number
  signal?: AbortSignal
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetch an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string, opts: FetchOptions = {}): Promise<TokenDataPoint[]> {
    const { startTime, endTime, limit, signal } = opts
    const params: string[] = []
    if (startTime) params.push(`start=${encodeURIComponent(Math.floor(startTime / 1000))}`)
    if (endTime) params.push(`end=${encodeURIComponent(Math.floor(endTime / 1000))}`)
    if (limit) params.push(`limit=${encodeURIComponent(limit)}`)
    const qs = params.length ? `?${params.join("&")}` : ""

    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history${qs}`
    const res = await fetch(url, { signal })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Failed to fetch history for ${symbol}: ${res.status} ${text}`)
    }

    const raw = (await res.json()) as any[]
    return raw.map(r => ({
      timestamp: r.time * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
    }))
  }

  /**
   * Fetch the latest data point only.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const data = await this.fetchHistory(symbol, { limit: 1 })
    return data.length ? data[0] : null
  }

  /**
   * Compute basic stats over a token history (avg price, avg volume).
   */
  async fetchStats(symbol: string, opts: FetchOptions = {}): Promise<{ avgPrice: number; avgVolume: number }> {
    const data = await this.fetchHistory(symbol, opts)
    if (data.length === 0) return { avgPrice: 0, avgVolume: 0 }
    const avgPrice = data.reduce((s, p) => s + p.priceUsd, 0) / data.length
    const avgVolume = data.reduce((s, p) => s + p.volumeUsd, 0) / data.length
    return { avgPrice, avgVolume }
  }
}
