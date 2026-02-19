// src/services/analysisCacheManager.ts
// Analysis result caching with hash-based change detection

import { parseFile } from './semanticBrain';
import type { FileAnalysis } from './semanticBrain';
import {
  saveFileAnalysis,
  getFileAnalysisWithHash,
  deleteFileAnalysis,
} from './aiNativeDB';

/**
 * Calculate content hash using simple hash function
 * For production, consider using crypto.subtle.digest for SHA-256
 */
export function calculateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Analysis Cache Manager
 * Handles caching of file analysis results with hash-based change detection
 */
export class AnalysisCacheManager {
  private inMemoryCache: Map<string, { analysis: FileAnalysis; hash: string }> = new Map();
  private maxCacheSize: number = 500; // LRU cache size

  /**
   * Get or compute file analysis with caching
   * Only re-analyzes if content hash changes
   */
  async getOrComputeAnalysis(
    filePath: string,
    content: string
  ): Promise<FileAnalysis> {
    const contentHash = calculateContentHash(content);

    // Check in-memory cache first
    const cached = this.inMemoryCache.get(filePath);
    if (cached && cached.hash === contentHash) {
      console.log(`✅ Cache HIT (memory): ${filePath}`);
      return cached.analysis;
    }

    // Check IndexedDB cache
    const dbCached = await getFileAnalysisWithHash(filePath);
    if (dbCached && dbCached.contentHash === contentHash) {
      console.log(`✅ Cache HIT (IndexedDB): ${filePath}`);
      
      // Update in-memory cache
      this.inMemoryCache.set(filePath, {
        analysis: dbCached.analysis,
        hash: contentHash,
      });
      this.evictIfNeeded();
      
      return dbCached.analysis;
    }

    // Cache MISS - compute analysis
    console.log(`❌ Cache MISS: ${filePath} - Computing analysis...`);
    const analysis = await parseFile(filePath, content);

    // Save to both caches
    await this.saveAnalysis(filePath, analysis, contentHash);

    return analysis;
  }

  /**
   * Save analysis to both in-memory and IndexedDB caches
   */
  async saveAnalysis(
    filePath: string,
    analysis: FileAnalysis,
    contentHash: string
  ): Promise<void> {
    // Save to in-memory cache
    this.inMemoryCache.set(filePath, { analysis, hash: contentHash });
    this.evictIfNeeded();

    // Save to IndexedDB
    await saveFileAnalysis(filePath, analysis, contentHash);
  }

  /**
   * Invalidate cache for a file
   */
  async invalidateFile(filePath: string): Promise<void> {
    this.inMemoryCache.delete(filePath);
    await deleteFileAnalysis(filePath);
    console.log(`🗑️ Cache invalidated: ${filePath}`);
  }

  /**
   * Check if file needs re-analysis
   */
  async needsReanalysis(filePath: string, content: string): Promise<boolean> {
    const contentHash = calculateContentHash(content);

    // Check in-memory cache
    const cached = this.inMemoryCache.get(filePath);
    if (cached && cached.hash === contentHash) {
      return false;
    }

    // Check IndexedDB cache
    const dbCached = await getFileAnalysisWithHash(filePath);
    if (dbCached && dbCached.contentHash === contentHash) {
      return false;
    }

    return true;
  }

  /**
   * Get cached analysis without computing
   */
  async getCachedAnalysis(filePath: string): Promise<FileAnalysis | null> {
    // Check in-memory cache
    const cached = this.inMemoryCache.get(filePath);
    if (cached) {
      return cached.analysis;
    }

    // Check IndexedDB cache
    const dbCached = await getFileAnalysisWithHash(filePath);
    return dbCached?.analysis || null;
  }

  /**
   * Evict oldest entries if cache size exceeds limit (LRU)
   */
  private evictIfNeeded(): void {
    if (this.inMemoryCache.size > this.maxCacheSize) {
      // Simple LRU: delete first entry (oldest)
      const firstKey = this.inMemoryCache.keys().next().value;
      if (firstKey) {
        this.inMemoryCache.delete(firstKey);
        console.log(`🗑️ LRU eviction: ${firstKey}`);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.inMemoryCache.clear();
    console.log('🗑️ In-memory cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    inMemorySize: number;
    maxCacheSize: number;
    hitRate: number;
  } {
    return {
      inMemorySize: this.inMemoryCache.size,
      maxCacheSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Preload multiple files into cache
   */
  async preloadFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    console.log(`📦 Preloading ${files.length} files into cache...`);
    
    const promises = files.map(file =>
      this.getOrComputeAnalysis(file.path, file.content)
    );
    
    await Promise.all(promises);
    console.log(`✅ Preloaded ${files.length} files`);
  }
}

// ============================================================================
// Global Instance
// ============================================================================

export const analysisCacheManager = new AnalysisCacheManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get or compute analysis (convenience function)
 */
export async function getOrComputeFileAnalysis(
  filePath: string,
  content: string
): Promise<FileAnalysis> {
  return await analysisCacheManager.getOrComputeAnalysis(filePath, content);
}

/**
 * Check if file needs re-analysis (convenience function)
 */
export async function fileNeedsReanalysis(
  filePath: string,
  content: string
): Promise<boolean> {
  return await analysisCacheManager.needsReanalysis(filePath, content);
}

/**
 * Invalidate file cache (convenience function)
 */
export async function invalidateFileCache(filePath: string): Promise<void> {
  await analysisCacheManager.invalidateFile(filePath);
}
