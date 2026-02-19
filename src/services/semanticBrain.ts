// Semantic Brain - AST Parser & Dependency Graph
// Code analysis and smart context building for AI

import * as ts from 'typescript';
import { parserRegistry, isLanguageSupported } from './parserRegistry';
import type { FileAnalysis as AINativeFileAnalysis } from '../types/ai-native';

export interface Symbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'enum' | 'const';
  filePath: string;
  line: number;
  column: number;
  signature?: string;
  documentation?: string;
  isExported: boolean;
  dependencies: string[]; // Other symbols this depends on
}

export interface FileAnalysis {
  filePath: string;
  symbols: Symbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[]; // File paths this file depends on
  dependents: string[]; // File paths that depend on this file
  complexity: number; // Cyclomatic complexity
  linesOfCode: number;
}

export interface ImportInfo {
  moduleName: string;
  importedSymbols: string[];
  isDefault: boolean;
  line: number;
}

export interface ExportInfo {
  symbolName: string;
  isDefault: boolean;
  line: number;
}

export interface DependencyGraph {
  nodes: Map<string, FileAnalysis>; // filePath -> analysis
  edges: Map<string, Set<string>>; // filePath -> dependent filePaths
}

export interface CallHierarchy {
  symbol: string;
  callers: string[]; // Symbols that call this
  callees: string[]; // Symbols this calls
  filePath: string;
}

/**
 * Parse TypeScript/JavaScript file and extract symbols
 * Now supports multi-language parsing via ParserRegistry
 */
export async function parseFile(filePath: string, sourceCode: string): Promise<FileAnalysis> {
  console.log('🔍 Parsing file:', filePath);
  
  // Extract file extension
  const ext = filePath.split('.').pop() || '';
  
  // In test environment, use ParserRegistry for all supported languages including TS/JS
  const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST);
  
  // Check if we should use ParserRegistry
  if (isTestEnv && isLanguageSupported(ext)) {
    console.log(`📦 Using ParserRegistry for ${ext} file (test mode)`);
    try {
      const aiNativeAnalysis = await parserRegistry.parseFile(filePath, sourceCode);
      
      // Check if parsing was successful
      if (!aiNativeAnalysis) {
        console.error('❌ ParserRegistry returned null');
        // Return empty analysis
        return {
          filePath,
          symbols: [],
          imports: [],
          exports: [],
          dependencies: [],
          dependents: [],
          complexity: 0,
          linesOfCode: sourceCode.split('\n').length,
        };
      }
      
      // Convert AI-Native FileAnalysis to SemanticBrain FileAnalysis
      return convertAINativeToSemanticBrain(aiNativeAnalysis, sourceCode);
    } catch (error) {
      console.error('❌ ParserRegistry error:', error);
      // Return empty analysis
      return {
        filePath,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        dependents: [],
        complexity: 0,
        linesOfCode: sourceCode.split('\n').length,
      };
    }
  }
  
  // Check if we should use ParserRegistry (non-TypeScript/JavaScript files in production)
  if (ext !== 'ts' && ext !== 'tsx' && ext !== 'js' && ext !== 'jsx' && isLanguageSupported(ext)) {
    console.log(`📦 Using ParserRegistry for ${ext} file`);
    try {
      const aiNativeAnalysis = await parserRegistry.parseFile(filePath, sourceCode);
      
      // Check if parsing was successful
      if (!aiNativeAnalysis) {
        console.error('❌ ParserRegistry returned null');
        // Return empty analysis for non-TS/JS files
        return {
          filePath,
          symbols: [],
          imports: [],
          exports: [],
          dependencies: [],
          dependents: [],
          complexity: 0,
          linesOfCode: sourceCode.split('\n').length,
        };
      }
      
      // Convert AI-Native FileAnalysis to SemanticBrain FileAnalysis
      return convertAINativeToSemanticBrain(aiNativeAnalysis, sourceCode);
    } catch (error) {
      console.error('❌ ParserRegistry error:', error);
      // Return empty analysis for non-TS/JS files
      return {
        filePath,
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        dependents: [],
        complexity: 0,
        linesOfCode: sourceCode.split('\n').length,
      };
    }
  }
  
  // Use existing TypeScript parser for TS/JS files in production
  return parseTypeScriptFile(filePath, sourceCode);
}

/**
 * Convert AI-Native FileAnalysis to SemanticBrain FileAnalysis
 */
