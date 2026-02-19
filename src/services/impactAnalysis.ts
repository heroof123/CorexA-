// src/services/impactAnalysis.ts
// Impact analysis for code changes

import { symbolResolver } from './symbolResolver';
import type { FileAnalysis } from './semanticBrain';

export interface ImpactResult {
  filePath: string;
  impactScore: number;
  directDependents: string[];
  transitiveDependents: string[];
  affectedSymbols: string[];
  isHighRisk: boolean;
  affectsAPI: boolean;
}

/**
 * Impact Analysis
 * Analyzes the impact of code changes across the codebase
 */
export class ImpactAnalysis {
  private semanticCache: Map<string, FileAnalysis> = new Map();
  private isInitialized = false;

  /**
   * Initialize impact analysis
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('✅ ImpactAnalysis initialized');
    this.isInitialized = true;
  }

  /**
   * Set semantic cache (from smartContextBuilder)
   */
  setSemanticCache(cache: Map<string, FileAnalysis>): void {
    this.semanticCache = cache;
  }

  /**
   * 🆕 TASK 16.1: Calculate impact score
   */
  calculateImpactScore(filePath: string): number {
    const analysis = this.semanticCache.get(filePath);
    if (!analysis) {
      return 0;
    }

    // 🆕 TASK 16.2: Count direct and transitive dependents
    const directDependents = analysis.dependents?.length || 0;
    const transitiveDependents = this.getTransitiveDependents(filePath);

    // Impact score = direct + (transitive * 0.5)
    const impactScore = directDependents + (transitiveDependents.size * 0.5);

    return impactScore;
  }

  /**
   * 🆕 TASK 16.2: Get transitive dependents
   */
  private getTransitiveDependents(filePath: string): Set<string> {
    const transitive = new Set<string>();
    const visited = new Set<string>();

    const collectTransitive = (path: string, depth: number) => {
      if (depth > 3 || visited.has(path)) return;
      visited.add(path);

      const pathAnalysis = this.semanticCache.get(path);
      if (pathAnalysis && pathAnalysis.dependents) {
        pathAnalysis.dependents.forEach(dependent => {
          if (dependent !== filePath) {
            transitive.add(dependent);
            collectTransitive(dependent, depth + 1);
          }
        });
      }
    };

    const analysis = this.semanticCache.get(filePath);
    if (analysis && analysis.dependents) {
      analysis.dependents.forEach(dep => collectTransitive(dep, 1));
    }

    return transitive;
  }

  /**
   * 🆕 TASK 16.3: Analyze impact with separation
   */
  analyzeImpact(filePath: string): ImpactResult {
    const analysis = this.semanticCache.get(filePath);

    if (!analysis) {
      return {
        filePath,
        impactScore: 0,
        directDependents: [],
        transitiveDependents: [],
        affectedSymbols: [],
        isHighRisk: false,
        affectsAPI: false
      };
    }

    const directDependents = analysis.dependents || [];
    const transitiveDependents = Array.from(this.getTransitiveDependents(filePath));
    const impactScore = this.calculateImpactScore(filePath);

    // 🆕 TASK 16.5: Identify affected symbols
    const affectedSymbols = this.getAffectedSymbols(filePath);

    // 🆕 TASK 16.7: Check if affects API
    const affectsAPI = this.affectsAPI(filePath);

    // 🆕 TASK 16.9: High-risk warning (impact score > 10)
    const isHighRisk = impactScore > 10;

    return {
      filePath,
      impactScore,
      directDependents,
      transitiveDependents,
      affectedSymbols,
      isHighRisk,
      affectsAPI
    };
  }

  /**
   * Analyze file impact (alias for analyzeImpact)
   */
  async analyzeFileImpact(filePath: string): Promise<ImpactResult> {
    return this.analyzeImpact(filePath);
  }

  /**
   * 🆕 TASK 16.5: Get affected symbols (symbols referenced by other files)
   */
  private getAffectedSymbols(filePath: string): string[] {
    const symbols: string[] = [];

    // Get all exported symbols from this file
    const exports = symbolResolver.getExports(filePath);

    // Check which ones are referenced
    exports.forEach(symbolDef => {
      const references = symbolResolver.findReferences(symbolDef.symbol);
      if (references.length > 0) {
        symbols.push(symbolDef.symbol);
      }
    });

    return symbols;
  }

  /**
   * 🆕 TASK 16.7: Check if changes affect exported API
   */
  private affectsAPI(filePath: string): boolean {
    const exports = symbolResolver.getExports(filePath);

    // If file has exports that are referenced, it affects API
    return exports.some(symbolDef => {
      const references = symbolResolver.findReferences(symbolDef.symbol);
      return references.length > 0;
    });
  }

  /**
   * 🆕 TASK 16.11: Get refactoring context (all impacted files)
   */
  getRefactoringContext(filePath: string): string[] {
    const result = this.analyzeImpact(filePath);

    // Include the file itself + all dependents
    const allFiles = [
      filePath,
      ...result.directDependents,
      ...result.transitiveDependents
    ];

    // Remove duplicates
    return Array.from(new Set(allFiles));
  }

  /**
   * Format impact result for display
   */
  formatImpactResult(result: ImpactResult): string {
    let output = `📊 Impact Analysis for ${result.filePath}\n\n`;

    output += `Impact Score: ${result.impactScore.toFixed(1)}\n`;
    output += `Direct Dependents: ${result.directDependents.length}\n`;
    output += `Transitive Dependents: ${result.transitiveDependents.length}\n`;
    output += `Affected Symbols: ${result.affectedSymbols.join(', ')}\n`;

    if (result.isHighRisk) {
      output += `\n⚠️ HIGH RISK: This file has high impact (${result.impactScore.toFixed(1)} > 10)\n`;
    }

    if (result.affectsAPI) {
      output += `\n🔌 AFFECTS API: Changes will impact exported symbols\n`;
    }

    return output;
  }
}


// ============================================================================
// Global Instance
// ============================================================================

export const impactAnalysis = new ImpactAnalysis();
