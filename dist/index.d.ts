export type ParsedIntent = {
    taskType: "review" | "implement";
    targetFile?: string;
    planFile?: string;
    outputFile?: string;
    userRequest: string;
    verbose?: boolean;
};
export declare function parseIntent(input: string): ParsedIntent;
export declare function executeSkill(intent: ParsedIntent, cwd: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map