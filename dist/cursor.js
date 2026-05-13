import { Agent } from "@cursor/sdk";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
export async function runCursorAgent(options) {
    const { apiKey, prompt, cwd, onEvent, timeoutMs = DEFAULT_TIMEOUT_MS, model } = options;
    const agentOptions = {
        apiKey,
        name: "Claude Cursor Skill",
        model: { id: model },
        local: { cwd },
    };
    const agent = await withRetry(() => Agent.create(agentOptions), "Agent.create");
    let run;
    try {
        run = await withRetry(() => agent.send(prompt), "agent.send");
    }
    catch (error) {
        await disposeAgent(agent);
        throw error;
    }
    const timeoutId = setTimeout(() => {
        if (run.supports("cancel")) {
            run.cancel().catch(() => undefined);
        }
    }, timeoutMs);
    try {
        for await (const event of run.stream()) {
            emitEvent(event, onEvent);
        }
        const result = await run.wait();
        onEvent({
            type: "result",
            status: result.status,
            durationMs: result.durationMs,
        });
    }
    finally {
        clearTimeout(timeoutId);
        await disposeAgent(agent);
    }
}
async function disposeAgent(agent) {
    const dispose = agent[Symbol.asyncDispose];
    if (typeof dispose === "function") {
        try {
            await dispose.call(agent);
        }
        catch {
            // ignore dispose errors
        }
    }
}
async function withRetry(fn, label) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt >= MAX_RETRIES || !isRetryableError(error)) {
                break;
            }
            await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1));
        }
    }
    throw new Error(`${label} failed after ${MAX_RETRIES + 1} attempts: ${formatError(lastError)}`);
}
export function isRetryableError(error) {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (msg.includes("timeout") ||
            msg.includes("network") ||
            msg.includes("econnrefused") ||
            msg.includes("econnreset") ||
            msg.includes("enotfound") ||
            /status code 5\d\d/.test(msg) ||
            /\b5xx\b/.test(msg));
    }
    return false;
}
function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function emitEvent(sdkEvent, emit) {
    try {
        const event = sdkEvent;
        switch (event.type) {
            case "assistant": {
                const message = event.message;
                if (!Array.isArray(message?.content))
                    return;
                for (const block of message.content) {
                    if (block.type === "text" && block.text) {
                        emit({ type: "assistant_delta", text: block.text });
                    }
                }
                break;
            }
            case "thinking": {
                const text = event.text;
                if (text)
                    emit({ type: "thinking", text });
                break;
            }
            case "tool_call": {
                emit({
                    type: "tool",
                    name: String(event.name ?? "unknown"),
                    status: String(event.status ?? "unknown"),
                });
                break;
            }
            case "status": {
                emit({
                    type: "status",
                    status: String(event.status ?? "unknown"),
                    message: event.message,
                });
                break;
            }
            case "task": {
                emit({
                    type: "task",
                    status: event.status,
                    text: event.text,
                });
                break;
            }
        }
    }
    catch {
        // Silently skip malformed events to avoid interrupting the run
    }
}
//# sourceMappingURL=cursor.js.map