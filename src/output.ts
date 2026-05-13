import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { CursorEvent } from "./cursor.js"

export type FormatOptions = {
  verbose?: boolean
}

export function formatEvents(events: CursorEvent[], options: FormatOptions = {}): string {
  const { verbose = false } = options
  const lines: string[] = []

  for (const event of events) {
    switch (event.type) {
      case "assistant_delta":
        lines.push(event.text)
        break
      case "thinking":
        if (verbose) lines.push(`\n[thinking] ${event.text}\n`)
        break
      case "tool":
        lines.push(`\n[tool] ${event.name} ${event.status}\n`)
        break
      case "status":
        if (verbose || isErrorStatus(event.status)) {
          lines.push(`\n[status] ${event.status}${event.message ? ` ${event.message}` : ""}\n`)
        }
        break
      case "task":
        if (verbose && (event.text || event.status)) {
          lines.push(`\n[task] ${[event.status, event.text].filter(Boolean).join(" ")}\n`)
        }
        break
      case "result":
        if (verbose) {
          lines.push(`\n[done] status=${event.status}${event.durationMs ? ` duration=${event.durationMs}ms` : ""}\n`)
        }
        break
    }
  }

  return lines.join("")
}

function isErrorStatus(status: string): boolean {
  return status === "ERROR" || status === "FAILED" || status === "CANCELLED"
}

export async function saveToFile(content: string, filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
}
