export declare class ConfigError extends Error {
    constructor(message: string);
}
export type CursorConfig = {
    apiKey: string;
    defaultModel?: string;
};
export declare function resolveConfig(): CursorConfig;
//# sourceMappingURL=config.d.ts.map