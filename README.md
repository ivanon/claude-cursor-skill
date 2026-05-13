# Claude Cursor Agent Skill

A Claude Code skill that lets you invoke Cursor's coding agent via natural language for code review and TDD-based implementation.

## Features

- **Review** — Code and document review with detailed feedback
- **Plan-based Review** — Review codebase implementation against a design doc
- **Implement (TDD)** — Test-driven development: write tests first, then implementation
- **Smart output** — Clean results by default, shows execution details when relevant

## Installation

### 1. Install CLI

```bash
npm install -g claude-cursor-agent-skill
```

### 2. Register Skill (for Claude Code)

```bash
npx skills add ivanon/claude-cursor-skill -y -g
```

### 3. Configure Cursor API Key

Get a key from the [Cursor integrations dashboard](https://cursor.com/dashboard/integrations).

**Option A: Environment variable**
```bash
export CURSOR_API_KEY="crsr_..."
```

**Option B: Config file**
```bash
mkdir -p ~/.cursor-skill
echo '{"cursorApiKey":"crsr_..."}' > ~/.cursor-skill/settings.json
```

### 4. Model Selection (optional)

Default is `auto` (let Cursor choose). Override via:
```bash
export CURSOR_MODEL="composer-3"
```
Or add `defaultModel` to `~/.cursor-skill/settings.json`.

## CLI Usage

```bash
# Review a file
cursor-agent review src/auth.ts
cursor-agent review docs/api.md --output review.md

# Plan-based review
cursor-agent review --plan docs/design.md

# Implement a feature (TDD)
cursor-agent implement "add JWT auth" --output src/auth.ts

# Verbose output
cursor-agent review src/auth.ts --verbose
```

## Usage in Claude Code

Once the skill is registered, **explicitly mention "cursor"** to trigger it:

```
使用cursor帮我review一下这个文档
```

```
让cursor评审一下 src/auth.ts
```

```
让cursor实现一个JWT中间件，输出到 src/middleware/jwt.ts
```

```
用cursor检查一下这段代码
```

If you don't mention "cursor", Claude will handle the request itself without invoking this skill.

## Development

```bash
npm install
npm run dev       # Run with tsx
npm run build     # Compile TypeScript
echo "npm test"
```

## Project Structure

```
src/
├── index.ts      # Entry: intent parsing and orchestration
├── cursor.ts     # Cursor SDK wrapper (streaming, timeout, retry)
├── config.ts     # API key and model resolution
├── prompts.ts    # Prompt templates for review and implement
└── output.ts     # Result formatting and file I/O

bin/
└── cursor-agent.js  # CLI entry point

SKILL.md          # Claude Code skill definition
```

## License

MIT
