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
  const envModel = process.env.CURSOR_MODEL?.trim()

  if (envKey) {
    validateKey(envKey)
    return {
      apiKey: envKey,
      defaultModel: envModel,
    }
  }

  const fileSettings = readSettingsFile()
  if (fileSettings?.apiKey) {
    validateKey(fileSettings.apiKey)
    return {
      apiKey: fileSettings.apiKey,
      defaultModel: envModel ?? fileSettings.defaultModel,
    }
  }

  throw new ConfigError(
    "Cursor API key not found. Set CURSOR_API_KEY environment variable or configure ~/.cursor-skill/settings.json."
  )
}

function validateKey(key: string): void {
  if (!key.startsWith("crsr_")) {
    throw new ConfigError(
      `Invalid Cursor API key format. Key must start with "crsr_".`
    )
  }
}

function readSettingsFile(): { apiKey?: string; defaultModel?: string } | undefined {
  try {
    const settingsPath = join(homedir(), ".cursor-skill", "settings.json")
    const content = readFileSync(settingsPath, "utf8")
    const settings = JSON.parse(content) as {
      cursorApiKey?: string
      defaultModel?: string
    }
    return {
      apiKey: settings.cursorApiKey?.trim(),
      defaultModel: settings.defaultModel?.trim(),
    }
  } catch {
    return undefined
  }
}
