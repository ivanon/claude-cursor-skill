import { Agent } from "@cursor/sdk"

export type CursorEvent =
  | { type: "assistant_delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; status: string }
  | { type: "status"; status: string; message?: string }
  | { type: "task"; status?: string; text?: string }
  | { type: "result"; status: string; durationMs?: number }

export type RunCursorAgentOptions = {
  apiKey: string
  prompt: string
  cwd: string
  onEvent: (event: CursorEvent) => void
  timeoutMs?: number
  model?: string
  verbose?: boolean
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export async function runCursorAgent(options: RunCursorAgentOptions): Promise<void> {
  const { apiKey, prompt, cwd, onEvent, timeoutMs = DEFAULT_TIMEOUT_MS, model } = options

  const agentOptions: Record<string, unknown> = {
    apiKey,
    name: "Claude Cursor Skill",
    local: { cwd },
  }

  if (model && model !== "auto") {
    agentOptions.model = { id: model }
  }

  const agent = await withRetry(() => Agent.create(agentOptions), "Agent.create")

  const run = await withRetry(() => agent.send(prompt), "agent.send")
  const timeoutId = setTimeout(() => {
    if (run.supports("cancel")) {
      run.cancel().catch(() => undefined)
    }
  }, timeoutMs)

  try {
    for await (const event of run.stream()) {
      emitEvent(event, onEvent)
    }

    const result = await run.wait()
    onEvent({
      type: "result",
      status: result.status,
      durationMs: result.durationMs,
    })
  } finally {
    clearTimeout(timeoutId)
    const dispose = agent[Symbol.asyncDispose]
    if (typeof dispose === "function") {
      try {
        await dispose.call(agent)
      } catch {
        // ignore dispose errors
      }
    }
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= MAX_RETRIES || !isRetryableError(error)) {
        break
      }
      await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!)
    }
  }

  throw new Error(`${label} failed after ${MAX_RETRIES + 1} attempts: ${formatError(lastError)}`)
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("enotfound") ||
      /status code 5\d\d/.test(msg) ||
      /\b5xx\b/.test(msg)
    )
  }
  return false
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emitEvent(sdkEvent: unknown, emit: (event: CursorEvent) => void) {
  try {
    const event = sdkEvent as Record<string, unknown>

    switch (event.type) {
      case "assistant": {
        const message = event.message as { content: Array<{ type: string; text?: string }> } | undefined
        if (!Array.isArray(message?.content)) return
        for (const block of message.content) {
          if (block.type === "text" && block.text) {
            emit({ type: "assistant_delta", text: block.text })
          }
        }
        break
      }
      case "thinking": {
        const text = event.text as string
        if (text) emit({ type: "thinking", text })
        break
      }
      case "tool_call": {
        emit({
          type: "tool",
          name: String(event.name ?? "unknown"),
          status: String(event.status ?? "unknown"),
        })
        break
      }
      case "status": {
        emit({
          type: "status",
          status: String(event.status ?? "unknown"),
          message: event.message as string | undefined,
        })
        break
      }
      case "task": {
        emit({
          type: "task",
          status: event.status as string | undefined,
          text: event.text as string | undefined,
        })
        break
      }
    }
  } catch {
    // Silently skip malformed events to avoid interrupting the run
  }
}
