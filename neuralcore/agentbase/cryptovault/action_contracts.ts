import { z } from "zod"

/**
 * Base types for any action.
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  ok: boolean
  notice: string
  data?: T
  meta?: Record<string, unknown>
  error?: unknown
}

export type ActionSuccess<T> = Required<Pick<ActionResponse<T>, "ok" | "notice" | "data">> &
  Omit<ActionResponse<T>, "data" | "ok"> & { ok: true }

export type ActionFailure = Required<Pick<ActionResponse<never>, "ok" | "notice">> &
  Omit<ActionResponse<never>, "ok"> & { ok: false; error?: unknown }

export type AnyActionResponse<T> = ActionSuccess<T> | ActionFailure

export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  readonly id: string
  readonly summary: string
  readonly input: S
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<AnyActionResponse<R>>
}

/**
 * Helpers
 */
export type InferInput<A extends BaseAction<any, any, any>> = z.infer<A["input"]>
export type InferResult<A extends BaseAction<any, any, any>> = A extends BaseAction<any, infer R, any> ? R : never

export function makeSuccess<T>(
  notice: string,
  data: T,
  meta?: Record<string, unknown>
): ActionSuccess<T> {
  return { ok: true, notice, data, meta }
}

export function makeFailure(
  notice: string,
  error?: unknown,
  meta?: Record<string, unknown>
): ActionFailure {
  return { ok: false, notice, error, meta }
}

/**
 * Validate arbitrary payloads against a schema.
 */
export function validatePayload<S extends ActionSchema>(
  schema: S,
  payload: unknown
): { ok: true; value: z.infer<S> } | { ok: false; issues: string[] } {
  const parsed = schema.safeParse(payload)
  if (parsed.success) return { ok: true, value: parsed.data }
  return { ok: false, issues: parsed.error.issues.map(i => i.message) }
}

/**
 * Narrow a generic response into success/failure at runtime.
 */
export function isSuccess<T>(resp: AnyActionResponse<T>): resp is ActionSuccess<T> {
  return resp.ok === true
}

export function isFailure<T>(resp: AnyActionResponse<T>): resp is ActionFailure {
  return resp.ok === false
}
