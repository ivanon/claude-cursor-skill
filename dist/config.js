import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConfigError";
    }
}
export function resolveConfig() {
    const envKey = process.env.CURSOR_API_KEY?.trim();
    if (envKey) {
        validateKey(envKey);
        return { apiKey: envKey };
    }
    const fileKey = readSettingsFile();
    if (fileKey) {
        validateKey(fileKey);
        return { apiKey: fileKey };
    }
    throw new ConfigError("Cursor API key not found. Set CURSOR_API_KEY environment variable or run `cursor config set api-key <key>`.");
}
function validateKey(key) {
    if (!key.startsWith("crsr_")) {
        throw new ConfigError(`Invalid Cursor API key format. Key must start with "crsr_".`);
    }
}
function readSettingsFile() {
    try {
        const settingsPath = join(homedir(), ".cursor-skill", "settings.json");
        const content = readFileSync(settingsPath, "utf8");
        const settings = JSON.parse(content);
        return settings.cursorApiKey?.trim();
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=config.js.map