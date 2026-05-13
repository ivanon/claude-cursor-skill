import { writeFileSync, mkdirSync } from "node:fs";
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
                    lines.push(`[thinking] ${event.text}`);
                break;
            case "tool":
                lines.push(`[tool] ${event.name} ${event.status}`);
                break;
            case "status":
                if (verbose || isErrorStatus(event.status)) {
                    lines.push(`[status] ${event.status}${event.message ? ` ${event.message}` : ""}`);
                }
                break;
            case "task":
                if (verbose && (event.text || event.status)) {
                    lines.push(`[task] ${[event.status, event.text].filter(Boolean).join(" ")}`);
                }
                break;
            case "result":
                if (verbose) {
                    lines.push(`[done] status=${event.status}${event.durationMs ? ` duration=${event.durationMs}ms` : ""}`);
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
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf8");
}
//# sourceMappingURL=output.js.map