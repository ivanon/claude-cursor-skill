import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConfigError";
    }
}
export const DEFAULT_MODEL = "composer-2";
export function resolveConfig() {
    const envKey = process.env.CURSOR_API_KEY?.trim();
    const envModel = process.env.CURSOR_MODEL?.trim();
    const fileSettings = readSettingsFile();
    if (envKey) {
        validateKey(envKey);
        return {
            apiKey: envKey,
            defaultModel: envModel ?? fileSettings?.defaultModel ?? DEFAULT_MODEL,
        };
    }
    if (fileSettings?.apiKey) {
        validateKey(fileSettings.apiKey);
        return {
            apiKey: fileSettings.apiKey,
            defaultModel: envModel ?? fileSettings.defaultModel ?? DEFAULT_MODEL,
        };
    }
    throw new ConfigError("Cursor API key not found. Set CURSOR_API_KEY environment variable or add cursorApiKey to ~/.cursor-skill/settings.json.");
}
function validateKey(key) {
    // NOTE: This prefix check is based on current Cursor API key format.
    // Update this if Cursor changes their key format.
    if (!key.startsWith("crsr_")) {
        throw new ConfigError(`Invalid Cursor API key format. Key must start with "crsr_".`);
    }
}
function readSettingsFile() {
    try {
        const settingsPath = join(homedir(), ".cursor-skill", "settings.json");
        const content = readFileSync(settingsPath, "utf8");
        const settings = JSON.parse(content);
        return {
            apiKey: settings.cursorApiKey?.trim(),
            defaultModel: settings.defaultModel?.trim(),
        };
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=config.js.map