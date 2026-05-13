import { Agent } from "@cursor/sdk";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
export async function runCursorAgent(options) {
    const { apiKey, prompt, cwd, onEvent, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const agent = await Agent.create({
        apiKey,
        name: "Claude Cursor Skill",
        local: { cwd },
    });
    const run = await agent.send(prompt);
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
}
function emitEvent(sdkEvent, emit) {
    const event = sdkEvent;
    switch (event.type) {
        case "assistant": {
            const message = event.message;
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
//# sourceMappingURL=cursor.js.map