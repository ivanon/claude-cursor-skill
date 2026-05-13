export type CursorEvent = {
    type: "assistant_delta";
    text: string;
} | {
    type: "thinking";
    text: string;
} | {
    type: "tool";
    name: string;
    status: string;
} | {
    type: "status";
    status: string;
    message?: string;
} | {
    type: "task";
    status?: string;
    text?: string;
} | {
    type: "result";
    status: string;
    durationMs?: number;
};
export type RunCursorAgentOptions = {
    apiKey: string;
    prompt: string;
    cwd: string;
    onEvent: (event: CursorEvent) => void;
    timeoutMs?: number;
};
export declare function runCursorAgent(options: RunCursorAgentOptions): Promise<void>;
//# sourceMappingURL=cursor.d.ts.map