# Claude Cursor Agent Skill

## Project Context

This is a Claude Code skill that bridges Claude's conversational interface to the Cursor SDK, enabling users to invoke Cursor's coding agent via natural language.

## Architecture

- **Single-shot tasks only** — No session persistence, each command creates a fresh agent
- **Local mode** — Runs against the current workspace (`local: { cwd }`)
- **Smart output** — Default concise, shows tool calls and errors when relevant

## Key Modules

| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point — parse user intent, orchestrate flow |
| `src/cursor.ts` | SDK wrapper — Agent.create, send, stream handling |
| `src/config.ts` | API key resolution (env → `~/.cursor-skill/settings.json`) |
| `src/prompts.ts` | System prompt templates for review and TDD implement |
| `src/output.ts` | Result formatting, file I/O, diff summary |

## Task Types

### Review
- System prompt: "You are a code reviewer..."
- Input: file path (from user message or current context)
- Output: formatted review text (displayed or saved to file)

### Implement (TDD)
- System prompt: "You are a coding assistant. Implement using TDD..."
- Input: feature description + optional output file path
- Output: Cursor writes files directly to workspace, Claude reports changes

## Configuration

**API Key priority:**
1. `CURSOR_API_KEY` environment variable
2. `~/.cursor-skill/settings.json`
3. Prompt user if missing

**Model:** Default `auto` (omit model param, let Cursor choose). Override via `CURSOR_MODEL` env var.

## Error Handling

- Missing API key → prompt for configuration
- Missing file → check before invoking Cursor
- Timeout → 5 min limit, cancel run
- Network → retry 3x

## Dependencies

- `@cursor/sdk` ^1.0.7 — Cursor agent SDK
- Node.js ≥22
