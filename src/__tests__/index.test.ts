import { describe, it, expect, vi, beforeEach } from "vitest"
import { parseIntent, executeSkill, type ParsedIntent } from "../index.js"

vi.mock("../config.js", () => ({ resolveConfig: vi.fn() }))
vi.mock("../prompts.js", () => ({
  buildReviewPrompt: vi.fn(),
  buildPlanBasedReviewPrompt: vi.fn(),
  buildImplementPrompt: vi.fn(),
}))
vi.mock("../cursor.js", () => ({ runCursorAgent: vi.fn() }))
vi.mock("../output.js", () => ({
  formatEvents: vi.fn(),
  saveToFile: vi.fn(),
}))

import { resolveConfig } from "../config.js"
import { buildReviewPrompt, buildImplementPrompt } from "../prompts.js"
import { runCursorAgent } from "../cursor.js"
import { formatEvents, saveToFile } from "../output.js"

describe("parseIntent", () => {
  it("detects review task from keywords", () => {
    const result = parseIntent("帮我review一下这个文档")
    expect(result.taskType).toBe("review")
  })

  it("detects implement task from keywords", () => {
    const result = parseIntent("让cursor实现登录功能")
    expect(result.taskType).toBe("implement")
  })

  it("extracts file paths", () => {
    const result = parseIntent("review src/auth.ts")
    expect(result.targetFile).toBe("src/auth.ts")
  })

  it("detects plan-based review", () => {
    const result = parseIntent("根据 docs/plan.md 评审代码")
    expect(result.taskType).toBe("review")
    expect(result.planFile).toBe("docs/plan.md")
  })

  it("extracts output file", () => {
    const result = parseIntent("review src/auth.ts 输出到 result.md")
    expect(result.outputFile).toBe("result.md")
  })

  it("handles reversed order in plan-based review", () => {
    const result = parseIntent("评审 src/foo.ts 根据 docs/plan.md")
    expect(result.taskType).toBe("review")
    expect(result.planFile).toBe("docs/plan.md")
    expect(result.targetFile).toBe("src/foo.ts")
  })

  it("extracts root-level filenames", () => {
    const result = parseIntent("review auth.ts")
    expect(result.targetFile).toBe("auth.ts")
  })

  it("extracts README as target file", () => {
    const result = parseIntent("检查 README.md")
    expect(result.targetFile).toBe("README.md")
  })

  it("separates planFile and targetFile when both present", () => {
    const result = parseIntent("根据 docs/api.md 评审 src/auth.ts")
    expect(result.planFile).toBe("docs/api.md")
    expect(result.targetFile).toBe("src/auth.ts")
  })
})

describe("executeSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveConfig).mockReturnValue({ apiKey: "crsr_test" })
    vi.mocked(buildReviewPrompt).mockReturnValue("review prompt")
    vi.mocked(buildImplementPrompt).mockReturnValue("implement prompt")
    vi.mocked(formatEvents).mockReturnValue("formatted result")
  })

  it("executes review task", async () => {
    vi.mocked(runCursorAgent).mockImplementation(async ({ onEvent }) => {
      onEvent({ type: "assistant_delta", text: "Good code" })
      onEvent({ type: "result", status: "FINISHED" })
    })

    const intent: ParsedIntent = {
      taskType: "review",
      targetFile: "src/auth.ts",
      userRequest: "review src/auth.ts",
    }

    const result = await executeSkill(intent, "/workspace")

    expect(resolveConfig).toHaveBeenCalled()
    expect(buildReviewPrompt).toHaveBeenCalledWith("src/auth.ts")
    expect(runCursorAgent).toHaveBeenCalled()
    expect(result).toBe("formatted result")
  })

  it("saves output to file when outputFile is set", async () => {
    vi.mocked(runCursorAgent).mockImplementation(async ({ onEvent }) => {
      onEvent({ type: "result", status: "FINISHED" })
    })

    const intent: ParsedIntent = {
      taskType: "review",
      targetFile: "src/auth.ts",
      outputFile: "result.md",
      userRequest: "review src/auth.ts",
    }

    await executeSkill(intent, "/workspace")

    expect(saveToFile).toHaveBeenCalledWith("formatted result", "result.md")
  })
})
