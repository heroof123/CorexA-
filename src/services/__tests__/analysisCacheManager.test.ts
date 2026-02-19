// src/services/__tests__/analysisCacheManager.test.ts
// Property-based tests for AnalysisCacheManager

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  AnalysisCacheManager,
  calculateContentHash,
  getOrComputeFileAnalysis,
  fileNeedsReanalysis,
} from '../analysisCacheManager';
import type { FileAnalysis } from '../semanticBrain';

// Mock dependencies
vi.mock('../semanticBrain', () => ({
  parseFile: vi.fn(),
}));

vi.mock('../aiNativeDB', () => ({
  saveFileAnalysis: vi.fn(),
  getFileAnalysisWithHash: vi.fn(),
  deleteFileAnalysis: vi.fn(),
}));

import { parseFile } from '../semanticBrain';
import {
  saveFileAnalysis,
  getFileAnalysisWithHash,
  deleteFileAnalysis,
} from '../aiNativeDB';

describe('AnalysisCacheManager', () => {
  let cacheManager: AnalysisCacheManager;

  beforeEach(() => {
    cacheManager = new AnalysisCacheManager();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Property 6: Analysis Caching Correctness
  // Validates: Requirements 1.6
  // ==========================================================================

  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // filePath
    fc.string({ minLength: 10, maxLength: 1000 }), // content
  ])(
    'Property 6: should return same analysis for same content hash',
    async (filePath, content) => {
      // Create fresh instance for each test
      const testCache = new AnalysisCacheManager();
      
      const mockAnalysis: FileAnalysis = {
        filePath,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        dependents: [],
        complexity: 1,
        linesOfCode: 10,
      };

      // Reset mocks for this test
      vi.clearAllMocks();
      vi.mocked(parseFile).mockResolvedValue(mockAnalysis);
      vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

      // First call - should compute
      const result1 = await testCache.getOrComputeAnalysis(filePath, content);
      expect(result1).toEqual(mockAnalysis);
      const firstCallCount = vi.mocked(parseFile).mock.calls.length;

      // Second call with same content - should use cache
      const result2 = await testCache.getOrComputeAnalysis(filePath, content);
      expect(result2).toEqual(mockAnalysis);
      const secondCallCount = vi.mocked(parseFile).mock.calls.length;
      
      // parseFile should not be called again
      expect(secondCallCount).toBe(firstCallCount);

      // Results should be identical
      expect(result1).toEqual(result2);
    }
  );

  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // filePath
    fc.string({ minLength: 10, maxLength: 1000 }), // content1
    fc.string({ minLength: 10, maxLength: 1000 }), // content2
  ])(
    'Property 6: should recompute analysis when content changes',
    async (filePath, content1, content2) => {
      // Skip if contents are the same
      if (content1 === content2) return;

      // Create fresh instance for each test
      const testCache = new AnalysisCacheManager();

      const mockAnalysis1: FileAnalysis = {
        filePath,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        dependents: [],
        complexity: 1,
        linesOfCode: 10,
      };

      const mockAnalysis2: FileAnalysis = {
        filePath,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        dependents: [],
        complexity: 2,
        linesOfCode: 20,
      };

      // Reset mocks for this test
      vi.clearAllMocks();
      vi.mocked(parseFile)
        .mockResolvedValueOnce(mockAnalysis1)
        .mockResolvedValueOnce(mockAnalysis2);
      vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

      // First call with content1
      const result1 = await testCache.getOrComputeAnalysis(filePath, content1);
      expect(result1).toEqual(mockAnalysis1);
      const firstCallCount = vi.mocked(parseFile).mock.calls.length;

      // Second call with content2 - should recompute
      const result2 = await testCache.getOrComputeAnalysis(filePath, content2);
      expect(result2).toEqual(mockAnalysis2);
      const secondCallCount = vi.mocked(parseFile).mock.calls.length;

      // parseFile should be called twice
      expect(secondCallCount).toBe(firstCallCount + 1);
    }
  );

  // ==========================================================================
  // Unit Tests for Content Hash
  // ==========================================================================

  it('should generate consistent hash for same content', () => {
    const content = 'function test() { return 42; }';
    const hash1 = calculateContentHash(content);
    const hash2 = calculateContentHash(content);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different content', () => {
    const content1 = 'function test() { return 42; }';
    const content2 = 'function test() { return 43; }';
    const hash1 = calculateContentHash(content1);
    const hash2 = calculateContentHash(content2);
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty content', () => {
    const hash = calculateContentHash('');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  // ==========================================================================
  // Unit Tests for Cache Operations
  // ==========================================================================

  it('should save analysis to cache', async () => {
    const filePath = 'test.ts';
    const content = 'const x = 1;';
    const mockAnalysis: FileAnalysis = {
      filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(parseFile).mockResolvedValue(mockAnalysis);
    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    await cacheManager.getOrComputeAnalysis(filePath, content);

    expect(saveFileAnalysis).toHaveBeenCalled();
  });

  it('should invalidate file cache', async () => {
    const filePath = 'test.ts';
    
    await cacheManager.invalidateFile(filePath);

    expect(deleteFileAnalysis).toHaveBeenCalledWith(filePath);
  });

  it('should detect when file needs reanalysis', async () => {
    const filePath = 'test.ts';
    const content = 'const x = 1;';

    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    const needsReanalysis = await cacheManager.needsReanalysis(filePath, content);
    expect(needsReanalysis).toBe(true);
  });

  it('should detect when file does not need reanalysis', async () => {
    const filePath = 'test.ts';
    const content = 'const x = 1;';
    const contentHash = calculateContentHash(content);

    const mockAnalysis: FileAnalysis = {
      filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(getFileAnalysisWithHash).mockResolvedValue({
      analysis: mockAnalysis,
      contentHash,
    });

    const needsReanalysis = await cacheManager.needsReanalysis(filePath, content);
    expect(needsReanalysis).toBe(false);
  });

  it('should return cached analysis without computing', async () => {
    const filePath = 'test.ts';
    const mockAnalysis: FileAnalysis = {
      filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(getFileAnalysisWithHash).mockResolvedValue({
      analysis: mockAnalysis,
      contentHash: 'abc123',
    });

    const result = await cacheManager.getCachedAnalysis(filePath);
    expect(result).toEqual(mockAnalysis);
    expect(parseFile).not.toHaveBeenCalled();
  });

  it('should return null for uncached file', async () => {
    const filePath = 'test.ts';

    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    const result = await cacheManager.getCachedAnalysis(filePath);
    expect(result).toBeNull();
  });

  it('should clear all caches', () => {
    cacheManager.clearAll();
    const stats = cacheManager.getCacheStats();
    expect(stats.inMemorySize).toBe(0);
  });

  it('should provide cache statistics', () => {
    const stats = cacheManager.getCacheStats();
    expect(stats).toHaveProperty('inMemorySize');
    expect(stats).toHaveProperty('maxCacheSize');
    expect(stats).toHaveProperty('hitRate');
  });

  it('should preload multiple files', async () => {
    const files = [
      { path: 'file1.ts', content: 'const x = 1;' },
      { path: 'file2.ts', content: 'const y = 2;' },
    ];

    const mockAnalysis: FileAnalysis = {
      filePath: '',
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(parseFile).mockResolvedValue(mockAnalysis);
    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    await cacheManager.preloadFiles(files);

    expect(parseFile).toHaveBeenCalledTimes(2);
  });

  // ==========================================================================
  // Unit Tests for LRU Eviction
  // ==========================================================================

  it('should evict oldest entry when cache is full', async () => {
    // Create a small cache
    const smallCache = new AnalysisCacheManager();
    (smallCache as any).maxCacheSize = 2;

    const mockAnalysis: FileAnalysis = {
      filePath: '',
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(parseFile).mockResolvedValue(mockAnalysis);
    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    // Add 3 files (should evict first one)
    await smallCache.getOrComputeAnalysis('file1.ts', 'content1');
    await smallCache.getOrComputeAnalysis('file2.ts', 'content2');
    await smallCache.getOrComputeAnalysis('file3.ts', 'content3');

    const stats = smallCache.getCacheStats();
    expect(stats.inMemorySize).toBe(2);
  });

  // ==========================================================================
  // Unit Tests for Convenience Functions
  // ==========================================================================

  it('getOrComputeFileAnalysis should work', async () => {
    const filePath = 'test.ts';
    const content = 'const x = 1;';
    const mockAnalysis: FileAnalysis = {
      filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      dependents: [],
      complexity: 0,
      linesOfCode: 1,
    };

    vi.mocked(parseFile).mockResolvedValue(mockAnalysis);
    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    const result = await getOrComputeFileAnalysis(filePath, content);
    expect(result).toEqual(mockAnalysis);
  });

  it('fileNeedsReanalysis should work', async () => {
    const filePath = 'test-unique-file.ts';
    const content = 'const x = 1;';

    // Clear previous cache state
    vi.clearAllMocks();
    vi.mocked(getFileAnalysisWithHash).mockResolvedValue(null);

    // Use global instance but ensure clean state
    const result = await fileNeedsReanalysis(filePath, content);
    expect(result).toBe(true);
  });
});
