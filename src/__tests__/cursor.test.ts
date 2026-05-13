import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { runCursorAgent, isRetryableError, type CursorEvent } from "../cursor.js"

const mockStream = vi.fn()
const mockWait = vi.fn()
const mockCancel = vi.fn()
const mockDispose = vi.fn()
const mockSend = vi.fn()

vi.mock("@cursor/sdk", () => ({
  Agent: {
    create: vi.fn(() =>
      Promise.resolve({
        send: mockSend,
        [Symbol.asyncDispose]: mockDispose,
      })
    ),
  },
}))

describe("runCursorAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({
      stream: mockStream,
      wait: mockWait,
      cancel: mockCancel,
      supports: () => true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("streams assistant text events", async () => {
    const events: CursorEvent[] = []
    mockStream.mockImplementation(async function* () {
      yield {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }],
        },
      }
    })
    mockWait.mockResolvedValue({ status: "FINISHED", durationMs: 1000 })

    await runCursorAgent({
      apiKey: "crsr_test",
      prompt: "test prompt",
      cwd: "/workspace",
      onEvent: (e) => events.push(e),
    })

    const assistantEvents = events.filter((e) => e.type === "assistant_delta")
    expect(assistantEvents).toHaveLength(2)
    expect(assistantEvents[0].text).toBe("Hello ")
    expect(assistantEvents[1].text).toBe("world")
  })

  it("emits result event after completion", async () => {
    const events: CursorEvent[] = []
    mockStream.mockImplementation(async function* () {})
    mockWait.mockResolvedValue({ status: "FINISHED", durationMs: 2000 })

    await runCursorAgent({
      apiKey: "crsr_test",
      prompt: "test",
      cwd: "/workspace",
      onEvent: (e) => events.push(e),
    })

    const resultEvent = events.find((e) => e.type === "result")
    expect(resultEvent).toBeDefined()
    expect(resultEvent?.status).toBe("FINISHED")
    expect(resultEvent?.durationMs).toBe(2000)
  })

  it("times out and cancels the run", async () => {
    const events: CursorEvent[] = []

    // Simulate a run that hangs until cancelled
    let cancelled = false
    mockStream.mockImplementation(async function* () {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    })
    mockCancel.mockImplementation(() => {
      cancelled = true
      return Promise.resolve()
    })
    mockWait.mockResolvedValue({ status: "CANCELLED" })

    await runCursorAgent({
      apiKey: "crsr_test",
      prompt: "test",
      cwd: "/workspace",
      onEvent: (e) => events.push(e),
      timeoutMs: 50,
    })

    expect(mockCancel).toHaveBeenCalled()
  })

  it("does not cancel when run does not support cancellation", async () => {
    mockSend.mockResolvedValue({
      stream: mockStream,
      wait: mockWait,
      cancel: mockCancel,
      supports: (feature: string) => feature !== "cancel",
    })

    mockStream.mockImplementation(async function* () {
      yield { type: "assistant", message: { content: [{ type: "text", text: "OK" }] } }
    })
    mockWait.mockResolvedValue({ status: "FINISHED" })

    await runCursorAgent({
      apiKey: "crsr_test",
      prompt: "test",
      cwd: "/workspace",
      onEvent: () => {},
      timeoutMs: 50,
    })

    expect(mockCancel).not.toHaveBeenCalled()
  })

  it("disposes agent even when stream throws", async () => {
    mockStream.mockImplementation(async function* () {
      throw new Error("Stream error")
    })
    mockWait.mockResolvedValue({ status: "ERROR" })

    await expect(
      runCursorAgent({
        apiKey: "crsr_test",
        prompt: "test",
        cwd: "/workspace",
        onEvent: () => {},
      })
    ).rejects.toThrow()

    expect(mockDispose).toHaveBeenCalled()
  })

  it("disposes agent when agent.send fails after retries", async () => {
    mockSend.mockRejectedValue(new Error("status code 503"))

    await expect(
      runCursorAgent({
        apiKey: "crsr_test",
        prompt: "test",
        cwd: "/workspace",
        onEvent: () => {},
      })
    ).rejects.toThrow()

    expect(mockDispose).toHaveBeenCalledTimes(1)
  }, 10000)
})

describe("isRetryableError", () => {
  it("returns true for timeout errors", () => {
    expect(isRetryableError(new Error("Request timeout"))).toBe(true)
  })

  it("returns true for 5xx status codes", () => {
    expect(isRetryableError(new Error("status code 502"))).toBe(true)
    expect(isRetryableError(new Error("status code 503"))).toBe(true)
    expect(isRetryableError(new Error("status code 500"))).toBe(true)
  })

  it("returns true for 5xx shorthand", () => {
    expect(isRetryableError(new Error("Server returned 5xx"))).toBe(true)
  })

  it("returns false for 4xx errors", () => {
    expect(isRetryableError(new Error("status code 401"))).toBe(false)
    expect(isRetryableError(new Error("status code 404"))).toBe(false)
  })

  it("returns false for unrelated errors containing digit 5", () => {
    expect(isRetryableError(new Error("sha256 mismatch"))).toBe(false)
    expect(isRetryableError(new Error("line 5: syntax error"))).toBe(false)
  })

  it("returns false for non-Error values", () => {
    expect(isRetryableError("timeout")).toBe(false)
    expect(isRetryableError(null)).toBe(false)
  })
})
