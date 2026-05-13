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

  it("reads CURSOR_MODEL from environment variable", () => {
    process.env.CURSOR_API_KEY = "crsr_env_key"
    process.env.CURSOR_MODEL = "composer-3"
    const config = resolveConfig()
    expect(config.defaultModel).toBe("composer-3")
    delete process.env.CURSOR_MODEL
  })

  it("reads defaultModel from settings file", () => {
    const settingsDir = join(tmpDir, ".cursor-skill")
    mkdirSync(settingsDir, { recursive: true })
    writeFileSync(
      join(settingsDir, "settings.json"),
      JSON.stringify({ cursorApiKey: "crsr_file_key", defaultModel: "composer-2" })
    )
    const config = resolveConfig()
    expect(config.defaultModel).toBe("composer-2")
  })

  it("prefers CURSOR_MODEL over settings defaultModel", () => {
    process.env.CURSOR_API_KEY = "crsr_env_key"
    process.env.CURSOR_MODEL = "composer-3"
    const settingsDir = join(tmpDir, ".cursor-skill")
    mkdirSync(settingsDir, { recursive: true })
    writeFileSync(
      join(settingsDir, "settings.json"),
      JSON.stringify({ cursorApiKey: "crsr_file_key", defaultModel: "composer-2" })
    )
    const config = resolveConfig()
    expect(config.defaultModel).toBe("composer-3")
    delete process.env.CURSOR_MODEL
  })

  it("reads defaultModel from settings when env key exists without CURSOR_MODEL", () => {
    process.env.CURSOR_API_KEY = "crsr_env_key"
    const settingsDir = join(tmpDir, ".cursor-skill")
    mkdirSync(settingsDir, { recursive: true })
    writeFileSync(
      join(settingsDir, "settings.json"),
      JSON.stringify({ cursorApiKey: "crsr_file_key", defaultModel: "composer-2" })
    )
    const config = resolveConfig()
    expect(config.defaultModel).toBe("composer-2")
  })
})
