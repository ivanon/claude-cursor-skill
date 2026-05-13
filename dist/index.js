import { resolveConfig } from "./config.js";
import { buildReviewPrompt, buildPlanBasedReviewPrompt, buildImplementPrompt, } from "./prompts.js";
import { runCursorAgent } from "./cursor.js";
import { formatEvents, saveToFile } from "./output.js";
export function parseIntent(input) {
    const text = input.toLowerCase();
    const taskType = /review|评审|检查|看看/.test(text) ? "review" : "implement";
    const paths = extractPaths(input);
    const targetFile = paths[0];
    const planFile = /根据|对照|按照|against/.test(text) ? paths[0] : undefined;
    const actualTarget = planFile ? paths[1] : targetFile;
    const outputMatch = input.match(/(?:输出到|保存到|output to)\s+(\S+)/);
    const outputFile = outputMatch?.[1];
    return {
        taskType,
        targetFile: actualTarget,
        planFile,
        outputFile,
        userRequest: input,
    };
}
function extractPaths(text) {
    const matches = text.match(/(?:[\w-]+\/)+[\w.-]+/g) ?? [];
    return matches;
}
export async function executeSkill(intent, cwd) {
    const config = resolveConfig();
    let prompt;
    if (intent.taskType === "review") {
        if (intent.planFile) {
            prompt = buildPlanBasedReviewPrompt(intent.planFile, cwd);
        }
        else if (intent.targetFile) {
            prompt = buildReviewPrompt(intent.targetFile);
        }
        else {
            throw new Error("Review requires a target file or plan file.");
        }
    }
    else {
        prompt = buildImplementPrompt(intent.userRequest, intent.outputFile, cwd);
    }
    const events = [];
    await runCursorAgent({
        apiKey: config.apiKey,
        prompt,
        cwd,
        onEvent: (e) => events.push(e),
    });
    const result = formatEvents(events);
    if (intent.outputFile) {
        await saveToFile(result, intent.outputFile);
    }
    return result;
}
//# sourceMappingURL=index.js.map