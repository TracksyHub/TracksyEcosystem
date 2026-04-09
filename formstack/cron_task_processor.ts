import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

interface ScheduledTask {
  id: string
  name: string
  type: string
  parameters: Record<string, string>
  cron: string
  createdAt: number
}

const scheduledTasks: ScheduledTask[] = []

/**
 * Processes a Typeform webhook payload and schedules a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string; taskId?: string }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues.map(i => i.message).join("; ")}`,
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  if (!isValidCron(scheduleCron)) {
    return { success: false, message: `Invalid cron expression: ${scheduleCron}` }
  }

  const taskId = makeTaskId(taskType)
  const task: ScheduledTask = {
    id: taskId,
    name: taskName.trim(),
    type: taskType,
    parameters,
    cron: scheduleCron.trim(),
    createdAt: Date.now(),
  }

  scheduledTasks.push(task)
  // simulate persistence / enqueue hook
  // console.log("Scheduled:", task)

  return {
    success: true,
    message: `Task "${taskName}" scheduled with ID ${taskId}`,
    taskId,
  }
}

/** Create a readable unique task ID */
function makeTaskId(taskType: string): string {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${taskType}-${ts}-${rand}`
}

/** Very basic cron validation (5 or 6 fields; supports */n) */
function isValidCron(expr: string): boolean {
  const CRON =
    /^(\*|([0-5]?\d)|\*\/\d+)\s+(\*|([01]?\d|2[0-3])|\*\/\d+)\s+(\*|([1-9]|[12]\d|3[01])|\*\/\d+)\s+(\*|(1[0-2]|0?[1-9])|\*\/\d+)\s+(\*|[0-6]|\*\/\d+)(\s+(\*|([12]?\d{1,2})|\*\/\d+))?$/;
  return CRON.test(expr.trim())
}

/** Optional: list tasks (read-only) */
export function listScheduledTasks(): ReadonlyArray<ScheduledTask> {
  return scheduledTasks
}

/** Optional: clear all scheduled tasks (for tests) */
export function clearScheduledTasks(): void {
  scheduledTasks.length = 0
}
