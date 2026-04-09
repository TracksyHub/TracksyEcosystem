export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number
  retries?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  status?: number
  durationMs?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, timeoutMs, retries } = this.config
    const start = Date.now()
    let attempt = 0
    const maxRetries = retries ?? 1

    while (attempt < maxRetries) {
      attempt++
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs ?? 15_000)

        const res = await fetch(deployEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ contractName, parameters }),
          signal: controller.signal,
        })
        clearTimeout(timer)

        const durationMs = Date.now() - start

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          return { success: false, error: `HTTP ${res.status}: ${text}`, status: res.status, durationMs }
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          status: res.status,
          durationMs,
        }
      } catch (err: any) {
        if (attempt >= maxRetries) {
          return { success: false, error: err?.message || String(err) }
        }
      }
    }

    return { success: false, error: "Deployment failed after retries" }
  }

  async dryRun(): Promise<LaunchResult> {
    try {
      return {
        success: true,
        address: "0xDEADBEEF",
        transactionHash: "0xFAKEHASH",
      }
    } catch {
      return { success: false, error: "Dry run failed" }
    }
  }
}
