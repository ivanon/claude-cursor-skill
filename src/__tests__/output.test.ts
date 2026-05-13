import { describe, it, expect } from "vitest"
import { formatEvents, saveToFile } from "../output.js"
import { type CursorEvent } from "../cursor.js"
import { readFileSync, rmSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("formatEvents", () => {
  it("concatenates assistant_delta text in default mode", () => {
    const events: CursorEvent[] = [
      { type: "assistant_delta", text: "Hello " },
      { type: "assistant_delta", text: "world" },
    ]
    const result = formatEvents(events)
    expect(result).toBe("Hello world")
  })

  it("hides thinking and status in default mode", () => {
    const events: CursorEvent[] = [
      { type: "thinking", text: "analyzing..." },
      { type: "assistant_delta", text: "Result" },
      { type: "status", status: "running" },
    ]
    const result = formatEvents(events)
    expect(result).toBe("Result")
  })

  it("shows tool calls in default mode", () => {
    const events: CursorEvent[] = [
      { type: "assistant_delta", text: "Review:" },
      { type: "tool", name: "read_file", status: "done" },
    ]
    const result = formatEvents(events)
    expect(result).toContain("Review:")
    expect(result).toContain("[tool]")
    expect(result).toContain("read_file")
  })

  it("shows all events in verbose mode", () => {
    const events: CursorEvent[] = [
      { type: "thinking", text: "analyzing" },
      { type: "assistant_delta", text: "OK" },
    ]
    const result = formatEvents(events, { verbose: true })
    expect(result).toContain("[thinking]")
    expect(result).toContain("analyzing")
    expect(result).toContain("OK")
  })
})

describe("saveToFile", () => {
  it("writes content to file", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "output-test-"))
    const filePath = join(tmpDir, "result.md")

    await saveToFile("review result", filePath)

    expect(readFileSync(filePath, "utf8")).toBe("review result")
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it("creates parent directories", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "output-test-"))
    const filePath = join(tmpDir, "nested", "dir", "result.md")

    await saveToFile("content", filePath)

    expect(readFileSync(filePath, "utf8")).toBe("content")
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
