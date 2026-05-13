# Claude Cursor Agent Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code skill that bridges natural language commands to the Cursor SDK, enabling single-shot review and TDD-based implementation tasks in the local workspace.

**Architecture:** The skill is a TypeScript Node.js module with five focused files: `config.ts` resolves API keys, `prompts.ts` builds task-specific prompts, `cursor.ts` wraps the Cursor SDK with streaming and timeouts, `output.ts` formats results and handles file I/O, and `index.ts` orchestrates intent parsing and flow control. Each module is developed test-first.

**Tech Stack:** TypeScript, Node.js ≥22, `@cursor/sdk` ^1.0.7, `tsx` for dev execution, Vitest for testing.

---

## File Structure

```
claude-cursor-skill/
├── package.json               # Project config: deps, scripts
├── tsconfig.json              # TypeScript compiler config
├── vitest.config.ts           # Test runner config
├── src/
│   ├── index.ts               # Entry: parse intent, orchestrate flow
│   ├── cursor.ts              # SDK wrapper: Agent.create, send, stream, timeout
│   ├── config.ts              # API key & settings resolution
│   ├── prompts.ts             # System + user prompt templates
│   └── output.ts              # Result formatting, file I/O, diff summary
├── src/__tests__/
│   ├── config.test.ts
│   ├── prompts.test.ts
│   ├── cursor.test.ts
│   ├── output.test.ts
│   └── index.test.ts
└── README.md                  # Usage documentation
```

**Module boundaries:**
- `config.ts` — Pure function: reads env/config, returns resolved key. No side effects except fs read.
- `prompts.ts` — Pure functions: string builders. No external dependencies.
- `output.ts` — File system operations and string formatting. Depends on `node:fs` only.
- `cursor.ts` — Wraps `@cursor/sdk`. Handles Agent lifecycle, streaming, timeout/cancel. The only module that imports `@cursor/sdk`.
- `index.ts` — Orchestrator. Imports all other modules, wires them together.

---

## Tasks

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-cursor-agent-skill",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.9.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@cursor/sdk": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "tsx": "^4.21.0",
    "typescript": "^6.0.3",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Install dependencies**

Run: `pnpm install`

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts
pnpm install  # generates pnpm-lock.yaml
git add pnpm-lock.yaml
git commit -m "chore: initialize project with TypeScript and Vitest"
```

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`
- Create: `src/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { resolveConfig, ConfigError } from "../config.js"
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("resolveConfig", () => {
  let tmpDir: string
  let originalEnv: string | undefined
  let originalHome: string | undefined

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "config-test-"))
    originalEnv = process.env.CURSOR_API_KEY
    originalHome = process.env.HOME
    process.env.HOME = tmpDir
    delete process.env.CURSOR_API_KEY
  })

  afterEach(() => {
    process.env.CURSOR_API_KEY = originalEnv
    process.env.HOME = originalHome
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it("returns key from environment variable when set", () => {
    process.env.CURSOR_API_KEY = "crsr_env_key"
    const config = resolveConfig()
    expect(config.apiKey).toBe("crsr_env_key")
  })

  it("falls back to settings file when env var is missing", () => {
    const settingsDir = join(tmpDir, ".cursor-skill")
    mkdirSync(settingsDir, { recursive: true })
    writeFileSync(
      join(settingsDir, "settings.json"),
      JSON.stringify({ cursorApiKey: "crsr_file_key" })
    )
    const config = resolveConfig()
    expect(config.apiKey).toBe("crsr_file_key")
  })

  it("prefers environment variable over settings file", () => {
    process.env.CURSOR_API_KEY = "crsr_env_key"
    const settingsDir = join(tmpDir, ".cursor-skill")
    mkdirSync(settingsDir, { recursive: true })
    writeFileSync(
      join(settingsDir, "settings.json"),
      JSON.stringify({ cursorApiKey: "crsr_file_key" })
    )
    const config = resolveConfig()
    expect(config.apiKey).toBe("crsr_env_key")
  })

  it("throws ConfigError when no key is found", () => {
    expect(() => resolveConfig()).toThrow(ConfigError)
  })

  it("throws ConfigError for invalid key format", () => {
    process.env.CURSOR_API_KEY = "invalid_key"
    expect(() => resolveConfig()).toThrow(ConfigError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/config.test.ts`
Expected: FAIL — `resolveConfig` and `ConfigError` not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

export type CursorConfig = {
  apiKey: string
  defaultModel?: string
}

