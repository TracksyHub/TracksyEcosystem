export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
  tags?: string[]
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number, tags?: string[]): void {
    this.cache.set(key, { key, value, updatedAt: Date.now(), tags })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }

  prune(maxAgeMs: number): void {
    const now = Date.now()
    for (const [k, entry] of this.cache) {
      if (now - entry.updatedAt >= maxAgeMs) {
        this.cache.delete(k)
      }
    }
  }

  getOrSet(key: string, factory: () => number, maxAgeMs: number): MetricEntry {
    const existing = this.cache.get(key)
    if (existing && Date.now() - existing.updatedAt < maxAgeMs) {
      return existing
    }
    const value = factory()
    const entry = { key, value, updatedAt: Date.now() }
    this.cache.set(key, entry)
    return entry
  }
}
