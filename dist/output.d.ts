import type { CursorEvent } from "./cursor.js";
export type FormatOptions = {
    verbose?: boolean;
};
export declare function formatEvents(events: CursorEvent[], options?: FormatOptions): string;
export declare function saveToFile(content: string, filePath: string): Promise<void>;
//# sourceMappingURL=output.d.ts.map