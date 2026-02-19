// src/services/symbolResolver.ts
// Cross-file symbol resolution and reference tracking

import { saveSymbolIndex, getSymbolIndex } from './aiNativeDB';
import type { SymbolIndex, SymbolDefinition, SymbolReference } from '../types/ai-native';
import type { DependencyGraph } from './semanticBrain';

/**
 * Symbol Resolver
 * Provides cross-file symbol resolution, reference tracking, and circular dependency detection
 */
export class SymbolResolver {
  private symbolIndex: SymbolIndex = {
    definitions: new Map(),
    references: new Map(),
    exports: new Map(),
    imports: new Map(),
  };

  /**
   * Build symbol index from dependency graph
   */
  buildIndex(graph: any): void {
    console.log('🔗 Building symbol index...');
    
    const definitions = new Map<string, SymbolDefinition[]>();
    const references = new Map<string, SymbolReference[]>();
    const exports = new Map<string, SymbolDefinition[]>();

    // First pass: collect all definitions and exports
    for (const [filePath, analysis] of graph.nodes) {
      analysis.symbols.forEach((symbol: any) => {
        // Store definition
        const definition: SymbolDefinition = {
          symbol: symbol.name,
          file_path: filePath,
          line: symbol.line,
          column: symbol.column,
          kind: symbol.kind,
          signature: symbol.signature,
          documentation: symbol.documentation,
        };

        // Use fully qualified name if there are duplicates
        const key = symbol.name;
        const existing = definitions.get(key) || [];
        existing.push(definition);
        definitions.set(key, existing);

        // Track exports
        if (symbol.isExported) {
          const exportList = exports.get(filePath) || [];
          exportList.push(definition);
          exports.set(filePath, exportList);
        }
      });
    }

    // Second pass: collect all references
    for (const [filePath, analysis] of graph.nodes) {
      analysis.symbols.forEach((symbol: any) => {
        // Store references (from dependencies)
        symbol.dependencies.forEach((depName: string) => {
          const refList = references.get(depName) || [];
          refList.push({
            symbol: depName,
            file_path: filePath,
            line: symbol.line,
            column: symbol.column,
            context: symbol.name, // The symbol that references this
          });
          references.set(depName, refList);
        });
      });
    }

    this.symbolIndex = { definitions, references, exports, imports: new Map() };
    
    console.log(`✅ Symbol index built: ${definitions.size} definitions, ${references.size} referenced symbols`);
  }

  /**
   * Resolve symbol definition
   */
  resolveDefinition(symbolName: string): SymbolDefinition | null {
    const defs = this.symbolIndex.definitions.get(symbolName);
    return defs && defs.length > 0 ? defs[0] : null;
  }

  /**
   * Find all references to a symbol
   */
  findReferences(symbolName: string): SymbolReference[] {
    return this.symbolIndex.references.get(symbolName) || [];
  }

  /**
   * Get all exported symbols from a file
   */
  getExports(filePath: string): SymbolDefinition[] {
    return this.symbolIndex.exports.get(filePath) || [];
  }

  /**
   * Get all symbols defined in a file
   */
  getSymbolsInFile(filePath: string): SymbolDefinition[] {
    const symbols: SymbolDefinition[] = [];
    
    for (const [_symbolName, definitions] of this.symbolIndex.definitions) {
      for (const definition of definitions) {
        if (definition.file_path === filePath) {
          symbols.push(definition);
        }
      }
    }
    
    return symbols;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(graph: DependencyGraph): string[][] {
    console.log('🔍 Detecting circular dependencies...');
    
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (filePath: string, path: string[]): void => {
      visited.add(filePath);
      recursionStack.add(filePath);
      path.push(filePath);

      const analysis = graph.nodes.get(filePath);
      if (analysis) {
        // Get unique dependencies
        const uniqueDeps = new Set(analysis.dependencies);
        
        for (const dep of uniqueDeps) {
          // Resolve relative path to absolute
          const resolvedDep = this.resolveImportPath(filePath, dep as string);
          
          if (!visited.has(resolvedDep)) {
            dfs(resolvedDep, [...path]);
          } else if (recursionStack.has(resolvedDep)) {
            // Found cycle
            const cycleStart = path.indexOf(resolvedDep);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart);
              cycle.push(resolvedDep); // Complete the cycle
              cycles.push(cycle);
            }
          }
        }
      }

      recursionStack.delete(filePath);
    };

    for (const filePath of graph.nodes.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    if (cycles.length > 0) {
      console.warn(`⚠️ Found ${cycles.length} circular dependencies`);
    } else {
      console.log('✅ No circular dependencies detected');
    }

    return cycles;
  }