function convertAINativeToSemanticBrain(
  aiNativeAnalysis: AINativeFileAnalysis,
  sourceCode: string
): FileAnalysis {
  // Convert symbols
  const symbols: Symbol[] = aiNativeAnalysis.symbols.map(s => ({
    name: s.name,
    kind: s.kind as any, // AI-Native uses same kinds
    filePath: aiNativeAnalysis.file_path,
    line: s.line,
    column: s.column,
    signature: s.signature,
    documentation: s.documentation,
    isExported: s.is_exported,
    dependencies: [], // Will be populated by dependency analysis
  }));
  
  // Convert imports
  const imports: ImportInfo[] = aiNativeAnalysis.imports.map(imp => ({
    moduleName: imp,
    importedSymbols: [],
    isDefault: false,
    line: 0,
  }));
  
  // Convert exports
  const exports: ExportInfo[] = aiNativeAnalysis.exports.map(exp => ({
    symbolName: exp,
    isDefault: false,
    line: 0,
  }));
  
  // Calculate lines of code
  const linesOfCode = sourceCode.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#');
  }).length;
  
  return {
    filePath: aiNativeAnalysis.file_path,
    symbols,
    imports,
    exports,
    dependencies: aiNativeAnalysis.dependencies,
    dependents: aiNativeAnalysis.dependents,
    complexity: aiNativeAnalysis.complexity,
    linesOfCode,
  };
}

/**
 * Parse TypeScript/JavaScript file using TypeScript compiler API
 * (Original implementation, now extracted as separate function)
 */
function parseTypeScriptFile(filePath: string, sourceCode: string): FileAnalysis {
  console.log('🔍 Parsing file:', filePath);
  
  // Create TypeScript source file
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );
  
  const symbols: Symbol[] = [];
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const dependencies: string[] = [];
  let complexity = 0;
  
  // Visit all nodes in AST
  function visit(node: ts.Node) {
    // Extract imports
    if (ts.isImportDeclaration(node)) {
      const importInfo = extractImport(node, sourceFile);
      if (importInfo) {
        imports.push(importInfo);
        if (importInfo.moduleName.startsWith('.')) {
          dependencies.push(importInfo.moduleName);
        }
      }
    }
    
    // Extract exports
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      const exportInfo = extractExport(node, sourceFile);
      if (exportInfo) {
        exports.push(exportInfo);
      }
    }
    
    // Extract function declarations
    if (ts.isFunctionDeclaration(node)) {
      const symbol = extractFunction(node, sourceFile, filePath);
      if (symbol) {
        symbols.push(symbol);
        complexity += calculateComplexity(node);
      }
    }
    
    // Extract class declarations
    if (ts.isClassDeclaration(node)) {
      const symbol = extractClass(node, sourceFile, filePath);
      if (symbol) {
        symbols.push(symbol);
        complexity += calculateComplexity(node);
      }
    }
    
    // Extract interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const symbol = extractInterface(node, sourceFile, filePath);
      if (symbol) {
        symbols.push(symbol);
      }
    }
    
    // Extract variable declarations
    if (ts.isVariableStatement(node)) {
      const variableSymbols = extractVariables(node, sourceFile, filePath);
      symbols.push(...variableSymbols);
    }
    
    // Extract type aliases
    if (ts.isTypeAliasDeclaration(node)) {
      const symbol = extractTypeAlias(node, sourceFile, filePath);
      if (symbol) {
        symbols.push(symbol);
      }
    }
    
    // Extract enums
    if (ts.isEnumDeclaration(node)) {
      const symbol = extractEnum(node, sourceFile, filePath);
      if (symbol) {
        symbols.push(symbol);
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  // Calculate lines of code (excluding comments and empty lines)
  const linesOfCode = sourceCode.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;
  
  console.log(`✅ Parsed ${filePath}: ${symbols.length} symbols, ${imports.length} imports, ${exports.length} exports`);
  
  return {
    filePath,
    symbols,
    imports,
    exports,
    dependencies,
    dependents: [], // Will be filled by buildDependencyGraph
    complexity,
    linesOfCode
  };
}

/**
 * Extract import information
 */
function extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo | null {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return null;
  }
  
  const moduleName = node.moduleSpecifier.text;
  const importedSymbols: string[] = [];
  let isDefault = false;
  
  if (node.importClause) {
    // Default import
    if (node.importClause.name) {
      importedSymbols.push(node.importClause.name.text);
      isDefault = true;
    }
    
    // Named imports
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          importedSymbols.push(element.name.text);
        });
      }
      // Namespace import (import * as X)
      else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        importedSymbols.push(node.importClause.namedBindings.name.text);
      }
    }
  }
  
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  return {
    moduleName,
    importedSymbols,
    isDefault,
    line: line + 1
  };
}

