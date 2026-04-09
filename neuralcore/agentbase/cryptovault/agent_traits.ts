export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canHandleDeveloperDocs?: boolean
  canProvideHistoricalData?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  strictJsonMode?: boolean
  allowFallbackAnswers?: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canHandleDeveloperDocs: true,
  canProvideHistoricalData: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  strictJsonMode: true,
  allowFallbackAnswers: false,
}

/**
 * Utility to merge capabilities with defaults
 */
export function createCapabilities(overrides: Partial<AgentCapabilities>): AgentCapabilities {
  return { ...SOLANA_AGENT_CAPABILITIES, ...overrides }
}

/**
 * Utility to merge flags with defaults
 */
export function createFlags(overrides: Partial<AgentFlags>): AgentFlags {
  return { ...SOLANA_AGENT_FLAGS, ...overrides }
}
