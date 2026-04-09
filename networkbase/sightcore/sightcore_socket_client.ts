export interface SightCoreConfig {
  url: string
  protocols?: string[]
  reconnectIntervalMs?: number        // base delay
  maxReconnectAttempts?: number       // Infinity = no limit
  backoffFactor?: number              // exponential backoff multiplier
  maxBackoffMs?: number               // cap the backoff delay
  heartbeatMs?: number               // send ping every N ms
  debug?: boolean
  queryParams?: Record<string, string | number | boolean> // appended to URL
}

export type SightCoreMessage = {
  topic: string
  payload: any
  timestamp: number
  type?: "ping" | "pong" | "data"
}

type MessageHandler = (msg: SightCoreMessage) => void

export class SightCoreWebSocket {
  private socket?: WebSocket
  private url: string
  private protocols?: string[]
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private backoffFactor: number
  private maxBackoffMs: number
  private heartbeatMs: number
  private debug: boolean
  private queryParams?: Record<string, string | number | boolean>

  private reconnectAttempts = 0
  private heartbeatTimer?: number
  private lastHeartbeatAck = 0
  private destroyed = false

  private onMessageCb?: MessageHandler
  private onOpenCb?: () => void
  private onCloseCb?: () => void
  private onErrorCb?: (err: any) => void

  private sendQueue: string[] = []
  private maxQueue = 100

  constructor(config: SightCoreConfig) {
    this.url = config.url
    this.protocols = config.protocols
    this.reconnectInterval = config.reconnectIntervalMs ?? 5_000
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? Infinity
    this.backoffFactor = config.backoffFactor ?? 1.8
    this.maxBackoffMs = config.maxBackoffMs ?? 60_000
    this.heartbeatMs = config.heartbeatMs ?? 15_000
    this.debug = config.debug ?? false
    this.queryParams = config.queryParams
  }

  connect(
    onMessage: MessageHandler,
    onOpen?: () => void,
    onClose?: () => void,
    onError?: (err: any) => void
  ): void {
    this.onMessageCb = onMessage
    this.onOpenCb = onOpen
    this.onCloseCb = onClose
    this.onErrorCb = onError
    this.openSocket()
  }

  private buildUrl(): string {
    if (!this.queryParams || Object.keys(this.queryParams).length === 0) return this.url
    const u = new URL(this.url, typeof window !== "undefined" ? window.location.href : "http://localhost")
    for (const [k, v] of Object.entries(this.queryParams)) {
      u.searchParams.set(k, String(v))
    }
    return u.toString()
  }

  private openSocket(): void {
    if (this.destroyed) return
    const socketUrl = this.buildUrl()
    this.socket = this.protocols
      ? new WebSocket(socketUrl, this.protocols)
      : new WebSocket(socketUrl)

    this.socket.onopen = () => {
      this.reconnectAttempts = 0
      this.lastHeartbeatAck = Date.now()
      this.flushQueue()
      this.startHeartbeat()
      if (this.debug) console.log("[SightCore] connected")
      this.onOpenCb?.()
    }

    this.socket.onmessage = evt => {
      try {
        const parsed = JSON.parse(evt.data) as SightCoreMessage
        if (parsed?.type === "pong") {
          this.lastHeartbeatAck = Date.now()
          return
        }
        if (parsed && typeof parsed === "object") {
          this.onMessageCb?.(parsed)
        }
      } catch {
        // ignore invalid frames
        if (this.debug) console.warn("[SightCore] non-JSON frame ignored")
      }
    }

    this.socket.onclose = () => {
      if (this.debug) console.log("[SightCore] closed")
      this.stopHeartbeat()
      this.onCloseCb?.()
      this.scheduleReconnect()
    }

    this.socket.onerror = err => {
      if (this.debug) console.error("[SightCore] error", err)
      this.onErrorCb?.(err)
      // let onclose handler manage reconnection
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++

    const delay = Math.min(
      this.reconnectInterval * Math.pow(this.backoffFactor, this.reconnectAttempts - 1),
      this.maxBackoffMs
    )
    if (this.debug) console.log(`[SightCore] reconnect in ${Math.round(delay)}ms (#${this.reconnectAttempts})`)
    setTimeout(() => this.openSocket(), delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    if (!this.heartbeatMs) return
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
      const now = Date.now()
      // if no pong for 3 heartbeats, force reconnect
      if (now - this.lastHeartbeatAck > this.heartbeatMs * 3) {
        if (this.debug) console.warn("[SightCore] heartbeat missed — reconnecting")
        this.socket.close()
        return
      }
      // send ping frame (as JSON message)
      try {
        this.socket.send(JSON.stringify({ type: "ping", timestamp: now }))
      } catch {}
    }, this.heartbeatMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private flushQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    while (this.sendQueue.length) {
      const msg = this.sendQueue.shift()!
      this.socket.send(msg)
    }
  }

  send(topic: string, payload: any): void {
    const msg = JSON.stringify({
      type: "data",
      topic,
      payload,
      timestamp: Date.now(),
    })
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(msg)
      return
    }
    // buffer if not connected yet
    if (this.sendQueue.length >= this.maxQueue) this.sendQueue.shift()
    this.sendQueue.push(msg)
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  disconnect(): void {
    this.destroyed = true
    this.stopHeartbeat()
    this.socket?.close()
    this.socket = undefined
    this.sendQueue = []
    if (this.debug) console.log("[SightCore] disconnected")
  }
}