/**
 * Extract export information
 */
function extractExport(node: ts.ExportDeclaration | ts.ExportAssignment, sourceFile: ts.SourceFile): ExportInfo | null {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  if (ts.isExportAssignment(node)) {
    return {
      symbolName: 'default',
      isDefault: true,
      line: line + 1
    };
  }
  
  if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    // For now, just return the first export
    const firstExport = node.exportClause.elements[0];
    if (firstExport) {
      return {
        symbolName: firstExport.name.text,
        isDefault: false,
        line: line + 1
      };
    }
  }
  
  return null;
}

/**
 * Extract function declaration
 */
function extractFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile, filePath: string): Symbol | null {
  if (!node.name) return null;
  
  const name = node.name.text;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  // Build signature
  const params = node.parameters.map(p => {
    const paramName = p.name.getText(sourceFile);
    const paramType = p.type ? p.type.getText(sourceFile) : 'any';
    return `${paramName}: ${paramType}`;
  }).join(', ');
  
  const returnType = node.type ? node.type.getText(sourceFile) : 'void';
  const signature = `function ${name}(${params}): ${returnType}`;
  
  // Extract JSDoc
  const documentation = extractJSDoc(node, sourceFile);
  
  // Check if exported
  const isExported = hasExportModifier(node);
  
  // Extract dependencies (function calls)
  const dependencies = extractFunctionCalls(node, sourceFile);
  
  return {
    name,
    kind: 'function',
    filePath,
    line: line + 1,
    column: character + 1,
    signature,
    documentation,
    isExported,
    dependencies
  };
}

/**
 * Extract class declaration
 */
function extractClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, filePath: string): Symbol | null {
  if (!node.name) return null;
  
  const name = node.name.text;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  // Build signature
  const heritage = node.heritageClauses?.map(clause => {
    return clause.types.map(t => t.expression.getText(sourceFile)).join(', ');
  }).join(', ');
  
  const signature = heritage ? `class ${name} extends ${heritage}` : `class ${name}`;
  
  // Extract JSDoc
  const documentation = extractJSDoc(node, sourceFile);
  
  // Check if exported
  const isExported = hasExportModifier(node);
  
  // Extract dependencies (base classes, used types)
  const dependencies: string[] = [];
  if (node.heritageClauses) {
    node.heritageClauses.forEach(clause => {
      clause.types.forEach(type => {
        dependencies.push(type.expression.getText(sourceFile));
      });
    });
  }
  
  return {
    name,
    kind: 'class',
    filePath,
    line: line + 1,
    column: character + 1,
    signature,
    documentation,
    isExported,
    dependencies
  };
}

/**
 * Extract interface declaration
 */
function extractInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile, filePath: string): Symbol | null {
  const name = node.name.text;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  // Build signature
  const heritage = node.heritageClauses?.map(clause => {
    return clause.types.map(t => t.expression.getText(sourceFile)).join(', ');
  }).join(', ');
  
  const signature = heritage ? `interface ${name} extends ${heritage}` : `interface ${name}`;
  
  // Extract JSDoc
  const documentation = extractJSDoc(node, sourceFile);
  
  // Check if exported
  const isExported = hasExportModifier(node);
  
  return {
    name,
    kind: 'interface',
    filePath,
    line: line + 1,
    column: character + 1,
    signature,
    documentation,
    isExported,
    dependencies: []
  };
}

/**
 * Extract variable declarations
 */
function extractVariables(node: ts.VariableStatement, sourceFile: ts.SourceFile, filePath: string): Symbol[] {
  const symbols: Symbol[] = [];
  const isExported = hasExportModifier(node);
  const isConst = node.declarationList.flags & ts.NodeFlags.Const;
  
  node.declarationList.declarations.forEach(declaration => {
    if (!ts.isIdentifier(declaration.name)) return;
    
    const name = declaration.name.text;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(declaration.getStart());
    
    const type = declaration.type ? declaration.type.getText(sourceFile) : 'any';
    const signature = `${isConst ? 'const' : 'let'} ${name}: ${type}`;
    
    symbols.push({
      name,
      kind: isConst ? 'const' : 'variable',
      filePath,
      line: line + 1,
      column: character + 1,
      signature,
      isExported,
      dependencies: []
    });
  });
  
  return symbols;
}

