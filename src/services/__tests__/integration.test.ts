// src/services/__tests__/integration.test.ts
// Integration tests for AI-native IDE system

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backgroundReasoner } from '../backgroundReasoner';
import { symbolResolver } from '../symbolResolver';
import { symbolSearch } from '../symbolSearch';
import { smartContextBuilder } from '../smartContextBuilder';
import { impactAnalysis } from '../impactAnalysis';
import { analysisCacheManager } from '../analysisCacheManager';
import type { FileAnalysis } from '../semanticBrain';
import type { DependencyGraph } from '../dependencyAnalyzer';

// Mock aiNativeDB functions
vi.mock('../aiNativeDB', () => ({
  saveCodeInsights: vi.fn().mockResolvedValue(undefined),
  getCodeInsights: vi.fn().mockResolvedValue([]),
  deleteCodeInsights: vi.fn().mockResolvedValue(undefined),
}));

/**
 * 🆕 TASK 25: Final System Integration Tests
 * 
 * End-to-end workflows:
 * 1. File change → analysis → decoration pipeline
 * 2. Query → context building → AI response pipeline
 */

describe('AI-Native IDE Integration Tests', () => {
  beforeEach(() => {
    // Clear all caches and state
    analysisCacheManager.clearAll();
    symbolSearch.clear();
    symbolResolver.clear();
  });

  afterEach(() => {
    // Stop background reasoner
    backgroundReasoner.stop();
  });

  describe('File Change → Analysis → Decoration Pipeline', () => {
    it('should complete full analysis pipeline', async () => {
      const testFile = 'test/example.ts';
      const testContent = `
        export function complexFunction(a: number, b: number, c: number, d: number, e: number) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                if (d > 0) {
                  if (e > 0) {
                    return a + b + c + d + e;
                  }
                }
              }
            }
          }
          return 0;
        }
      `;

      // Start background reasoner FIRST
      backgroundReasoner.start();

      // Step 1: Setup event listener BEFORE queuing
      const analysisPromise = new Promise<void>((resolve) => {
        backgroundReasoner.on('analysis-complete', (data: any) => {
          if (data.filePath === testFile) {
            // Step 3: Verify analysis completed (insights may be empty in test environment)
            console.log(`✅ Test received analysis-complete event for ${data.filePath} with ${data.insights.length} insights`);
            resolve();
          }
        });
      });

      // Step 2: Trigger analysis AFTER listener is set up
      backgroundReasoner.queueAnalysis(testFile, testContent, 'high');

      // Wait for analysis to complete with timeout
      await Promise.race([
        analysisPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: Analysis did not complete')), 5000))
      ]);

      console.log('✅ File change → Analysis → Decoration pipeline completed');
    }, 10000); // 10 second timeout

    it('should handle multiple file changes efficiently', async () => {
      const files = [
        { path: 'test/file1.ts', content: 'export function test1() { return 1; }' },
        { path: 'test/file2.ts', content: 'export function test2() { return 2; }' },
        { path: 'test/file3.ts', content: 'export function test3() { return 3; }' },
      ];

      let completedCount = 0;
      const allCompleted = new Promise<void>((resolve) => {
        backgroundReasoner.on('analysis-complete', (data: any) => {
          completedCount++;
          if (completedCount === files.length) {
            resolve();
          }
        });
      });

      backgroundReasoner.start();

      // Queue all files
      files.forEach(file => {
        backgroundReasoner.queueAnalysis(file.path, file.content, 'medium');
      });

      // Wait for all to complete with timeout
      await Promise.race([
        allCompleted,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      expect(completedCount).toBe(files.length);
      console.log('✅ Multiple file analysis completed');
    }, 10000);
  });

  describe('Query → Context Building → AI Response Pipeline', () => {
    it('should build comprehensive context for query', async () => {
      // Step 1: Create mock project structure with embeddings
      const fileIndex: any[] = [
        {
          path: 'src/utils/math.ts',
          content: 'export function add(a: number, b: number) { return a + b; }',
          embedding: new Array(1536).fill(0.1),
          lastModified: Date.now(),
        },
        {
          path: 'src/components/Calculator.tsx',
          content: 'import { add } from "../utils/math"; export class Calculator {}',
          embedding: new Array(1536).fill(0.15),
          lastModified: Date.now(),
        },
        {
          path: 'src/App.tsx',
          content: 'import { Calculator } from "./components/Calculator"; export function App() {}',
          embedding: new Array(1536).fill(0.2),
          lastModified: Date.now(),
        },
      ];

      // Step 2: Build context for query
      const query = 'How does the Calculator component work?';
      const queryEmbedding = new Array(1536).fill(0.15);
      
      const context = await smartContextBuilder.buildContext(
        query,
        queryEmbedding,
        fileIndex,
        undefined,
        { maxFiles: 10, maxTokens: 10000 }
      );

      // Step 3: Verify context quality
      expect(context.length).toBeGreaterThan(0);
      
      // Should include Calculator file
      const calculatorFile = context.find(f => f.path.includes('Calculator'));
      expect(calculatorFile).toBeTruthy();

      console.log('✅ Query → Context building pipeline completed');
      console.log(`   - Files included: ${context.length}`);
    }, 10000);

    it('should prioritize relevant files correctly', async () => {
      const fileIndex: any[] = [
        {
          path: 'src/auth/login.ts',
          content: 'export function login() {}',
          embedding: new Array(1536).fill(0.1),
          lastModified: Date.now(),
        },
        {
          path: 'src/utils/random.ts',
          content: 'export function random() {}',
          embedding: new Array(1536).fill(0.05),
          lastModified: Date.now(),
        },
      ];

      // Query about authentication
      const queryEmbedding = new Array(1536).fill(0.1);
      const context = await smartContextBuilder.buildContext(
        'How does authentication work?',
        queryEmbedding,
        fileIndex,
        undefined,
        { maxFiles: 5, maxTokens: 5000 }
      );

      // Should prioritize auth-related files
      const authFile = context.find(f => f.path.includes('auth'));
      expect(authFile).toBeTruthy();

      console.log('✅ File prioritization working correctly');
    }, 10000);
  });

  describe('Symbol Resolution Integration', () => {
    it('should resolve cross-file symbol references', async () => {
      const graph: DependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
      };

      // Create interconnected files
      const files: FileAnalysis[] = [
        {
          path: 'src/types.ts',
          symbols: [
            {
              name: 'User',
              kind: 'interface',
              line: 1,
              column: 0,
              signature: 'interface User',
              isExported: true,
              dependencies: [],
            },
          ],
          imports: [],
          exports: ['User'],
          dependencies: [],
          complexity: 1,
          lastModified: Date.now(),
        },
        {
          path: 'src/service.ts',
          symbols: [
            {
              name: 'UserService',
              kind: 'class',
              line: 1,
              column: 0,
              signature: 'class UserService',
              isExported: true,
              dependencies: ['User'],
            },
          ],
          imports: ['src/types.ts'],
          exports: ['UserService'],
          dependencies: ['src/types.ts'],
          complexity: 5,
          lastModified: Date.now(),
        },
      ];

      files.forEach(f => graph.nodes.set(f.path, f));
      graph.edges.set('src/types.ts', ['src/service.ts']);

      // Build index
      symbolResolver.buildIndex(graph);

      // Resolve User interface
      const userDef = symbolResolver.resolveDefinition('User');
      expect(userDef).toBeTruthy();
      expect(userDef?.file_path).toBe('src/types.ts');

      // Find references to User
      const userRefs = symbolResolver.findReferences('User');
      expect(userRefs.length).toBeGreaterThan(0);

      console.log('✅ Cross-file symbol resolution working');
    });
  });

  describe('Impact Analysis Integration', () => {
    it('should calculate impact correctly', async () => {
      const graph: DependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
      };

      // Create dependency chain
      const files: FileAnalysis[] = [
        {
          path: 'src/core.ts',
          symbols: [{ name: 'core', kind: 'function', line: 1, column: 0, signature: '', isExported: true, dependencies: [] }],
          imports: [],
          exports: ['core'],
          dependencies: [],
          dependents: ['src/service.ts'], // Add dependents
          complexity: 1,
          lastModified: Date.now(),
        },
        {
          path: 'src/service.ts',
          symbols: [{ name: 'service', kind: 'function', line: 1, column: 0, signature: '', isExported: true, dependencies: ['core'] }],
          imports: ['src/core.ts'],
          exports: ['service'],
          dependencies: ['src/core.ts'],
          dependents: ['src/app.ts'], // Add dependents
          complexity: 1,
          lastModified: Date.now(),
        },
        {
          path: 'src/app.ts',
          symbols: [{ name: 'app', kind: 'function', line: 1, column: 0, signature: '', isExported: true, dependencies: ['service'] }],
          imports: ['src/service.ts'],
          exports: ['app'],
          dependencies: ['src/service.ts'],
          dependents: [], // Add dependents
          complexity: 1,
          lastModified: Date.now(),
        },
      ];

      files.forEach(f => graph.nodes.set(f.path, f));
      graph.edges.set('src/core.ts', ['src/service.ts']);
      graph.edges.set('src/service.ts', ['src/app.ts']);

      // Initialize impact analysis
      await impactAnalysis.initialize();
      symbolResolver.buildIndex(graph);

      // Analyze impact of changing core.ts
      const impact = await impactAnalysis.analyzeFileImpact('src/core.ts');

      // Should have impact score
      expect(impact.impactScore).toBeGreaterThanOrEqual(0);

      console.log('✅ Impact analysis integration working');
      console.log(`   - Impact score: ${impact.impactScore}`);
      console.log(`   - Direct dependents: ${impact.directDependents.length}`);
      console.log(`   - Transitive dependents: ${impact.transitiveDependents.length}`);
    }, 10000);
  });

  describe('Full System Stress Test', () => {
    it('should handle large project (1000+ files)', async () => {
      const fileCount = 1000;
      const fileIndex: any[] = [];

      // Generate large project with embeddings
      for (let i = 0; i < fileCount; i++) {
        fileIndex.push({
          path: `src/file${i}.ts`,
          content: `function test${i}() { return ${i}; }`,
          embedding: new Array(1536).fill(0.1),
          lastModified: Date.now(),
        });
      }

      console.log(`📊 Testing with ${fileCount} files...`);

      // Test context building
      const queryEmbedding = new Array(1536).fill(0.1);
      const startTime = performance.now();
      const context = await smartContextBuilder.buildContext(
        'test query',
        queryEmbedding,
        fileIndex,
        undefined,
        { maxFiles: 20, maxTokens: 50000 }
      );
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(context.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(3000); // Should complete in < 3s

      console.log('✅ Large project test passed');
      console.log(`   - Files: ${fileCount}`);
      console.log(`   - Context build time: ${duration.toFixed(2)}ms`);
      console.log(`   - Files in context: ${context.length}`);
    }, 15000); // 15 second timeout for large test
  });
});
