# Claude Cursor Agent Skill — Design Spec

## Overview

A Claude Code skill that lets users invoke Cursor's coding agent via natural language. The skill bridges Claude's conversational interface to the Cursor SDK, enabling local code review and TDD-based implementation tasks.

## Goals

- Allow users to say "帮我review一下这个文档" and have Claude invoke Cursor to perform the review
- Support two task types: **review** (document/code review) and **implement** (TDD-based code implementation)
- Output results to the terminal or save to a specified file
- Run in local mode against the current workspace

## Non-Goals

- Cloud agent execution (GitHub-based)
- Interactive multi-turn sessions (single-shot tasks only)
- Web UI or TUI interface

## Architecture

```
User natural language input
    ↓
Claude parses intent → extracts task type, file path, output target
    ↓
Claude calls Cursor SDK (Agent.create + agent.send)
    ↓
Cursor executes in local workspace (read files, write files)
    ↓
Claude receives stream → formats → delivers to user
```

## Task Types

### 1. Review

**User input examples:**
- "帮我review一下这个文档"
- "让cursor评审一下 src/auth.ts"
- "review一下这个PR的代码"

**Cursor system prompt:**
```
You are a code reviewer. Review the following file carefully and provide
detailed feedback on: code quality, potential bugs, performance issues,
security concerns, and suggestions for improvement.
```

**User prompt:**
```
Review the file at: {filePath}
```

**Output:** Cursor's assistant response is formatted and shown to the user. If an output file is specified, the result is saved there.

### 2. Implement (TDD)

**User input examples:**
- "让cursor实现登录功能，输出到 auth.ts"
- "给这个模块加单元测试"
- "implement JWT middleware in src/middleware/jwt.ts"

**Cursor system prompt:**
```
You are a coding assistant. Implement the requested feature using TDD
(Test-Driven Development): write tests first, then implement the code
to make them pass. Write clean, well-documented code.
```

**User prompt:**
```
Implement the following feature: {userRequest}
Output the implementation to: {outputPath}
```

**Output:** Cursor directly modifies/creates files in the workspace. Claude reports which files were changed and shows a summary/diff.

## Intent Parsing

Claude extracts the following from user natural language:

| Field | Description | Example |
|-------|-------------|---------|
| `taskType` | `review` or `implement` | "review" from "帮我review一下" |
| `targetFile` | File to review or base context | "docs/api.md" |
| `outputFile` | Where to save results (optional) | "review-result.md" |
| `userRequest` | The raw implementation request | "给 auth.ts 加 JWT 验证" |

**Parsing rules:**
- Task type is inferred from keywords: "review", "评审", "评审" → `review`; "实现", "implement", "写", "加" → `implement`
- File paths are extracted from the message (regex for path-like strings)
- If no file path is found, the skill uses the file currently active in the Claude Code conversation context
- Output file is extracted after keywords like "输出到", "保存到", "output to"

## Configuration

### API Key

Priority order:
1. Environment variable `CURSOR_API_KEY`
2. Skill config file: `~/.cursor-skill/settings.json`
3. Prompt user to configure if none found

**Config file format:**
```json
{
  "cursorApiKey": "crsr_...",
  "defaultModel": "auto"
}
```

### Model Selection

- Default: `auto` (do not pass `model` to `Agent.create`, let Cursor choose)
- Override via `CURSOR_MODEL` environment variable
- Override via skill settings: `defaultModel` in `~/.cursor-skill/settings.json`

## Data Flow

### SDK Invocation

```typescript
const agent = await Agent.create({
  apiKey,                    // resolved from env or config
  name: "Claude Cursor Skill",
  // model omitted when auto
  local: { cwd: process.cwd() },
})

const run = await agent.send(prompt)

for await (const event of run.stream()) {
  // handle events based on output mode
}

const result = await run.wait()
```

### Stream Event Handling (Smart Output)

| Event Type | Default Behavior | Verbose Mode |
|------------|-----------------|--------------|
| `assistant` | Collect text, output at end | Stream in real-time |
| `thinking` | Hidden | Shown with `[thinking]` prefix |
| `tool_call` | Show summary ("Reading file X") | Show full details |
| `status` | Hidden unless error | Shown |
| `task` | Hidden | Shown |

### Result Delivery

**Review tasks:**
- If no output file: display formatted review in conversation
- If output file specified: save to file, confirm path to user

**Implement tasks:**
- Report files created/modified by Cursor
- Show file path and size
- Optional: show first 50 lines of diff

## Error Handling

| Scenario | Handling |
|----------|----------|
| Missing/invalid API Key | Prompt user to set `CURSOR_API_KEY` or run config |
| Target file not found | Check before invoking Cursor, error early |
| Cursor execution timeout | 5-minute timeout, cancel run, report to user |
| Cursor execution failure | Show error status and message |
| Network error | Retry 3 times, then fail with message |
| Output directory doesn't exist | Create parent directories automatically |

**Timeout:**
```typescript
const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
```

## File Structure

```
claude-cursor-skill/
├── docs/
│   └── design.md              # This document
├── package.json               # Dependencies: @cursor/sdk
├── tsconfig.json
├── src/
│   ├── index.ts               # Entry: parse intent, orchestrate
│   ├── cursor.ts              # SDK wrapper: Agent.create, send, stream
│   ├── config.ts              # API key & settings resolution
│   ├── prompts.ts             # System prompt templates
│   └── output.ts              # Result formatting & file I/O
└── README.md                  # Usage documentation
```

### Module Responsibilities

- `index.ts` — Parse user input, determine task type, call cursor.ts, deliver results
- `cursor.ts` — Create agent, send prompt, stream events with timeout/cancel
- `config.ts` — Read env var and `~/.cursor-skill/settings.json`, validate key
- `prompts.ts` — `buildReviewPrompt(targetFile)`, `buildImplementPrompt(request, outputPath)`
- `output.ts` — Format assistant output, save to file, show diff summary

## Dependencies

- `@cursor/sdk` ^1.0.7 — Cursor agent SDK
- `@types/node` — Node.js type definitions
- `typescript` — TypeScript compiler
- `tsx` — TypeScript execution (dev)

## Future Considerations

- Support cloud mode for GitHub repository workflows
- Interactive mode for follow-up questions after initial task
- Batch review (multiple files in one command)
- Integration with git diff for pre-commit reviews
