import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export function formatEvents(events, options = {}) {
    const { verbose = false } = options;
    const lines = [];
    for (const event of events) {
        switch (event.type) {
            case "assistant_delta":
                lines.push(event.text);
                break;
            case "thinking":
                if (verbose)
                    lines.push(`\n[thinking] ${event.text}\n`);
                break;
            case "tool":
                lines.push(`\n[tool] ${event.name} ${event.status}\n`);
                break;
            case "status":
                if (verbose || isErrorStatus(event.status)) {
                    lines.push(`\n[status] ${event.status}${event.message ? ` ${event.message}` : ""}\n`);
                }
                break;
            case "task":
                if (verbose && (event.text || event.status)) {
                    lines.push(`\n[task] ${[event.status, event.text].filter(Boolean).join(" ")}\n`);
                }
                break;
            case "result":
                if (verbose) {
                    lines.push(`\n[done] status=${event.status}${event.durationMs ? ` duration=${event.durationMs}ms` : ""}\n`);
                }
                break;
        }
    }
    return lines.join("");
}
function isErrorStatus(status) {
    return status === "ERROR" || status === "FAILED" || status === "CANCELLED";
}
export async function saveToFile(content, filePath) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
}
//# sourceMappingURL=output.js.map