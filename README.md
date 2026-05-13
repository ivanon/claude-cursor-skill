# Claude Cursor Agent Skill

A Claude Code skill that lets you invoke Cursor's coding agent via natural language.

## Usage

In Claude Code, simply say:

```
帮我review一下这个文档
```

```
让cursor评审一下 src/auth.ts
```

```
让cursor实现一个JWT中间件，输出到 src/middleware/jwt.ts
```

## Features

- **Review** — Code and document review with detailed feedback
- **Implement (TDD)** — Test-driven development: write tests first, then implementation
- **Smart output** — Clean results by default, shows execution details when relevant

## Setup

### 1. Get a Cursor API Key

Create one from the [Cursor integrations dashboard](https://cursor.com/dashboard/integrations).

### 2. Configure

**Option A: Environment variable**
```bash
export CURSOR_API_KEY="crsr_..."
```

**Option B: Skill config file**
```bash
cursor config set api-key "crsr_..."
```

Config is saved to `~/.cursor-skill/settings.json`.

### 3. Model Selection

Default is `auto` (let Cursor choose). Override:
```bash
export CURSOR_MODEL="composer-3"
```

## Architecture

```
User natural language
    ↓
Claude parses intent → task type, file path, output target
    ↓
Claude calls Cursor SDK (Agent.create + agent.send)
    ↓
Cursor executes in local workspace
    ↓
Claude formats and delivers result
```

## Development

```bash
pnpm install
pnpm dev     # Run with tsx
pnpm build   # Compile TypeScript
```

## License

MIT
