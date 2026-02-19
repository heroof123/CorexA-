// src/services/symbolSearch.ts
// Symbol search and navigation

import { symbolResolver } from './symbolResolver';
import type { SymbolDefinition } from '../types/ai-native';

export interface SearchResult {
  symbol: string;
  kind: string;
  filePath: string;
  line: number;
  column: number;
  signature?: string;
  score: number;
}

/**
 * Symbol Search
 * Provides fuzzy search and navigation for symbols
 */
export class SymbolSearch {
  private symbolIndex: SymbolDefinition[] = [];

  /**
   * Build symbol index from array
   */
  async buildIndex(symbols: Array<{ name: string; kind: string; filePath: string; line: number }>): Promise<void> {
    this.symbolIndex = symbols.map(s => ({
      symbol: s.name,
      kind: s.kind,
      file_path: s.filePath,
      line: s.line,
      column: 0,
      signature: `${s.kind} ${s.name}`,
      is_exported: true,
    }));
    console.log(`✅ Symbol index built: ${this.symbolIndex.length} symbols`);
  }

  /**
   * Clear symbol index
   */
  clear(): void {
    this.symbolIndex = [];
  }

  /**
   * Initialize from symbol resolver
   */
  async initialize(): Promise<void> {
    // Symbol index is built from symbolResolver when needed
    console.log('✅ SymbolSearch initialized');
  }

  /**
   * 🆕 TASK 14.1: Fuzzy symbol search
   */
  search(query: string, maxResults: number = 50): SearchResult[] {
    if (!query || query.length < 2) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Get all symbols from resolver or local index
    const allSymbols = this.symbolIndex.length > 0 
      ? this.symbolIndex 
      : symbolResolver.findSymbolsByPattern(query);
    
    allSymbols.forEach(def => {
      const score = this.calculateFuzzyScore(def.symbol, lowerQuery);
      
      if (score > 0) {
        results.push({
          symbol: def.symbol,
          kind: def.kind,
          filePath: def.file_path,
          line: def.line,
          column: def.column,
          signature: def.signature,
          score
        });
      }
    });
    
    // 🆕 TASK 14.9: Path-based ranking
    const sortedResults = results
      .sort((a, b) => {
        // First sort by score
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) > 0.1) {
          return scoreDiff;
        }
        
        // If scores are close, prioritize by path match
        const aPathMatch = a.filePath.toLowerCase().includes(lowerQuery);
        const bPathMatch = b.filePath.toLowerCase().includes(lowerQuery);
        
        if (aPathMatch && !bPathMatch) return -1;
        if (!aPathMatch && bPathMatch) return 1;
        
        return 0;
      })
      .slice(0, maxResults);
    
    console.log(`🔍 Found ${sortedResults.length} symbols for query: ${query}`);
    return sortedResults;
  }
  
  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyScore(symbol: string, query: string): number {
    const lowerSymbol = symbol.toLowerCase();
    
    // Exact match
    if (lowerSymbol === query) {
      return 1.0;
    }
    
    // Starts with
    if (lowerSymbol.startsWith(query)) {
      return 0.9;
    }
    
    // Contains
    if (lowerSymbol.includes(query)) {
      return 0.7;
    }
    
    // Fuzzy match (consecutive characters)
    let score = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;
    
    for (let i = 0; i < lowerSymbol.length && queryIndex < query.length; i++) {
      if (lowerSymbol[i] === query[queryIndex]) {
        queryIndex++;
        consecutiveMatches++;
        score += consecutiveMatches * 0.1;
      } else {
        consecutiveMatches = 0;
      }
    }
    
    // All characters matched
    if (queryIndex === query.length) {
      return Math.min(score / query.length, 0.6);
    }
    
    return 0;
  }
  
  /**
   * 🆕 TASK 14.3: Format search result
   */
  formatResult(result: SearchResult): string {
    const fileName = result.filePath.split('/').pop() || result.filePath;
    return `${result.symbol} (${result.kind}) - ${fileName}:${result.line}`;
  }
  
  /**
   * 🆕 TASK 14.5: Type-filtered search
   */
  searchByType(query: string, kind: string, maxResults: number = 50): SearchResult[] {
    const allResults = this.search(query, 1000);
    
    return allResults
      .filter(r => r.kind === kind)
      .slice(0, maxResults);
  }
  
  /**
   * 🆕 TASK 14.7: Handle multiple definitions
   */
  findAllDefinitions(symbolName: string): SearchResult[] {
    // In a real implementation, this would find all definitions across files
    // For now, we use the single definition from SymbolResolver
    const definition = symbolResolver.resolveDefinition(symbolName);
    
    if (!definition) {
      return [];
    }
    
    return [{
      symbol: definition.symbol,
      kind: definition.kind,
      filePath: definition.file_path,
      line: definition.line,
      column: definition.column,
      signature: definition.signature,
      score: 1.0
    }];
  }
  
  /**
   * Get symbol kinds for filtering
   */
  getAvailableKinds(): string[] {
    return [
      'function',
      'class',
      'interface',
      'type',
      'variable',
      'constant',
      'method',
      'property'
    ];
  }
}

// ============================================================================
// Global Instance
// ============================================================================

export const symbolSearch = new SymbolSearch();
