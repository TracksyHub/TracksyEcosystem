import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  targetOrigin?: string
  debug?: boolean
  sandboxAttrs?: string
  allow?: string
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private intervalId?: number
  private ready = false

  constructor(private config: IframeConfig) {}

  init(): void {
    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "none"
    if (this.config.sandboxAttrs) iframe.setAttribute("sandbox", this.config.sandboxAttrs)
    if (this.config.allow) iframe.setAttribute("allow", this.config.allow)

    iframe.onload = () => {
      this.ready = true
      this.postMetrics()
      if (this.config.debug) console.log("[TokenAnalysisIframe] loaded")
    }

    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs && this.config.refreshIntervalMs > 0) {
      this.intervalId = window.setInterval(() => this.postMetrics(), this.config.refreshIntervalMs)
    }
  }

  updateMetrics(next: TokenMetrics): void {
    this.config.metrics = next
    if (this.config.debug) console.log("[TokenAnalysisIframe] metrics updated")
    this.postMetrics()
  }

  isReady(): boolean {
    return this.ready && !!this.iframeEl?.contentWindow
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.iframeEl?.remove()
    this.iframeEl = null
    this.ready = false
    if (this.config.debug) console.log("[TokenAnalysisIframe] destroyed")
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    try {
      this.iframeEl.contentWindow.postMessage(
        { type: "TOKEN_ANALYSIS_METRICS", payload: this.config.metrics },
        this.config.targetOrigin ?? "*"
      )
      if (this.config.debug) {
        console.log("[TokenAnalysisIframe] posted metrics", {
          keys: Object.keys(this.config.metrics || {}),
          targetOrigin: this.config.targetOrigin ?? "*",
        })
      }
    } catch (err) {
      if (this.config.debug) console.error("[TokenAnalysisIframe] postMessage failed", err)
    }
  }
}
