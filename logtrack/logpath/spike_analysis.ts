export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  rollingAvg?: number
  rollingStd?: number
  zScore?: number
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[], mu?: number): number {
  if (arr.length === 0) return 0
  const m = mu ?? mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length
  return Math.sqrt(variance)
}

/**
 * Detect spikes in trading volume compared to a rolling baseline.
 *
 * @param points           Chronological time series of volumes
 * @param windowSize       Window length for baseline stats
 * @param spikeThreshold   Ratio threshold vs rolling average (e.g., 2.0 = 200%)
 * @param zScoreThreshold  Optional z-score threshold vs rolling std deviation
 * @param minGapMs         Optional minimum time gap between spikes (debounce)
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0,
  zScoreThreshold?: number,
  minGapMs?: number
): SpikeEvent[] {
  const events: SpikeEvent[] = []
  if (points.length === 0 || windowSize <= 0) return events

  const volumes = points.map(p => p.volumeUsd)
  let lastTs = -Infinity

  for (let i = windowSize; i < volumes.length; i++) {
    const window = volumes.slice(i - windowSize, i)
    const avg = mean(window)
    const sd = stddev(window, avg)
    const curr = volumes[i]
    const ratio = avg > 0 ? curr / avg : Infinity
    const z = sd > 0 ? (curr - avg) / sd : Infinity

    const ratioOk = ratio >= spikeThreshold
    const zOk = zScoreThreshold == null ? true : z >= zScoreThreshold
    const gapOk = minGapMs == null || (points[i].timestamp - lastTs) >= minGapMs

    if (ratioOk && zOk && gapOk) {
      events.push({
        timestamp: points[i].timestamp,
        volume: curr,
        spikeRatio: Math.round(ratio * 100) / 100,
        rollingAvg: Math.round(avg * 100) / 100,
        rollingStd: Math.round(sd * 100) / 100,
        zScore: Math.round(z * 100) / 100
      })
      lastTs = points[i].timestamp
    }
  }
  return events
}

/** Quick summary of detected spikes */
export function summarizeSpikes(events: SpikeEvent[]) {
  const count = events.length
  if (count === 0) {
    return { count: 0, maxSpikeRatio: 0, avgSpikeRatio: 0, firstTimestamp: 0, lastTimestamp: 0 }
  }
  const maxSpikeRatio = Math.max(...events.map(e => e.spikeRatio))
  const avgSpikeRatio = Math.round((events.reduce((s, e) => s + e.spikeRatio, 0) / count) * 100) / 100
  return {
    count,
    maxSpikeRatio,
    avgSpikeRatio,
    firstTimestamp: events[0].timestamp,
    lastTimestamp: events[events.length - 1].timestamp
  }
}
