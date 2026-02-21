import { parseFile } from "./semanticBrain";

/**
 * 🧪 Test Writer Agent
 * Automatically generates tests for new functions in the background
 */
export class TestWriterAgent {
  private static instance: TestWriterAgent;

  private constructor() {}

  public static getInstance(): TestWriterAgent {
    if (!TestWriterAgent.instance) {
      TestWriterAgent.instance = new TestWriterAgent();
    }
    return TestWriterAgent.instance;
  }

  /**
   * Start watching for code changes and generate tests pro-actively
   */
  public async onFileSaved(filePath: string, content: string) {
    // Skip non-source files or test files
    if (!this.shouldGenerateTest(filePath)) return;

    console.log(`🧪 Test Agent analyzing: ${filePath}`);

    try {
      // 1. Analyze file for symbols
      const analysis = await parseFile(filePath, content);

      // Find functions without tests (simplified check)
      const functions = analysis.symbols.filter((s: any) => s.kind === "function");

      if (functions.length > 0) {
        // In a real system, we would check if .test.ts exists and lacks these test cases
        // For this demo, let's assume we found something new to test
        this.proposeTestGeneration(filePath, functions[0].name);
      }
    } catch (error) {
      console.error("❌ Test Agent analysis failed:", error);
    }
  }

  private shouldGenerateTest(filePath: string): boolean {
    return (
      (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) &&
      !filePath.includes(".test.") &&
      !filePath.includes(".spec.")
    );
  }

  private proposeTestGeneration(filePath: string, functionName: string) {
    console.log(`🤖 Proposing test for ${functionName} in ${filePath}`);

    // Notify UI/Chat via AgentService if needed
    // For now, logged to console as background process
  }

  /**
   * Generate actual test file content using AI
   */
  public async generateTestFile(_filePath: string): Promise<void> {
    // Future implementation: Call AI to generate Vitest code
    // and save it to a new file
  }
}

export const testWriterAgent = TestWriterAgent.getInstance();
