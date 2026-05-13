export declare class ConfigError extends Error {
    constructor(message: string);
}
export declare const DEFAULT_MODEL = "composer-2";
export type CursorConfig = {
    apiKey: string;
    defaultModel: string;
};
export declare function resolveConfig(): CursorConfig;
//# sourceMappingURL=config.d.ts.map