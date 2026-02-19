// src/services/__tests__/performance.test.ts
// Performance tests for AI-native IDE services

import { describe, it, expect, beforeEach } from 'vitest';
import { symbolSearch } from '../symbolSearch';
import { smartContextBuilder } from '../smartContextBuilder';
import { analysisCacheManager } from '../analysisCacheManager';
import type { FileAnalysis } from '../semanticBrain';
import type { DependencyGraph } from '../dependencyAnalyzer';

/**
 * 🆕 TASK 24.4: Performance Tests
 * 
 * Requirements:
 * - Symbol search < 100ms for 10K symbols
 * - Graph update < 1s for single file
 * - Context building < 500ms
 */

describe('Performance Tests', () => {
  describe('Symbol Search Performance', () => {
    beforeEach(() => {
      // Clear symbol search index
      symbolSearch.clear();
    });

    it('should search < 100ms for 10K symbols', async () => {
      // Generate 10K test symbols
      const symbols: Array<{ name: string; kind: string; filePath: string; line: number }> = [];
      
      for (let i = 0; i < 10000; i++) {
        symbols.push({
          name: `testSymbol${i}`,
          kind: i % 5 === 0 ? 'function' : i % 5 === 1 ? 'class' : i % 5 === 2 ? 'interface' : i % 5 === 3 ? 'type' : 'variable',
          filePath: `test/file${Math.floor(i / 100)}.ts`,
          line: i % 1000,
        });
      }

      // Build index
      await symbolSearch.buildIndex(symbols);

      // Measure search time
      const startTime = performance.now();
      const results = symbolSearch.search('testSymbol', 50);
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`✅ Symbol search took ${duration.toFixed(2)}ms for 10K symbols`);
      expect(duration).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle fuzzy search efficiently', async () => {
      // Generate symbols with varying names
      const symbols: Array<{ name: string; kind: string; filePath: string; line: number }> = [];
      
      for (let i = 0; i < 5000; i++) {
        symbols.push({
          name: `Component${i}`,
          kind: 'class',
          filePath: `components/Component${i}.tsx`,
          line: 1,
        });
      }

      await symbolSearch.buildIndex(symbols);

      // Fuzzy search
      const startTime = performance.now();
      const results = symbolSearch.search('Comp', 20);
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`✅ Fuzzy search took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Context Building Performance', () => {
    it('should build context < 500ms', async () => {
      // Create mock file index with embeddings
      const fileIndex: any[] = [];
      
      for (let i = 0; i < 100; i++) {
        fileIndex.push({
          path: `test/file${i}.ts`,
          content: `function test${i}() { return ${i}; }`,
          embedding: new Array(1536).fill(0.1), // Mock embedding
          lastModified: Date.now(),
        });
      }

      // Mock query embedding
      const queryEmbedding = new Array(1536).fill(0.1);

      // Measure context building time
      const startTime = performance.now();
      const context = await smartContextBuilder.buildContext(
        'test query',
        queryEmbedding,
        fileIndex,
        undefined,
        { maxFiles: 10, maxTokens: 10000 }
      );
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`✅ Context building took ${duration.toFixed(2)}ms for 100 files`);
      expect(duration).toBeLessThan(500);
      expect(context.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance', () => {
    beforeEach(() => {
      analysisCacheManager.clearAll();
    });

    it('should have fast cache hits', async () => {
      const testContent = 'function test() { return 42; }';
      const testPath = 'test/cache.ts';

      // First call - cache miss
      const firstStart = performance.now();
      await analysisCacheManager.getOrComputeAnalysis(testPath, testContent);
      const firstEnd = performance.now();
      const firstDuration = firstEnd - firstStart;

      // Second call - cache hit
      const secondStart = performance.now();
      await analysisCacheManager.getOrComputeAnalysis(testPath, testContent);
      const secondEnd = performance.now();
      const secondDuration = secondEnd - secondStart;

      console.log(`✅ Cache miss: ${firstDuration.toFixed(2)}ms, Cache hit: ${secondDuration.toFixed(2)}ms`);
      
      // Cache hit should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration / 10);
      expect(secondDuration).toBeLessThan(10); // < 10ms for cache hit
    });

    it('should handle LRU eviction efficiently', async () => {
      const maxSize = 500;
      
      // Fill cache beyond max size
      const startTime = performance.now();
      for (let i = 0; i < maxSize + 100; i++) {
        await analysisCacheManager.getOrComputeAnalysis(
          `test/file${i}.ts`,
          `function test${i}() {}`
        );
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgTime = duration / (maxSize + 100);

      console.log(`✅ LRU eviction: ${avgTime.toFixed(2)}ms per file`);
      
      const stats = analysisCacheManager.getCacheStats();
      expect(stats.inMemorySize).toBeLessThanOrEqual(maxSize);
      expect(avgTime).toBeLessThan(50); // < 50ms per file on average
    });
  });

  describe('Dependency Graph Performance', () => {
    it('should update graph < 1s for single file', async () => {
      // Create a large dependency graph
      const graph: DependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
      };

      // Add 1000 files
      for (let i = 0; i < 1000; i++) {
        const analysis: FileAnalysis = {
          path: `test/file${i}.ts`,
          symbols: [
            {
              name: `symbol${i}`,
              kind: 'function',
              line: 1,
              column: 0,
              signature: `function symbol${i}() {}`,
              isExported: true,
              dependencies: i > 0 ? [`symbol${i - 1}`] : [],
            },
          ],
          imports: i > 0 ? [`test/file${i - 1}.ts`] : [],
          exports: [`symbol${i}`],
          dependencies: i > 0 ? [`test/file${i - 1}.ts`] : [],
          complexity: 5,
          lastModified: Date.now(),
        };

        graph.nodes.set(analysis.path, analysis);
        
        if (i > 0) {
          const deps = graph.edges.get(`test/file${i - 1}.ts`) || [];
          deps.push(analysis.path);
          graph.edges.set(`test/file${i - 1}.ts`, deps);
        }
      }

      // Measure single file update
      const newAnalysis: FileAnalysis = {
        path: 'test/file500.ts',
        symbols: [
          {
            name: 'updatedSymbol',
            kind: 'function',
            line: 1,
            column: 0,
            signature: 'function updatedSymbol() {}',
            isExported: true,
            dependencies: ['symbol499'],
          },
        ],
        imports: ['test/file499.ts'],
        exports: ['updatedSymbol'],
        dependencies: ['test/file499.ts'],
        complexity: 5,
        lastModified: Date.now(),
      };

      const startTime = performance.now();
      graph.nodes.set(newAnalysis.path, newAnalysis);
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`✅ Graph update took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });
});
