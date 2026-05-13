#!/usr/bin/env node

import { executeSkill, parseIntent } from "../dist/index.js"

function showHelp() {
  console.log(`cursor-agent — Claude Cursor Agent Skill

Usage:
  cursor-agent review <file> [options]
  cursor-agent implement "<prompt>" [options]

Commands:
  review <file>          Review a file (code or document)
  implement "<prompt>"   Implement a feature using TDD

Options:
  --plan <file>          Use a plan/design doc for plan-based review
  --output <file>        Save result to file
  --verbose, -v          Show detailed output
  --cwd <path>           Working directory (default: current)
  --help, -h             Show this help

Examples:
  cursor-agent review src/auth.ts
  cursor-agent review docs/api.md --output review.md
  cursor-agent review --plan docs/design.md
  cursor-agent implement "add JWT auth" --output src/auth.ts
`)
}

function parseArgs(argv) {
  const args = argv.slice(2)
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { help: true }
  }

  const command = args[0]
  const options = {
    command,
    target: "",
    plan: undefined,
    output: undefined,
    verbose: false,
    cwd: process.cwd(),
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--plan") {
      options.plan = args[++i]
      continue
    }
    if (arg === "--output") {
      options.output = args[++i]
      continue
    }
    if (arg === "--cwd") {
      options.cwd = args[++i]
      continue
    }
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true
      continue
    }
    if (!arg.startsWith("-")) {
      options.target = arg
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  try {
    let intent

    if (options.command === "review") {
      const userRequest = options.plan
        ? `根据 ${options.plan} 评审 ${options.target || "代码"}`
        : `review ${options.target}`

      intent = parseIntent(userRequest)
      if (options.output) intent.outputFile = options.output
      if (options.verbose) intent.verbose = true
      if (options.plan) intent.planFile = options.plan
    } else if (options.command === "implement") {
      intent = {
        taskType: "implement",
        userRequest: options.target,
        outputFile: options.output,
        verbose: options.verbose,
      }
    } else {
      console.error(`Unknown command: ${options.command}`)
      showHelp()
      process.exit(1)
    }

    const isImplement = intent.taskType === "implement"

    const result = await executeSkill(intent, options.cwd, (event) => {
      if (!isImplement) return
      if (event.type === "assistant_delta" && event.text) {
        process.stdout.write(event.text)
      }
    })

    if (isImplement) {
      console.log("") // newline after streamed output
      if (intent.outputFile) {
        console.log(`Implementation written by cursor agent.`)
      }
    } else {
      console.log(result)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}

main()