/**
 * Extract type alias
 */
function extractTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile, filePath: string): Symbol | null {
  const name = node.name.text;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  const typeText = node.type.getText(sourceFile);
  const signature = `type ${name} = ${typeText}`;
  
  const documentation = extractJSDoc(node, sourceFile);
  const isExported = hasExportModifier(node);
  
  return {
    name,
    kind: 'type',
    filePath,
    line: line + 1,
    column: character + 1,
    signature,
    documentation,
    isExported,
    dependencies: []
  };
}

/**
 * Extract enum declaration
 */
function extractEnum(node: ts.EnumDeclaration, sourceFile: ts.SourceFile, filePath: string): Symbol | null {
  const name = node.name.text;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  
  const members = node.members.map(m => m.name.getText(sourceFile)).join(', ');
  const signature = `enum ${name} { ${members} }`;
  
  const documentation = extractJSDoc(node, sourceFile);
  const isExported = hasExportModifier(node);
  
  return {
    name,
    kind: 'enum',
    filePath,
    line: line + 1,
    column: character + 1,
    signature,
    documentation,
    isExported,
    dependencies: []
  };
}

/**
 * Extract JSDoc comments
 */
function extractJSDoc(node: ts.Node, _sourceFile: ts.SourceFile): string | undefined {
  const jsDocTags = ts.getJSDocTags(node);
  if (jsDocTags.length === 0) return undefined;
  
  const comments: string[] = [];
  jsDocTags.forEach(tag => {
    if (tag.comment) {
      comments.push(typeof tag.comment === 'string' ? tag.comment : tag.comment.map(c => c.text).join(''));
    }
  });
  
  return comments.length > 0 ? comments.join('\n') : undefined;
}

/**
 * Check if node has export modifier
 */
function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (!modifiers) return false;
  return modifiers.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Extract function calls from a node
 */
function extractFunctionCalls(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  const calls: string[] = [];
  
  function visit(n: ts.Node) {
    if (ts.isCallExpression(n)) {
      const expression = n.expression.getText(sourceFile);
      calls.push(expression);
    }
    ts.forEachChild(n, visit);
  }
  
  visit(node);
  return calls;
}

/**
 * Calculate cyclomatic complexity
 */
function calculateComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity
  
  function visit(n: ts.Node) {
    // Decision points increase complexity
    if (
      ts.isIfStatement(n) ||
      ts.isConditionalExpression(n) ||
      ts.isWhileStatement(n) ||
      ts.isDoStatement(n) ||
      ts.isForStatement(n) ||
      ts.isForInStatement(n) ||
      ts.isForOfStatement(n) ||
      ts.isCaseClause(n) ||
      ts.isCatchClause(n)
    ) {
      complexity++;
    }
    
    // Logical operators
    if (ts.isBinaryExpression(n)) {
      if (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        complexity++;
      }
    }
    
    ts.forEachChild(n, visit);
  }
  
  visit(node);
  return complexity;
}

/**
 * Build dependency graph from multiple file analyses
 */
export function buildDependencyGraph(analyses: FileAnalysis[]): DependencyGraph {
  console.log('🔗 Building dependency graph for', analyses.length, 'files');
  
  const nodes = new Map<string, FileAnalysis>();
  const edges = new Map<string, Set<string>>();
  
  // Add all nodes
  analyses.forEach(analysis => {
    nodes.set(analysis.filePath, analysis);
    edges.set(analysis.filePath, new Set());
  });
  
  // Build edges (dependencies)
  analyses.forEach(analysis => {
    analysis.dependencies.forEach(dep => {
      // Resolve relative path
      const resolvedPath = resolvePath(analysis.filePath, dep);
      
      // Add edge
      if (nodes.has(resolvedPath)) {
        edges.get(resolvedPath)?.add(analysis.filePath);
        
        // Update dependents
        const depAnalysis = nodes.get(resolvedPath);
        if (depAnalysis) {
          depAnalysis.dependents.push(analysis.filePath);
        }
      }
    });
  });
  
  console.log('✅ Dependency graph built:', nodes.size, 'nodes,', Array.from(edges.values()).reduce((sum, set) => sum + set.size, 0), 'edges');
  
  return { nodes, edges };
}

