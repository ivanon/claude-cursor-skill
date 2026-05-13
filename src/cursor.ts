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
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

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

  const agent = await Agent.create(agentOptions)

  const run = await agent.send(prompt)
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

function emitEvent(sdkEvent: unknown, emit: (event: CursorEvent) => void) {
  const event = sdkEvent as Record<string, unknown>

  switch (event.type) {
    case "assistant": {
      const message = event.message as { content: Array<{ type: string; text?: string }> }
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
}
