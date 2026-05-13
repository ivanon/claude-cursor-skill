import { describe, it, expect } from "vitest"
import {
  buildReviewPrompt,
  buildPlanBasedReviewPrompt,
  buildImplementPrompt,
  REVIEW_SYSTEM_PROMPT,
  IMPLEMENT_SYSTEM_PROMPT,
} from "../prompts.js"

describe("buildReviewPrompt", () => {
  it("includes the system prompt and target file", () => {
    const result = buildReviewPrompt("docs/api.md")
    expect(result).toContain(REVIEW_SYSTEM_PROMPT)
    expect(result).toContain("docs/api.md")
    expect(result).toContain("Review the file at:")
  })
})

describe("buildPlanBasedReviewPrompt", () => {
  it("includes the plan file and cwd", () => {
    const result = buildPlanBasedReviewPrompt("docs/plan.md", "/workspace")
    expect(result).toContain(REVIEW_SYSTEM_PROMPT)
    expect(result).toContain("docs/plan.md")
    expect(result).toContain("/workspace")
    expect(result).toContain("Review the codebase implementation against the plan")
  })
})

describe("buildImplementPrompt", () => {
  it("includes output path when provided", () => {
    const result = buildImplementPrompt("add auth", "src/auth.ts")
    expect(result).toContain(IMPLEMENT_SYSTEM_PROMPT)
    expect(result).toContain("add auth")
    expect(result).toContain("src/auth.ts")
    expect(result).toContain("Output the implementation to:")
  })

  it("uses cwd-based prompt when no output path", () => {
    const result = buildImplementPrompt("add auth", undefined, "/workspace")
    expect(result).toContain(IMPLEMENT_SYSTEM_PROMPT)
    expect(result).toContain("add auth")
    expect(result).toContain("/workspace")
    expect(result).toContain("Choose appropriate file locations")
    expect(result).not.toContain("Output the implementation to:")
  })
})
