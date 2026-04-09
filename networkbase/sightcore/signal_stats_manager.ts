import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
  avgIntervalMs?: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}
  private intervals: Record<string, number[]> = {}

  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry: AggregatedSignal =
      this.counts[topic] || {
        topic,
        count: 0,
        lastPayload: null,
        lastTimestamp: 0,
        firstTimestamp: timestamp,
      }

    if (entry.lastTimestamp > 0) {
      const delta = timestamp - entry.lastTimestamp
      if (!this.intervals[topic]) this.intervals[topic] = []
      this.intervals[topic].push(delta)
    }

    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp

    if (this.intervals[topic]?.length) {
      const sum = this.intervals[topic].reduce((a, b) => a + b, 0)
      entry.avgIntervalMs = Math.round(sum / this.intervals[topic].length)
    }

    this.counts[topic] = entry
    return entry
  }

  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  getTopTopics(limit = 5): AggregatedSignal[] {
    return Object.values(this.counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  resetTopic(topic: string): void {
    delete this.counts[topic]
    delete this.intervals[topic]
  }

  resetAll(): void {
    this.counts = {}
    this.intervals = {}
  }
}
