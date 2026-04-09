import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended liquidity toolkit exposing pool data fetch and health analysis,
 * plus registry helpers for discovery and management.
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Get a tool by key.
 */
export function getLiquidityTool(key: string): Toolkit | undefined {
  return EXTENDED_LIQUIDITY_TOOLS[key]
}

/**
 * List all available tool keys.
 */
export function listLiquidityToolKeys(): string[] {
  return Object.keys(EXTENDED_LIQUIDITY_TOOLS)
}

/**
 * Check if a tool is registered.
 */
export function hasLiquidityTool(key: string): boolean {
  return key in EXTENDED_LIQUIDITY_TOOLS
}

/**
 * Run a tool by key with provided input.
 */
export async function runLiquidityTool<T>(key: string, input: unknown): Promise<T | null> {
  const tool = getLiquidityTool(key)
  if (!tool) return null
  try {
    // assuming toolkit exposes `execute`
    // @ts-ignore
    return (await tool.execute(input)) as T
  } catch (err) {
    console.error(`[LiquidityTool][${key}] execution failed`, err)
    return null
  }
}
