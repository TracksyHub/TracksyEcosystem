export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  timestamp?: number
}

export interface DexSuiteConfig {
  apis: Array<{ name: string; baseUrl: string; apiKey?: string }>
  timeoutMs?: number
  userAgent?: string
}

type ApiDef = { name: string; baseUrl: string; apiKey?: string }

export interface PairComparison {
  bestVolume?: PairInfo
  bestLiquidity?: PairInfo
  bestPrice?: PairInfo
  worstPrice?: PairInfo
  priceSpreadPct?: number
}

export class DexSuite {
  constructor(private config: DexSuiteConfig) {}

  /** Build headers per-request */
  private buildHeaders(api?: ApiDef): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (api?.apiKey) h["Authorization"] = `Bearer ${api.apiKey}`
    if (this.config.userAgent) h["User-Agent"] = this.config.userAgent
    return h
  }

  /** Safe join for base + path */
  private joinUrl(base: string, path: string): string {
    const b = base.endsWith("/") ? base.slice(0, -1) : base
    const p = path.startsWith("/") ? path : `/${path}`
    return `${b}${p}`
  }

  /** Fetch helper with timeout + JSON decoding */
  private async fetchFromApi<T>(api: ApiDef, path: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10_000)
    try {
      const res = await fetch(this.joinUrl(api.baseUrl, path), {
        method: "GET",
        headers: this.buildHeaders(api),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${api.name} ${path} ${res.status}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  /** Normalize raw API response into PairInfo */
  private toPairInfo(api: ApiDef, pairAddress: string, raw: any): PairInfo {
    return {
      exchange: api.name,
      pairAddress,
      baseSymbol: raw?.token0?.symbol ?? raw?.baseSymbol ?? "BASE",
      quoteSymbol: raw?.token1?.symbol ?? raw?.quoteSymbol ?? "QUOTE",
      liquidityUsd: Number(raw?.liquidityUsd ?? raw?.liquidity ?? 0),
      volume24hUsd: Number(raw?.volume24hUsd ?? raw?.volume24h ?? 0),
      priceUsd: Number(raw?.priceUsd ?? raw?.price ?? 0),
      timestamp: typeof raw?.timestamp === "number" ? raw.timestamp : Date.now(),
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const enc = encodeURIComponent(pairAddress)
    const tasks = this.config.apis.map(async api => {
      try {
        const data = await this.fetchFromApi<any>(api, `/pair/${enc}`)
        return this.toPairInfo(api, pairAddress, data)
      } catch {
        return null
      }
    })

    const settled = await Promise.allSettled(tasks)
    const results: PairInfo[] = []
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) results.push(s.value)
    }
    return results
  }

  /** Fetch multiple pairs in one go */
  async getPairsInfo(addresses: string[]): Promise<Record<string, PairInfo[]>> {
    const entries = await Promise.all(
      addresses.map(async addr => [addr, await this.getPairInfo(addr)] as const)
    )
    return Object.fromEntries(entries)
  }

  /**
   * Compare a list of pairs across exchanges, returning the best metrics.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, PairComparison>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        if (infos.length === 0) return [addr, {} as PairComparison] as const

        const bestVolume = infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a), infos[0])
        const bestLiquidity = infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a), infos[0])
        const bestPrice = infos.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a), infos[0])
        const worstPrice = infos.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a), infos[0])

        const priceSpreadPct =
          bestPrice.priceUsd > 0
            ? ((bestPrice.priceUsd - worstPrice.priceUsd) / bestPrice.priceUsd) * 100
            : 0

        const comparison: PairComparison = {
          bestVolume,
          bestLiquidity,
          bestPrice,
          worstPrice,
          priceSpreadPct: Math.round(priceSpreadPct * 100) / 100,
        }
        return [addr, comparison] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /** Compact summary across exchanges for a single pair */
  async summarizePair(pairAddress: string): Promise<{
    exchanges: number
    avgPriceUsd: number
    totalLiquidityUsd: number
    totalVolume24hUsd: number
  }> {
    const infos = await this.getPairInfo(pairAddress)
    if (infos.length === 0) {
      return { exchanges: 0, avgPriceUsd: 0, totalLiquidityUsd: 0, totalVolume24hUsd: 0 }
    }
    const sums = infos.reduce(
      (acc, p) => {
        acc.price += p.priceUsd
        acc.liq += p.liquidityUsd
        acc.vol += p.volume24hUsd
        return acc
      },
      { price: 0, liq: 0, vol: 0 }
    )
    return {
      exchanges: infos.length,
      avgPriceUsd: Math.round((sums.price / infos.length) * 100) / 100,
      totalLiquidityUsd: Math.round(sums.liq * 100) / 100,
      totalVolume24hUsd: Math.round(sums.vol * 100) / 100,
    }
  }
}
