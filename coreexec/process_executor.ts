import { exec } from "child_process"

export interface ExecOptions {
  timeoutMs?: number
  cwd?: string
  env?: NodeJS.ProcessEnv
}

/**
 * Execute a shell command and return stdout or throw on error.
 * @param command Shell command to run (e.g., "ls -la")
 * @param options Optional execution settings (timeout, cwd, env)
 */
export function execCommand(command: string, options: ExecOptions = {}): Promise<string> {
  const { timeoutMs = 30_000, cwd, env } = options
  return new Promise((resolve, reject) => {
    const proc = exec(command, { timeout: timeoutMs, cwd, env }, (error, stdout, stderr) => {
      if (error) {
        const errMsg = [
          `Command failed: ${command}`,
          stderr || error.message,
        ].join("\n")
        return reject(new Error(errMsg))
      }
      resolve(stdout.trim())
    })

    proc.on("error", err => {
      reject(new Error(`Process error: ${err.message}`))
    })
  })
}