  /**
   * Resolve import path (simplified)
   */
  private resolveImportPath(fromPath: string, importPath: string): string {
    // If it's a relative import, resolve it
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/'));
      let resolved = fromDir;
      let remaining = importPath;

      while (remaining.startsWith('../')) {
        resolved = resolved.substring(0, resolved.lastIndexOf('/'));
        remaining = remaining.substring(3);
      }

      if (remaining.startsWith('./')) {
        remaining = remaining.substring(2);
      }

      return resolved + '/' + remaining;
    }

    // Otherwise, return as-is (external module)
    return importPath;
  }

  /**
   * Get symbol metadata (definition + references)
   */
  getSymbolMetadata(symbolName: string): {
    definition: SymbolDefinition | null;
    references: SymbolReference[];
    referenceCount: number;
  } {
    const definition = this.resolveDefinition(symbolName);
    const references = this.findReferences(symbolName);

    return {
      definition,
      references,
      referenceCount: references.length,
    };
  }

  /**
   * Find symbols by pattern (fuzzy search)
   */
  findSymbolsByPattern(pattern: string): SymbolDefinition[] {
    const lowerPattern = pattern.toLowerCase();
    const results: SymbolDefinition[] = [];

    for (const [symbolName, definitions] of this.symbolIndex.definitions) {
      if (symbolName.toLowerCase().includes(lowerPattern)) {
        results.push(...definitions);
      }
    }

    return results;
  }

  /**
   * Get all symbols of a specific kind
   */
  getSymbolsByKind(kind: string): SymbolDefinition[] {
    const results: SymbolDefinition[] = [];

    for (const definitions of this.symbolIndex.definitions.values()) {
      for (const definition of definitions) {
        if (definition.kind === kind) {
          results.push(definition);
        }
      }
    }

    return results;
  }

  /**
   * Check if a symbol is exported
   */
  isSymbolExported(symbolName: string): boolean {
    const definition = this.resolveDefinition(symbolName);
    if (!definition) return false;
    
    // Check if the definition's file has this symbol in its exports
    const exports = this.symbolIndex.exports.get(definition.file_path) || [];
    return exports.some(exp => exp.symbol === symbolName);
  }

  /**
   * Get dependency chain for a symbol
   */
  getDependencyChain(symbolName: string, graph: DependencyGraph): string[] {
    const definition = this.resolveDefinition(symbolName);
    if (!definition) return [];

    const chain: string[] = [definition.file_path];
    const analysis = graph.nodes.get(definition.file_path);
    
    if (analysis) {
      analysis.dependencies.forEach((dep: string) => {
        const resolvedDep = this.resolveImportPath(definition.file_path, dep);
        if (graph.nodes.has(resolvedDep)) {
          chain.push(resolvedDep);
        }
      });
    }

    return chain;
  }

  /**
   * Persist symbol index to IndexedDB
   */
  async persistIndex(projectPath: string): Promise<void> {
    await saveSymbolIndex(projectPath, this.symbolIndex);
    console.log('💾 Symbol index persisted to IndexedDB');
  }

  /**
   * Load symbol index from IndexedDB
   */
  async loadIndex(projectPath: string): Promise<boolean> {
    const index = await getSymbolIndex(projectPath);
    if (index) {
      this.symbolIndex = index;
      console.log('📂 Symbol index loaded from IndexedDB');
      return true;
    }
    return false;
  }

  /**
   * Clear symbol index
   */
  clear(): void {
    this.symbolIndex = {
      definitions: new Map(),
      references: new Map(),
      exports: new Map(),
      imports: new Map(),
    };
    console.log('🗑️ Symbol index cleared');
  }

  /**
   * Get index statistics
   */
  getStats(): {
    definitionCount: number;
    referenceCount: number;
    exportCount: number;
  } {
    return {
      definitionCount: this.symbolIndex.definitions.size,
      referenceCount: this.symbolIndex.references.size,
      exportCount: this.symbolIndex.exports.size,
    };
  }
}

// ============================================================================
// Global Instance
// ============================================================================

export const symbolResolver = new SymbolResolver();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build symbol index from dependency graph (convenience function)
 */
export function buildSymbolIndex(graph: DependencyGraph): void {
  symbolResolver.buildIndex(graph);
}

/**
 * Resolve symbol definition (convenience function)
 */
export function resolveSymbol(symbolName: string): SymbolDefinition | null {
  return symbolResolver.resolveDefinition(symbolName);
}

/**
 * Find symbol references (convenience function)
 */
export function findSymbolReferences(symbolName: string): SymbolReference[] {
  return symbolResolver.findReferences(symbolName);
}

/**
 * Detect circular dependencies (convenience function)
 */
export function detectCircularDeps(graph: DependencyGraph): string[][] {
  return symbolResolver.detectCircularDependencies(graph);
}
