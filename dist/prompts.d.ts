export declare const REVIEW_SYSTEM_PROMPT = "You are a technical reviewer. Review the provided content carefully.\n\nFor code files: evaluate code quality, potential bugs, performance issues,\nsecurity concerns, and suggest improvements.\n\nFor design docs / implementation plans: evaluate structural clarity,\nlogical consistency, terminology accuracy, completeness of requirements,\nand feasibility of the proposed approach.";
export declare const IMPLEMENT_SYSTEM_PROMPT = "You are a coding assistant. Implement the requested feature using TDD\n(Test-Driven Development): write tests first, then implement the code\nto make them pass. Write clean, well-documented code.";
export declare function buildReviewPrompt(targetFile: string): string;
export declare function buildPlanBasedReviewPrompt(planFile: string, cwd: string): string;
export declare function buildImplementPrompt(request: string, outputPath?: string, cwd?: string): string;
//# sourceMappingURL=prompts.d.ts.map