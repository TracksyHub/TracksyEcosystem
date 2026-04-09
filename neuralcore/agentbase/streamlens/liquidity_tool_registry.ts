import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – extended utilities for advanced liquidity monitoring
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Utility to list available tool keys
 */
export function listLiquidityToolKeys(): string[] {
  return Object.keys(LIQUIDITY_ANALYSIS_TOOLS)
}

/**
 * Utility to check if a tool exists
 */
export function hasLiquidityTool(key: string): boolean {
  return key in LIQUIDITY_ANALYSIS_TOOLS
}

/**
 * Utility to get a specific tool
 */
export function getLiquidityTool(key: string): Toolkit | undefined {
  return LIQUIDITY_ANALYSIS_TOOLS[key]
}
