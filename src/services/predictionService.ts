import { callAI } from "./aiProvider";
import { getModelIdForRole } from "./ai";

export interface PredictionResult {
    text: string;
    range?: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    };
}

export class PredictionService {
    private static instance: PredictionService;
    private lastRequestTime: number = 0;
    private debouncedDelay: number = 800; // 800ms debounce

    private constructor() { }

    public static getInstance(): PredictionService {
        if (!PredictionService.instance) {
            PredictionService.instance = new PredictionService();
        }
        return PredictionService.instance;
    }

    /**
     * Get a code completion suggestion (Ghost Text)
     */
    public async getCompletion(
        content: string,
        line: number,
        column: number,
        filePath: string
    ): Promise<string | null> {
        const now = Date.now();
        if (now - this.lastRequestTime < this.debouncedDelay) {
            return null; // Throttle
        }
        this.lastRequestTime = now;

        try {
            const lines = content.split('\n');
            const prefix = lines.slice(0, line - 1).join('\n') + '\n' + lines[line - 1].substring(0, column - 1);
            const suffix = lines[line - 1].substring(column - 1) + '\n' + lines.slice(line).join('\n');

            // Limit context size to avoid massive tokens
            const limitedPrefix = prefix.slice(-2000); // Last 2000 chars
            const limitedSuffix = suffix.slice(0, 500); // Next 500 chars

            const prompt = `You are a code completion engine. Continue the following code.
Return ONLY the code to be inserted at the cursor position. 
Do NOT include any explanations, markdown blocks, or the existing code.

FILE: ${filePath}

CODE BEFORE CURSOR:
${limitedPrefix}

CURSOR POSITION

CODE AFTER CURSOR:
${limitedSuffix}

GHOST TEXT SUGGESTION:`;

            const modelId = getModelIdForRole(); // Usually a fast model for completions
            const result = await callAI(prompt, modelId);

            // Clean result (remove hallucinations or wrapping)
            let cleaned = result.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/```(?:\w+)?\n([\s\S]*?)```/, '$1').trim();
            }

            return cleaned || null;
        } catch (error) {
            console.error("Ghost text prediction failed:", error);
            return null;
        }
    }
}

export const predictionService = PredictionService.getInstance();
