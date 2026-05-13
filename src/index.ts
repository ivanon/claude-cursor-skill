import { existsSync } from "node:fs"
import { resolve } from "node:path"
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
  const planFile = extractPlanFile(input, paths)
  const targetFile = planFile
    ? paths.find((p) => p !== planFile)
    : paths[0]

  const outputMatch = input.match(/(?:输出到|保存到|output to)\s+(\S+)/)
  const outputFile = outputMatch?.[1]

  return {
    taskType,
    targetFile,
    planFile,
    outputFile,
    userRequest: input,
  }
}

function extractPaths(text: string): string[] {
  const matches = text.match(/(?:[\w-]+\/)+[\w.-]+|[\w-]+\.[\w.-]+/g) ?? []
  return matches
}

function extractPlanFile(input: string, paths: string[]): string | undefined {
  const planKeywords = /根据|对照|按照|against/g
  let match: RegExpExecArray | null

  while ((match = planKeywords.exec(input.toLowerCase())) !== null) {
    const keywordPos = match.index + match[0].length
    const afterKeyword = input.slice(keywordPos)
    const firstPathAfter = paths.find((p) => afterKeyword.includes(p))
    if (firstPathAfter) return firstPathAfter
  }

  return undefined
}

export async function executeSkill(
  intent: ParsedIntent,
  cwd: string
): Promise<string> {
  const config = resolveConfig()

  validateFilesExist(intent, cwd)

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
    model: config.defaultModel,
  })

  const result = formatEvents(events)

  if (intent.outputFile) {
    await saveToFile(result, intent.outputFile)
  }

  return result
}

function validateFilesExist(intent: ParsedIntent, cwd: string): void {
  const filesToCheck: string[] = []
  if (intent.targetFile) filesToCheck.push(intent.targetFile)
  if (intent.planFile) filesToCheck.push(intent.planFile)

  for (const file of filesToCheck) {
    const fullPath = resolve(cwd, file)
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${file}`)
    }
  }
}