export function resolveConfig(): CursorConfig {
  const envKey = process.env.CURSOR_API_KEY?.trim()
  if (envKey) {
    validateKey(envKey)
    return { apiKey: envKey }
  }

  const fileKey = readSettingsFile()
  if (fileKey) {
    validateKey(fileKey)
    return { apiKey: fileKey }
  }

  throw new ConfigError(
    "Cursor API key not found. Set CURSOR_API_KEY environment variable or run `cursor config set api-key <key>`."
  )
}

function validateKey(key: string): void {
  if (!key.startsWith("crsr_")) {
    throw new ConfigError(
      `Invalid Cursor API key format. Key must start with "crsr_".`
    )
  }
}

function readSettingsFile(): string | undefined {
  try {
    const settingsPath = join(homedir(), ".cursor-skill", "settings.json")
    const content = readFileSync(settingsPath, "utf8")
    const settings = JSON.parse(content) as { cursorApiKey?: string }
    return settings.cursorApiKey?.trim()
  } catch {
    return undefined
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/config.test.ts`
Expected: PASS (5/5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/__tests__/config.test.ts
git commit -m "feat(config): add API key resolution with env and file fallback"
```

### Task 3: Prompts Module

**Files:**
- Create: `src/prompts.ts`
- Create: `src/__tests__/prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/prompts.test.ts`
Expected: FAIL — exports not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
export const REVIEW_SYSTEM_PROMPT = `You are a technical reviewer. Review the provided content carefully.

For code files: evaluate code quality, potential bugs, performance issues,
security concerns, and suggest improvements.

For design docs / implementation plans: evaluate structural clarity,
logical consistency, terminology accuracy, completeness of requirements,
and feasibility of the proposed approach.`

export const IMPLEMENT_SYSTEM_PROMPT = `You are a coding assistant. Implement the requested feature using TDD
(Test-Driven Development): write tests first, then implement the code
to make them pass. Write clean, well-documented code.`

export function buildReviewPrompt(targetFile: string): string {
  return [
    REVIEW_SYSTEM_PROMPT,
    "",
    `Review the file at: ${targetFile}`,
  ].join("\n")
}

export function buildPlanBasedReviewPrompt(planFile: string, cwd: string): string {
  return [
    REVIEW_SYSTEM_PROMPT,
    "",
    `Review the codebase implementation against the plan at ${planFile}.`,
    `Start from the repository root ${cwd}. Check that the implementation`,
    `matches the plan, identify deviations, missing features, and suggest fixes.`,
  ].join("\n")
}

export function buildImplementPrompt(
  request: string,
  outputPath?: string,
  cwd?: string
): string {
  const system = IMPLEMENT_SYSTEM_PROMPT

  if (outputPath) {
    return [
      system,
      "",
      `Implement the following feature: ${request}`,
      `Output the implementation to: ${outputPath}`,
    ].join("\n")
  }

  return [
    system,
    "",
    `Implement the following feature: ${request}`,
    `Work in the repository at ${cwd}. Choose appropriate file locations for the`,
    `implementation. Follow existing project conventions.`,
  ].join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/prompts.test.ts`
Expected: PASS (5/5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/prompts.ts src/__tests__/prompts.test.ts
git commit -m "feat(prompts): add review and implement prompt builders"
```

### Task 4: Cursor SDK Wrapper

**Files:**
- Create: `src/cursor.ts`
- Create: `src/__tests__/cursor.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { runCursorAgent, type CursorEvent } from "../cursor.js"

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
    vi.useFakeTimers()
    const events: CursorEvent[] = []

    mockStream.mockImplementation(async function* () {
      await new Promise(() => {}) // never resolves
    })
    mockCancel.mockResolvedValue(undefined)
    mockWait.mockResolvedValue({ status: "CANCELLED" })

    const promise = runCursorAgent({
      apiKey: "crsr_test",
      prompt: "test",
      cwd: "/workspace",
      onEvent: (e) => events.push(e),
      timeoutMs: 100,
    })

    vi.advanceTimersByTime(150)
    await promise

    expect(mockCancel).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/cursor.test.ts`
Expected: FAIL — `runCursorAgent` and `CursorEvent` not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
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
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

export async function runCursorAgent(options: RunCursorAgentOptions): Promise<void> {
  const { apiKey, prompt, cwd, onEvent, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const agent = await Agent.create({
    apiKey,
    name: "Claude Cursor Skill",
    local: { cwd },
  })

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
    await agent[Symbol.asyncDispose]().catch(() => undefined)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/cursor.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cursor.ts src/__tests__/cursor.test.ts
git commit -m "feat(cursor): add SDK wrapper with streaming and timeout"
```

### Task 5: Output Module

**Files:**
- Create: `src/output.ts`
- Create: `src/__tests__/output.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/output.test.ts`
Expected: FAIL — exports not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
import { writeFileSync, mkdirSync } from "node:fs"
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
        if (verbose) lines.push(`[thinking] ${event.text}`)
        break
      case "tool":
        lines.push(`[tool] ${event.name} ${event.status}`)
        break
      case "status":
        if (verbose || isErrorStatus(event.status)) {
          lines.push(`[status] ${event.status}${event.message ? ` ${event.message}` : ""}`)
        }
        break
      case "task":
        if (verbose && (event.text || event.status)) {
          lines.push(`[task] ${[event.status, event.text].filter(Boolean).join(" ")}`)
        }
        break
      case "result":
        if (verbose) {
          lines.push(`[done] status=${event.status}${event.durationMs ? ` duration=${event.durationMs}ms` : ""}`)
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
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, "utf8")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/output.test.ts`
Expected: PASS (6/6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/output.ts src/__tests__/output.test.ts
git commit -m "feat(output): add event formatting and file saving"
```

### Task 6: Entry Point (Index)

**Files:**
- Create: `src/index.ts`
- Create: `src/__tests__/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/__tests__/index.test.ts`
Expected: FAIL — exports not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
import { resolveConfig } from "./config.js"
import {
  buildReviewPrompt,
  buildPlanBasedReviewPrompt,
  buildImplementPrompt,
} from "./prompts.js"
import { runCursorAgent, type CursorEvent } from "./cursor.js"
import { formatEvents, saveToFile } from "./output.js"

export type ParsedIntent = {
  taskType: "review" | "implement"
  targetFile?: string
  planFile?: string
  outputFile?: string
  userRequest: string
}

export function parseIntent(input: string): ParsedIntent {
  const text = input.toLowerCase()

  const taskType = /review|评审|检查|看看/.test(text) ? "review" : "implement"

  const paths = extractPaths(input)
  const targetFile = paths[0]
  const planFile = /根据|对照|按照|against/.test(text) ? paths[0] : undefined
  const actualTarget = planFile ? paths[1] : targetFile

  const outputMatch = input.match(/(?:输出到|保存到|output to)\s+(\S+)/)
  const outputFile = outputMatch?.[1]

  return {
    taskType,
    targetFile: actualTarget,
    planFile,
    outputFile,
    userRequest: input,
  }
}

function extractPaths(text: string): string[] {
  const matches = text.match(/(?:[\w-]+\/)+[\w.-]+/g) ?? []
  return matches
}

export async function executeSkill(
  intent: ParsedIntent,
  cwd: string
): Promise<string> {
  const config = resolveConfig()

  let prompt: string
  if (intent.taskType === "review") {
    if (intent.planFile) {
      prompt = buildPlanBasedReviewPrompt(intent.planFile, cwd)
    } else if (intent.targetFile) {
      prompt = buildReviewPrompt(intent.targetFile)
    } else {
      throw new Error("Review requires a target file or plan file.")
    }
  } else {
    prompt = buildImplementPrompt(intent.userRequest, intent.outputFile, cwd)
  }

  const events: CursorEvent[] = []
  await runCursorAgent({
    apiKey: config.apiKey,
    prompt,
    cwd,
    onEvent: (e) => events.push(e),
  })

  const result = formatEvents(events)

  if (intent.outputFile) {
    await saveToFile(result, intent.outputFile)
  }

  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/__tests__/index.test.ts`
Expected: PASS (7/7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.test.ts
git commit -m "feat(index): add intent parsing and skill orchestration"
```

### Task 7: Integration Verification and Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: PASS (all modules)

- [ ] **Step 2: Run type check**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: `dist/` created with compiled JS and type declarations

- [ ] **Step 4: Verify exports are usable**

Create a quick smoke test file:

```typescript
// scripts/smoke.ts
import { parseIntent, executeSkill } from "../src/index.js"

const intent = parseIntent("review src/index.ts")
console.log("Parsed:", intent)
```

Run: `npx tsx scripts/smoke.ts`
Expected: Prints parsed intent without runtime errors

- [ ] **Step 5: Update README with final usage**

Ensure `README.md` covers:
- Installation (`pnpm install`)
- API key setup (env var or config)
- Usage examples for review and implement
- Supported natural language patterns

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: finalize README and verify integration"
```
