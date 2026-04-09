import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  token: string
  refreshMs?: number
  apiBase?: string
  targetOrigin?: string
  debug?: boolean
  sandboxAttrs?: string
  allow?: string
  historyLimit?: number
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private intervalId?: number
  private destroyed = false

  constructor(private cfg: DataIframeConfig) {}

  async init() {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    const iframe = document.createElement("iframe")
    iframe.src = this.cfg.iframeUrl
    iframe.style.border = "none"
    iframe.width = "100%"
    iframe.height = "100%"
    if (this.cfg.sandboxAttrs) iframe.setAttribute("sandbox", this.cfg.sandboxAttrs)
    if (this.cfg.allow) iframe.setAttribute("allow", this.cfg.allow)
    iframe.onload = () => this.postTokenData().catch(noop)

    container.appendChild(iframe)
    this.iframe = iframe

    if (this.cfg.refreshMs && this.cfg.refreshMs > 0) {
      this.intervalId = window.setInterval(
        () => this.postTokenData().catch(noop),
        this.cfg.refreshMs
      )
    }
  }

  async postTokenData() {
    if (this.destroyed || !this.iframe?.contentWindow) return
    const base = this.cfg.apiBase ?? new URL(this.cfg.iframeUrl, window.location.href).origin

    try {
      const { TokenDataFetcher } = await import("./tokenDataFetcher")
      const fetcher = new TokenDataFetcher(base)
      const limit = this.cfg.historyLimit && this.cfg.historyLimit > 0 ? this.cfg.historyLimit : undefined
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token, { limit })

      this.iframe.contentWindow.postMessage(
        { type: "TOKEN_DATA", token: this.cfg.token, data },
        this.cfg.targetOrigin ?? "*"
      )

      if (this.cfg.debug) {
        console.log("[TokenDataIframeEmbedder] posted", {
          token: this.cfg.token,
          points: data.length,
          targetOrigin: this.cfg.targetOrigin ?? "*",
        })
      }
    } catch (err) {
      if (this.cfg.debug) console.error("[TokenDataIframeEmbedder] post failed", err)
    }
  }

  updateToken(token: string) {
    this.cfg.token = token
    this.postTokenData().catch(noop)
  }

  destroy() {
    this.destroyed = true
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.iframe?.remove()
    this.iframe = undefined
  }
}

function noop() {}
