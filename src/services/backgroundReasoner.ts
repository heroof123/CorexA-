// src/services/backgroundReasoner.ts
// Background code analysis engine - runs async without blocking UI

import { invoke } from '@tauri-apps/api/core';
import { parseFile, type FileAnalysis, type Symbol as SemanticSymbol } from './semanticBrain';
import { saveCodeInsights, getCodeInsights } from './aiNativeDB';
import type { CodeInsight } from '../types/ai-native';
import { agentService } from './agentService';

interface AnalysisTask {
  id: string;
  filePath: string;
  priority: 'high' | 'medium' | 'low';
  type: 'full' | 'incremental';
  timestamp: number;
}

/**
 * Background Reasoning Engine
 * Performs async code analysis without blocking the UI
 */
export class BackgroundReasoner {
  private analysisQueue: AnalysisTask[] = [];
  private isRunning: boolean = false;
  private insightCache: Map<string, CodeInsight[]> = new Map();
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * Start background analysis
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Background reasoner already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Background reasoner started');
    this.processQueue();
  }

  /**
   * Stop background analysis
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Background reasoner stopped');
  }

  /**
   * Queue file for analysis
   * 🆕 TASK 8.11: Task prioritization - current file gets high priority
   */
  queueAnalysis(filePath: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const task: AnalysisTask = {
      id: `${filePath}-${Date.now()}`,
      filePath,
      priority,
      type: 'incremental',
      timestamp: Date.now()
    };

    // Remove existing tasks for same file
    this.analysisQueue = this.analysisQueue.filter(t => t.filePath !== filePath);

    // Insert based on priority
    if (priority === 'high') {
      this.analysisQueue.unshift(task);
    } else {
      this.analysisQueue.push(task);
    }

    console.log(`📋 Queued analysis for ${filePath} (priority: ${priority})`);
  }

  /**
   * Process analysis queue
   * 🆕 TASK 8.13: Error handling with graceful continuation
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      if (this.analysisQueue.length === 0) {
        await this.sleep(1000);
        continue;
      }

      const task = this.analysisQueue.shift()!;

      try {
        console.log(`🔍 Analyzing ${task.filePath}...`);
        const insights = await this.analyzeFile(task.filePath);

        // 🆕 TASK 8.7: Cache insights in memory
        this.insightCache.set(task.filePath, insights);

        // 🆕 TASK 8.9: Emit event for analysis completion
        this.emit('analysis-complete', {
          filePath: task.filePath,
          insights
        });

        // 🆕 TASK 8.5: Persist to IndexedDB
        await this.persistInsights(task.filePath, insights);

        console.log(`✅ Analysis complete for ${task.filePath}: ${insights.length} insights`);

      } catch (error) {
        // 🆕 TASK 8.13: Graceful error handling - log and continue
        console.error(`❌ Analysis failed for ${task.filePath}:`, error);

        // Return empty insights on error
        this.insightCache.set(task.filePath, []);

        this.emit('analysis-error', {
          filePath: task.filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Throttle to avoid CPU overload
      await this.sleep(100);
    }
  }

  /**
   * Analyze single file
   * 🆕 TASK 8.3: Code smell detection
   */
  private async analyzeFile(filePath: string): Promise<CodeInsight[]> {
    const insights: CodeInsight[] = [];

    try {
      // Read file content
      const content = await invoke<string>('read_file', { path: filePath });

      // Parse file with semantic brain
      const analysis = await parseFile(filePath, content);

      // Check complexity for each symbol
      analysis.symbols.forEach(symbol => {
        if (symbol.kind === 'function' || symbol.kind === 'class') {
          const complexity = this.estimateComplexity(symbol);

          if (complexity > 10) {
            insights.push({
              id: `complexity-${filePath}-${symbol.line}-${Date.now()}`,
              file_path: filePath,
              line: symbol.line,
              column: symbol.column,
              severity: 'warning',
              message: `High complexity (${complexity}). Consider refactoring.`,
              type: 'complexity_warning',
              category: 'complexity',
              timestamp: Date.now()
            });
          }

          // 🆕 Trigger Proactive Refactoring suggestion if very high complexity
          if (complexity > 15) {
            agentService.proposeRefactoring(filePath, symbol, complexity);
          }
        }
      });

      // 🆕 TASK 8.3: Detect code smells
      const smells = this.detectCodeSmells(content, analysis);
      insights.push(...smells);

      // 🔮 Phase 4: Intent Analysis
      this.analyzeIntent(content, filePath);

    } catch (error) {
      console.warn(`⚠️ File analysis failed for ${filePath}:`, error);
    }

    return insights;
  }

  /**
   * Estimate cyclomatic complexity
   */
  private estimateComplexity(symbol: SemanticSymbol): number {
    const signature = symbol.signature || '';
    let complexity = 1;

    // Count decision points
    complexity += (signature.match(/if\s*\(/g) || []).length;
    complexity += (signature.match(/else/g) || []).length;
    complexity += (signature.match(/for\s*\(/g) || []).length;
    complexity += (signature.match(/while\s*\(/g) || []).length;
    complexity += (signature.match(/case\s+/g) || []).length;
    complexity += (signature.match(/\&\&/g) || []).length;
    complexity += (signature.match(/\|\|/g) || []).length;
    complexity += (signature.match(/\?/g) || []).length; // Ternary
    complexity += (signature.match(/catch/g) || []).length;

    return complexity;
  }

  /**
   * 🆕 TASK 8.3: Detect code smells
   */
  private detectCodeSmells(content: string, analysis: FileAnalysis): CodeInsight[] {
    const smells: CodeInsight[] = [];
    const lines = content.split('\n');

    analysis.symbols.forEach(symbol => {
      // Long function (> 50 lines)
      if (symbol.kind === 'function') {
        const functionLines = this.estimateFunctionLength(lines, symbol);

        if (functionLines > 50) {
          smells.push({
            id: `smell-long-${analysis.filePath}-${symbol.line}-${Date.now()}`,
            file_path: analysis.filePath,
            line: symbol.line,
            column: symbol.column,
            severity: 'info',
            message: `Long function (${functionLines} lines). Consider breaking it down.`,
            type: 'refactoring_suggestion',
            category: 'smell',
            timestamp: Date.now()
          });
        }
      }

      // Too many parameters (> 5)
      if (symbol.signature) {
        const paramCount = this.countParameters(symbol.signature);

        if (paramCount > 5) {
          smells.push({
            id: `smell-params-${analysis.filePath}-${symbol.line}-${Date.now()}`,
            file_path: analysis.filePath,
            line: symbol.line,
            column: symbol.column,
            severity: 'info',
            message: `Too many parameters (${paramCount}). Consider using an options object.`,
            type: 'refactoring_suggestion',
            category: 'smell',
            timestamp: Date.now()
          });
        }
      }

      // Deeply nested code (> 4 levels)
      const nestingLevel = this.estimateNestingLevel(symbol.signature || '');
      if (nestingLevel > 4) {
        smells.push({
          id: `smell-nesting-${analysis.filePath}-${symbol.line}-${Date.now()}`,
          file_path: analysis.filePath,
          line: symbol.line,
          column: symbol.column,
          severity: 'info',
          message: `Deep nesting (${nestingLevel} levels). Consider extracting functions.`,
          type: 'refactoring_suggestion',
          category: 'smell',
          timestamp: Date.now()
        });
      }
    });

    return smells;
  }

  /**
   * Estimate function length in lines
   */
  private estimateFunctionLength(lines: string[], symbol: SemanticSymbol): number {
    let braceCount = 0;
    let startLine = symbol.line - 1; // 0-indexed
    let endLine = startLine;
    let inFunction = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction && line.includes('{')) {
        inFunction = true;
      }

      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0) {
          endLine = i;
          break;
        }
      }
    }

    return endLine - startLine + 1;
  }

  /**
   * Count function parameters
   */
  private countParameters(signature: string): number {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match || !match[1].trim()) return 0;

    const params = match[1].split(',').filter(p => p.trim().length > 0);
    return params.length;
  }

  /**
   * Estimate nesting level
   */
  private estimateNestingLevel(signature: string): number {
    let maxLevel = 0;
    let currentLevel = 0;

    for (const char of signature) {
      if (char === '{') {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      } else if (char === '}') {
        currentLevel--;
      }
    }

    return maxLevel;
  }

  /**
   * 🔮 Phase 4: Intent Analysis
   * Detects what the user is trying to do based on code patterns
   */
  private analyzeIntent(content: string, filePath: string): void {
    const lastLines = content.split('\n').slice(-10).join('\n');

    // 🧪 Intent: Writing Tests
    if (lastLines.includes('describe(') || lastLines.includes('test(') || lastLines.includes('it(')) {
      this.emit('intent-detected', {
        filePath,
        intent: 'testing',
        confidence: 0.9,
        message: "🧪 Test yazma niyeti tespit edildi. Test Writer Agent daha agresif çalışıyor."
      });
    }

    // 🧹 Intent: Refactoring
    if (lastLines.includes('// refactor') || lastLines.includes('// cleanup')) {
      this.emit('intent-detected', {
        filePath,
        intent: 'refactoring',
        confidence: 0.85,
        message: "🧹 Refactoring niyeti tespit edildi. AI optimizasyon önerileri hazırlıyor."
      });
    }

    // 🚀 Intent: API Integration
    if (lastLines.includes('fetch(') || lastLines.includes('axios.') || lastLines.includes('invoke(')) {
      this.emit('intent-detected', {
        filePath,
        intent: 'integration',
        confidence: 0.8,
        message: "🚀 API entegrasyonu tespit edildi. Güvenlik ve tip kontrolleri aktif."
      });
    }
  }

  /**
   * 🆕 TASK 8.7: Get cached insights
   */
  getInsights(filePath: string): CodeInsight[] {
    return this.insightCache.get(filePath) || [];
  }

  /**
   * 🆕 TASK 8.9: Subscribe to analysis events
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from analysis events
   */
  off(event: string, callback?: (data: any) => void): void {
    if (!callback) {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * 🆕 TASK 8.5: Persist insights to IndexedDB
   */
  private async persistInsights(filePath: string, insights: CodeInsight[]): Promise<void> {
    try {
      await saveCodeInsights(filePath, insights);
    } catch (error) {
      console.error(`Failed to persist insights for ${filePath}:`, error);
    }
  }

  /**
   * Load insights from IndexedDB
   */
  async loadInsights(filePath: string): Promise<CodeInsight[]> {
    try {
      const insights = await getCodeInsights(filePath);
      if (insights) {
        this.insightCache.set(filePath, insights);
        return insights;
      }
    } catch (error) {
      console.error(`Failed to load insights for ${filePath}:`, error);
    }
    return [];
  }

  /**
   * Clear insight cache and analysis queue
   */
  clearCache(): void {
    this.insightCache.clear();
    this.analysisQueue = [];
    console.log('🗑️ Insight cache cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    isRunning: boolean;
    cachedFiles: number;
  } {
    return {
      queueLength: this.analysisQueue.length,
      isRunning: this.isRunning,
      cachedFiles: this.insightCache.size
    };
  }

  /**
   * Get statistics (alias for getQueueStatus for StatusBar compatibility)
   */
  getStats(): {
    queueLength: number;
    isRunning: boolean;
    cachedFiles: number;
  } {
    return this.getQueueStatus();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Global Instance
// ============================================================================

export const backgroundReasoner = new BackgroundReasoner();
