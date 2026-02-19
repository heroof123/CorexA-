// src/services/__tests__/parserRegistry.test.ts
// Property-based tests for ParserRegistry

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  ParserRegistry,
  TypeScriptParser,
  PythonParser,
  RustParser,
  GoParser,
  isLanguageSupported,
  getLanguageFromExtension,
} from '../parserRegistry';
import type { FileAnalysis } from '../../types/ai-native';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Property 5: Unsupported Language Graceful Degradation
  // Validates: Requirements 1.5
  // ==========================================================================

  test.prop([fc.string().filter(s => !['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go'].includes(s))])(
    'Property 5: should gracefully handle unsupported file extensions',
    async (unsupportedExt) => {
      const filePath = `test.${unsupportedExt}`;
      const content = 'some content';

      const result = await registry.parseFile(filePath, content);

      // Should return empty analysis without crashing
      expect(result).toBeDefined();
      expect(result.file_path).toBe(filePath);
      expect(result.symbols).toEqual([]);
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.complexity).toBe(0);
    }
  );

  it('should return null parser for unsupported extensions', () => {
    const parser = registry.getParser('xyz');
    expect(parser).toBeNull();
  });

  it('should handle files without extensions', async () => {
    const result = await registry.parseFile('README', 'content');
    expect(result).toBeDefined();
    expect(result.symbols).toEqual([]);
  });

  // ==========================================================================
  // Unit Tests for Parser Registration
  // ==========================================================================

  it('should register TypeScript parser by default', () => {
    const parser = registry.getParser('ts');
    expect(parser).toBeDefined();
    expect(parser?.language).toBe('typescript');
  });

  it('should register Python parser by default', () => {
    const parser = registry.getParser('py');
    expect(parser).toBeDefined();
    expect(parser?.language).toBe('python');
  });

  it('should register Rust parser by default', () => {
    const parser = registry.getParser('rs');
    expect(parser).toBeDefined();
    expect(parser?.language).toBe('rust');
  });

  it('should register Go parser by default', () => {
    const parser = registry.getParser('go');
    expect(parser).toBeDefined();
    expect(parser?.language).toBe('go');
  });

  it('should handle extension with leading dot', () => {
    const parser1 = registry.getParser('.ts');
    const parser2 = registry.getParser('ts');
    expect(parser1).toBe(parser2);
  });

  it('should return all supported extensions', () => {
    const extensions = registry.getSupportedExtensions();
    expect(extensions).toContain('ts');
    expect(extensions).toContain('tsx');
    expect(extensions).toContain('js');
    expect(extensions).toContain('jsx');
    expect(extensions).toContain('py');
    expect(extensions).toContain('rs');
    expect(extensions).toContain('go');
  });

  it('should return all supported languages', () => {
    const languages = registry.getSupportedLanguages();
    expect(languages).toContain('typescript');
    expect(languages).toContain('python');
    expect(languages).toContain('rust');
    expect(languages).toContain('go');
  });

  // ==========================================================================
  // Unit Tests for Individual Parsers
  // ==========================================================================

  describe('TypeScriptParser', () => {
    it('should call Rust backend for TypeScript files', async () => {
      const mockAnalysis: FileAnalysis = {
        file_path: 'test.ts',
        symbols: [
          {
            name: 'testFunction',
            kind: 'function',
            line: 1,
            column: 0,
            is_exported: true,
          },
        ],
        imports: [],
        exports: [],
        complexity: 1,
        dependencies: [],
        dependents: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const parser = new TypeScriptParser();
      const result = await parser.parse('test.ts', 'function testFunction() {}');

      expect(invoke).toHaveBeenCalledWith('parse_file_ast', {
        filePath: 'test.ts',
      });
      expect(result).toEqual(mockAnalysis);
    });

    it('should support all TypeScript extensions', () => {
      const parser = new TypeScriptParser();
      expect(parser.extensions).toContain('ts');
      expect(parser.extensions).toContain('tsx');
      expect(parser.extensions).toContain('js');
      expect(parser.extensions).toContain('jsx');
    });
  });

  describe('PythonParser', () => {
    it('should call Rust backend for Python files', async () => {
      const mockAnalysis: FileAnalysis = {
        file_path: 'test.py',
        symbols: [
          {
            name: 'test_function',
            kind: 'function',
            line: 1,
            column: 0,
            is_exported: true,
          },
        ],
        imports: [],
        exports: [],
        complexity: 1,
        dependencies: [],
        dependents: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const parser = new PythonParser();
      const result = await parser.parse('test.py', 'def test_function(): pass');

      expect(invoke).toHaveBeenCalledWith('parse_file_ast', {
        filePath: 'test.py',
      });
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('RustParser', () => {
    it('should call Rust backend for Rust files', async () => {
      const mockAnalysis: FileAnalysis = {
        file_path: 'test.rs',
        symbols: [
          {
            name: 'test_function',
            kind: 'function',
            line: 1,
            column: 0,
            is_exported: true,
          },
        ],
        imports: [],
        exports: [],
        complexity: 1,
        dependencies: [],
        dependents: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const parser = new RustParser();
      const result = await parser.parse('test.rs', 'fn test_function() {}');

      expect(invoke).toHaveBeenCalledWith('parse_file_ast', {
        filePath: 'test.rs',
      });
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('GoParser', () => {
    it('should call Rust backend for Go files', async () => {
      const mockAnalysis: FileAnalysis = {
        file_path: 'test.go',
        symbols: [
          {
            name: 'TestFunction',
            kind: 'function',
            line: 1,
            column: 0,
            is_exported: true,
          },
        ],
        imports: [],
        exports: [],
        complexity: 1,
        dependencies: [],
        dependents: [],
      };

      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const parser = new GoParser();
      const result = await parser.parse('test.go', 'func TestFunction() {}');

      expect(invoke).toHaveBeenCalledWith('parse_file_ast', {
        filePath: 'test.go',
      });
      expect(result).toEqual(mockAnalysis);
    });
  });

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe('Utility Functions', () => {
    it('isLanguageSupported should return true for supported extensions', () => {
      expect(isLanguageSupported('ts')).toBe(true);
      expect(isLanguageSupported('py')).toBe(true);
      expect(isLanguageSupported('rs')).toBe(true);
      expect(isLanguageSupported('go')).toBe(true);
    });

    it('isLanguageSupported should return false for unsupported extensions', () => {
      expect(isLanguageSupported('xyz')).toBe(false);
      expect(isLanguageSupported('txt')).toBe(false);
    });

    it('getLanguageFromExtension should return correct language', () => {
      expect(getLanguageFromExtension('ts')).toBe('typescript');
      expect(getLanguageFromExtension('py')).toBe('python');
      expect(getLanguageFromExtension('rs')).toBe('rust');
      expect(getLanguageFromExtension('go')).toBe('go');
    });

    it('getLanguageFromExtension should return null for unsupported', () => {
      expect(getLanguageFromExtension('xyz')).toBeNull();
    });
  });
});