/**
 * Resolve relative import path
 */
function resolvePath(fromPath: string, importPath: string): string {
  // Simple resolution (can be improved)
  if (importPath.startsWith('./')) {
    const dir = fromPath.substring(0, fromPath.lastIndexOf('/'));
    return dir + '/' + importPath.substring(2);
  }
  
  if (importPath.startsWith('../')) {
    let dir = fromPath.substring(0, fromPath.lastIndexOf('/'));
    let path = importPath;
    
    while (path.startsWith('../')) {
      dir = dir.substring(0, dir.lastIndexOf('/'));
      path = path.substring(3);
    }
    
    return dir + '/' + path;
  }
  
  return importPath;
}

/**
 * Build call hierarchy for a symbol
 */
export function buildCallHierarchy(
  symbolName: string,
  graph: DependencyGraph
): CallHierarchy | null {
  console.log('📞 Building call hierarchy for:', symbolName);
  
  // Find symbol
  let targetSymbol: Symbol | null = null;
  
  for (const [_filePath, analysis] of graph.nodes) {
    const symbol = analysis.symbols.find(s => s.name === symbolName);
    if (symbol) {
      targetSymbol = symbol;
      break;
    }
  }
  
  if (!targetSymbol) {
    console.warn('⚠️ Symbol not found:', symbolName);
    return null;
  }
  
  // Find callers (symbols that call this)
  const callers: string[] = [];
  for (const [filePath, analysis] of graph.nodes) {
    analysis.symbols.forEach(symbol => {
      if (symbol.dependencies.includes(symbolName)) {
        callers.push(`${symbol.name} (${filePath})`);
      }
    });
  }
  
  // Callees are already in dependencies
  const callees = targetSymbol.dependencies;
  
  console.log(`✅ Call hierarchy: ${callers.length} callers, ${callees.length} callees`);
  
  return {
    symbol: symbolName,
    callers,
    callees,
    filePath: targetSymbol.filePath
  };
}

/**
 * Find symbols by name (fuzzy search)
 */
export function findSymbols(
  query: string,
  graph: DependencyGraph,
  limit: number = 10
): Symbol[] {
  const results: Symbol[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const analysis of graph.nodes.values()) {
    for (const symbol of analysis.symbols) {
      if (symbol.name.toLowerCase().includes(lowerQuery)) {
        results.push(symbol);
        if (results.length >= limit) {
          return results;
        }
      }
    }
  }
  
  return results;
}

/**
 * Get related symbols (dependencies + dependents)
 */
export function getRelatedSymbols(
  symbolName: string,
  graph: DependencyGraph
): Symbol[] {
  const related: Symbol[] = [];
  
  // Find the symbol
  let targetSymbol: Symbol | null = null;
  
  for (const [_filePath, analysis] of graph.nodes) {
    const symbol = analysis.symbols.find(s => s.name === symbolName);
    if (symbol) {
      targetSymbol = symbol;
      break;
    }
  }
  
  if (!targetSymbol) return related;
  
  // Add dependencies
  targetSymbol.dependencies.forEach(depName => {
    for (const analysis of graph.nodes.values()) {
      const depSymbol = analysis.symbols.find(s => s.name === depName);
      if (depSymbol) {
        related.push(depSymbol);
      }
    }
  });
  
  // Add dependents (symbols that use this)
  for (const analysis of graph.nodes.values()) {
    analysis.symbols.forEach(symbol => {
      if (symbol.dependencies.includes(symbolName)) {
        related.push(symbol);
      }
    });
  }
  
  return related;
}

/**
 * Get file complexity metrics
 */
export function getComplexityMetrics(analysis: FileAnalysis): {
  totalComplexity: number;
  averageComplexity: number;
  maxComplexity: number;
  highComplexitySymbols: Symbol[];
} {
  const totalComplexity = analysis.complexity;
  const symbolCount = analysis.symbols.filter(s => s.kind === 'function' || s.kind === 'class').length;
  const averageComplexity = symbolCount > 0 ? totalComplexity / symbolCount : 0;
  
  // Find max complexity (would need to store per-symbol complexity)
  const maxComplexity = totalComplexity;
  
  // High complexity symbols (complexity > 10)
  const highComplexitySymbols = analysis.symbols.filter(s => 
    (s.kind === 'function' || s.kind === 'class')
  );
  
  return {
    totalComplexity,
    averageComplexity,
    maxComplexity,
    highComplexitySymbols
  };
}

