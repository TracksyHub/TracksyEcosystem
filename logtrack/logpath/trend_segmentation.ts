export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  durationMs: number
  points: number
  minPrice?: number
  maxPrice?: number
  slopePerMs?: number
}

export interface TrendOptions {
  minSegmentLength?: number
  smoothWindow?: number // simple moving average window (in points) applied before analysis
  minAbsChangePct?: number // require absolute % change to be at least this to classify non-neutral
}

/**
 * Analyze a series of price points to determine overall trend segments.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  return analyzePriceTrendsWithOptions(points, { minSegmentLength })
}

/**
 * Extended analyzer with smoothing and minimum absolute change filter.
 */
export function analyzePriceTrendsWithOptions(
  points: PricePoint[],
  opts: TrendOptions = {}
): TrendResult[] {
  const minSegmentLength = opts.minSegmentLength ?? 5
  if (points.length < minSegmentLength) return []

  const series = (opts.smoothWindow && opts.smoothWindow > 1)
    ? smooth(points, opts.smoothWindow)
    : points

  const results: TrendResult[] = []
  let segStart = 0

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].priceUsd
    const curr = series[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    if (
      i - segStart >= minSegmentLength &&
      (i === series.length - 1 ||
        (direction === 1 && series[i + 1].priceUsd < curr) ||
        (direction === -1 && series[i + 1].priceUsd > curr))
    ) {
      const start = series[segStart]
      const end = series[i]
      const changePct = pctChange(start.priceUsd, end.priceUsd)
      const durationMs = end.timestamp - start.timestamp
      const slice = series.slice(segStart, i + 1)
      const minPrice = Math.min(...slice.map(p => p.priceUsd))
      const maxPrice = Math.max(...slice.map(p => p.priceUsd))
      const slopePerMs = durationMs > 0 ? (end.priceUsd - start.priceUsd) / durationMs : 0

      const absMin = opts.minAbsChangePct ?? 0
      const trend: TrendResult["trend"] =
        Math.abs(changePct) < absMin
          ? "neutral"
          : changePct > 0
          ? "upward"
          : "downward"

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend,
        changePct: round2(changePct),
        durationMs,
        points: i - segStart + 1,
        minPrice,
        maxPrice,
        slopePerMs,
      })
      segStart = i
    }
  }
  return results
}

/** Optional helper: summarize trends */
export function summarizeTrends(results: TrendResult[]) {
  const total = results.length
  const counts = {
    upward: results.filter(r => r.trend === "upward").length,
    downward: results.filter(r => r.trend === "downward").length,
    neutral: results.filter(r => r.trend === "neutral").length,
  }
  const avgChange = total
    ? round2(results.reduce((s, r) => s + r.changePct, 0) / total)
    : 0
  return { total, ...counts, avgChange }
}

/* -------------------- utils -------------------- */

function pctChange(a: number, b: number): number {
  if (!isFinite(a) || a === 0 || !isFinite(b)) return 0
  return ((b - a) / a) * 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** simple moving average smoothing over price, preserves timestamps */
function smooth(points: PricePoint[], window: number): PricePoint[] {
  const w = Math.max(1, Math.floor(window))
  if (w <= 1 || points.length < w) return points.slice()
  const out: PricePoint[] = []
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    sum += points[i].priceUsd
    if (i >= w) sum -= points[i - w].priceUsd
    const avg = i >= w - 1 ? sum / w : points[i].priceUsd
    out.push({ timestamp: points[i].timestamp, priceUsd: avg })
  }
  return out
}
