# Claude Cursor Agent Skill

## Project Context

A Claude Code skill that bridges Claude's conversational interface to the Cursor SDK, enabling users to invoke Cursor's coding agent via natural language for code review and TDD-based implementation.

## Architecture

- **Single-shot tasks** — Each command creates a fresh agent, no session persistence
- **Local mode** — Runs against the current workspace (`local: { cwd }`)
- **Smart output** — Concise by default; shows tool calls and errors when relevant
- **Retry with backoff** — Transient errors retry 3x with exponential backoff (1s, 2s, 4s)

## Key Modules

| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point — parse user intent, orchestrate flow |
| `src/cursor.ts` | SDK wrapper — Agent.create, send, stream, timeout, retry |
| `src/config.ts` | API key resolution (env → `~/.cursor-skill/settings.json`) |
| `src/prompts.ts` | Prompt templates for review and TDD implement |
| `src/output.ts` | Result formatting, file I/O |
| `bin/cursor-agent.js` | CLI entry point |

## Task Types

### Review

- **Single-file review:** Review a specific file (code or document)
- **Plan-based review:** Review codebase implementation against a design doc

### Implement (TDD)

- Input: feature description + optional output file path
- Output: Cursor writes files directly to workspace
- System prompt requires TDD: tests first, then implementation

## Configuration

**API Key priority:**
1. `CURSOR_API_KEY` environment variable
2. `~/.cursor-skill/settings.json` (`cursorApiKey` field)
3. Throw ConfigError if missing

**Model selection priority:**
1. `CURSOR_MODEL` environment variable
2. `defaultModel` in `~/.cursor-skill/settings.json`
3. Default `composer-2`

## Error Handling

| Scenario | Handling |
|----------|----------|
| Missing/invalid API key | ConfigError with clear instructions |
| Target file not found | Pre-check before invoking Cursor |
| Cursor execution timeout | 5-minute limit, cancel run, dispose agent |
| Network/transient error | Retry 3x with exponential backoff |
| Non-retryable error (4xx) | Fail immediately |
| Agent.send fails | Dispose agent before re-throwing |
| Stream throws | Dispose agent in finally block |

## CLI Usage

```bash
cursor-agent review <file> [options]
cursor-agent implement "<prompt>" [options]
```

Options: `--plan <file>`, `--output <file>`, `--verbose`, `--cwd <path>`

## Dependencies

- `@cursor/sdk` ^1.0.7 — Cursor agent SDK
- Node.js ≥22
