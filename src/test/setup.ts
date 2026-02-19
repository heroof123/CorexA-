// src/test/setup.ts
// Test setup for Vitest + fast-check

import '@testing-library/jest-dom';
import { fc } from '@fast-check/vitest';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Make fast-check available globally
globalThis.fc = fc;

// Mock Tauri API - create the mock function first
const mockInvoke = vi.fn(async (cmd: string, args?: any) => {
  console.log(`[Mock Tauri] ${cmd}`, args);

  // Mock parse_file_ast command with real parsing
  if (cmd === 'parse_file_ast') {
    const { filePath, content } = args || {};
    console.log('[Mock Tauri] filePath:', filePath, 'content length:', content?.length);

    if (!filePath || !content) {
      console.warn('[Mock Tauri] Missing filePath or content');
      return {
        file_path: filePath || '',
        symbols: [],
        imports: [],
        exports: [],
        complexity: 0,
        dependencies: [],
        dependents: [],
      };
    }

    // Simple regex-based parser for testing
    const ext = filePath.split('.').pop() || '';
    const symbols: any[] = [];
    const imports: any[] = [];
    const exports: string[] = [];

    // Python parsing
    if (ext === 'py') {
      const funcMatches = content.matchAll(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
      for (const match of funcMatches) {
        symbols.push({
          name: match[1],
          kind: 'function',
          line: 0,
          column: 0,
          is_exported: true,
        });
        exports.push(match[1]);
      }

      const classMatches = content.matchAll(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of classMatches) {
        symbols.push({
          name: match[1],
          kind: 'class',
          line: 0,
          column: 0,
          is_exported: true,
        });
        exports.push(match[1]);
      }
    }

    // TypeScript/JavaScript parsing
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      const funcMatches = content.matchAll(/(?:export\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of funcMatches) {
        const isExported = match[0].startsWith('export');
        symbols.push({
          name: match[1],
          kind: 'function',
          line: 0,
          column: 0,
          is_exported: isExported,
        });
        if (isExported) exports.push(match[1]);
      }

      const classMatches = content.matchAll(/(?:export\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of classMatches) {
        const isExported = match[0].startsWith('export');
        symbols.push({
          name: match[1],
          kind: 'class',
          line: 0,
          column: 0,
          is_exported: isExported,
        });
        if (isExported) exports.push(match[1]);
      }

      const interfaceMatches = content.matchAll(/(?:export\s+)?interface\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of interfaceMatches) {
        const isExported = match[0].startsWith('export');
        symbols.push({
          name: match[1],
          kind: 'interface',
          line: 0,
          column: 0,
          is_exported: isExported,
        });
        if (isExported) exports.push(match[1]);
      }
    }

    // Rust parsing
    if (ext === 'rs') {
      const funcMatches = content.matchAll(/(?:pub\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of funcMatches) {
        const isPublic = match[0].startsWith('pub');
        symbols.push({
          name: match[1],
          kind: 'function',
          line: 0,
          column: 0,
          is_exported: isPublic,
        });
        if (isPublic) exports.push(match[1]);
      }

      const structMatches = content.matchAll(/(?:pub\s+)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of structMatches) {
        const isPublic = match[0].startsWith('pub');
        symbols.push({
          name: match[1],
          kind: 'class',
          line: 0,
          column: 0,
          is_exported: isPublic,
        });
        if (isPublic) exports.push(match[1]);
      }
    }

    // Go parsing
    if (ext === 'go') {
      const funcMatches = content.matchAll(/func\s+([A-Z][a-zA-Z0-9_]*)/g);
      for (const match of funcMatches) {
        symbols.push({
          name: match[1],
          kind: 'function',
          line: 0,
          column: 0,
          is_exported: true,
        });
        exports.push(match[1]);
      }

      const structMatches = content.matchAll(/type\s+([A-Z][a-zA-Z0-9_]*)\s+struct/g);
      for (const match of structMatches) {
        symbols.push({
          name: match[1],
          kind: 'class',
          line: 0,
          column: 0,
          is_exported: true,
        });
        exports.push(match[1]);
      }
    }

    console.log('[Mock Tauri] Parsed symbols:', symbols.length);

    return {
      file_path: filePath,
      symbols,
      imports,
      exports,
      complexity: 0,
      dependencies: [],
      dependents: [],
    };
  }

  // Dosya okuma/yazma
  if (cmd === 'read_file') {
    return 'function test() { return 42; }';
  }
  if (cmd === 'write_file') {
    return null;
  }

  // Pencere kontrolleri
  if (cmd === 'minimize_window' || cmd === 'maximize_window' || cmd === 'close_window') {
    return null;
  }

  return null;
});

// Mock @tauri-apps/api/core module
vi.mock('@tauri-apps/api/core', () => ({
  __esModule: true,
  invoke: mockInvoke,
  default: { invoke: mockInvoke },
}));

// Also set global __TAURI__ for backwards compatibility
globalThis.__TAURI__ = {
  invoke: mockInvoke,
};

console.log('✅ Test environment initialized');
