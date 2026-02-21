// services/ghostDeveloper.ts - Ghost Developer Mode
// 🧠 TASK 29: Background code analysis and proactive suggestions

import {
  parseFile,
  buildDependencyGraph,
  getComplexityMetrics,
  type FileAnalysis,
  type DependencyGraph,
  type Symbol
} from "./semanticBrain";
import { FileIndex } from "../types/index";

export interface GhostSuggestion {
  id: string;
  type: 'unused-code' | 'refactor' | 'architecture' | 'dependency' | 'complexity' | 'best-practice';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  filePath: string;
  line?: number;
  suggestion: string;
  autoFixable: boolean;
  priority: number; // 1-10 (10 = highest)
}

export interface ArchitectureInsight {
  type: 'circular-dependency' | 'god-class' | 'dead-code' | 'duplicate-code' | 'design-pattern';
  title: string;
  description: string;
  affectedFiles: string[];
  severity: 'info' | 'warning' | 'error';
  recommendation: string;
}

export interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  totalSymbols: number;
  averageComplexity: number;
  highComplexityFiles: string[];
  unusedExports: number;
  circularDependencies: number;
  duplicateCode: number;
}

export class GhostDeveloper {
  private analysisCache: Map<string, FileAnalysis> = new Map();
  private dependencyGraph: DependencyGraph | null = null;
  private lastAnalysis: number = 0;
  private analysisInterval: number = 60000; // 1 dakika
  private isAnalyzing: boolean = false;

  /**
   * 🎯 Analyze active file deep - sadece aktif dosyaya odaklan
   */
  async analyzeActiveFile(path: string, content: string): Promise<GhostSuggestion[]> {
    if (this.isAnalyzing) return [];

    // Yalnızca kod dosyaları
    if (!/\.(ts|tsx|js|jsx)$/.test(path)) return [];

    try {
      this.isAnalyzing = true;
      const analysis = await parseFile(path, content);
      this.analysisCache.set(path, analysis);

      return this.generateSuggestions([analysis], [{
        path,
        content,
        embedding: [],
        lastModified: Date.now()
      }]);
    } catch (e) {
      console.warn('⚠️ Active file analysis failed:', path, e);
      return [];
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 🔍 Background analysis - tüm projeyi analiz et
   */
  async analyzeProject(fileIndex: FileIndex[]): Promise<{
    suggestions: GhostSuggestion[];
    insights: ArchitectureInsight[];
    metrics: CodeMetrics;
  }> {
    const now = Date.now();

    // Çok sık analiz yapma
    if (this.isAnalyzing || (now - this.lastAnalysis < this.analysisInterval)) {
      return {
        suggestions: [],
        insights: [],
        metrics: this.getEmptyMetrics()
      };
    }

    this.isAnalyzing = true;
    this.lastAnalysis = now;

    console.log('👻 Ghost Developer: Starting background analysis...');

    try {
      // 1. Parse all TypeScript/JavaScript files
      const analyses: FileAnalysis[] = [];

      for (const file of fileIndex) {
        if (/\.(ts|tsx|js|jsx)$/.test(file.path)) {
          try {
            const analysis = await parseFile(file.path, file.content);
            analyses.push(analysis);
            this.analysisCache.set(file.path, analysis);
          } catch (error) {
            console.warn('⚠️ Failed to parse:', file.path, error);
          }
        }
      }

      // 2. Build dependency graph
      if (analyses.length > 0) {
        this.dependencyGraph = buildDependencyGraph(analyses);
      }

      // 3. Generate suggestions
      const suggestions = this.generateSuggestions(analyses, fileIndex);

      // 4. Generate architecture insights
      const insights = this.generateArchitectureInsights(analyses);

      // 5. Calculate metrics
      const metrics = this.calculateMetrics(analyses);

      console.log('✅ Ghost Developer: Analysis complete');
      console.log(`   - ${suggestions.length} suggestions`);
      console.log(`   - ${insights.length} insights`);
      console.log(`   - ${metrics.totalFiles} files analyzed`);

      return { suggestions, insights, metrics };
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 🎯 Generate code suggestions
   */
  private generateSuggestions(analyses: FileAnalysis[], fileIndex: FileIndex[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    // 1. Unused exports
    suggestions.push(...this.findUnusedExports(analyses));

    // 2. High complexity functions
    suggestions.push(...this.findHighComplexityCode(analyses));

    // 3. Missing error handling
    suggestions.push(...this.findMissingErrorHandling(fileIndex));

    // 4. Console.log statements
    suggestions.push(...this.findConsoleStatements(fileIndex));

    // 5. Large files
    suggestions.push(...this.findLargeFiles(analyses));

    // 6. Duplicate code patterns
    suggestions.push(...this.findDuplicatePatterns(analyses));

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 🏗️ Generate architecture insights
   */
  private generateArchitectureInsights(analyses: FileAnalysis[]): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];

    // 1. Circular dependencies
    insights.push(...this.detectCircularDependencies());

    // 2. God classes (too many responsibilities)
    insights.push(...this.detectGodClasses(analyses));

    // 3. Dead code (unused files)
    insights.push(...this.detectDeadCode(analyses));

    return insights;
  }

  /**
   * 📊 Calculate code metrics
   */
  private calculateMetrics(analyses: FileAnalysis[]): CodeMetrics {
    const totalFiles = analyses.length;
    const totalLines = analyses.reduce((sum, a) => sum + a.linesOfCode, 0);
    const totalSymbols = analyses.reduce((sum, a) => sum + a.symbols.length, 0);

    const complexities = analyses.map(a => {
      const metrics = getComplexityMetrics(a);
      return metrics.averageComplexity;
    });

    const averageComplexity = complexities.length > 0
      ? complexities.reduce((sum, c) => sum + c, 0) / complexities.length
      : 0;

    const highComplexityFiles = analyses
      .filter(a => {
        const metrics = getComplexityMetrics(a);
        return metrics.averageComplexity > 10;
      })
      .map(a => a.filePath);

    const unusedExports = this.countUnusedExports(analyses);
    const circularDependencies = this.countCircularDependencies();

    return {
      totalFiles,
      totalLines,
      totalSymbols,
      averageComplexity,
      highComplexityFiles,
      unusedExports,
      circularDependencies,
      duplicateCode: 0 // TODO: Implement
    };
  }

  /**
   * 🔍 Find unused exports
   */
  private findUnusedExports(analyses: FileAnalysis[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    if (!this.dependencyGraph) return suggestions;

    // Build a map of all imported symbols
    const importedSymbols = new Set<string>();

    analyses.forEach(analysis => {
      analysis.imports.forEach(imp => {
        imp.importedSymbols.forEach(symbol => {
          importedSymbols.add(symbol);
        });
      });
    });

    // Find exported symbols that are never imported
    analyses.forEach(analysis => {
      const unusedExports = analysis.symbols.filter(symbol =>
        symbol.isExported && !importedSymbols.has(symbol.name)
      );

      if (unusedExports.length > 0) {
        suggestions.push({
          id: `unused-exports-${analysis.filePath}`,
          type: 'unused-code',
          severity: 'warning',
          title: `${unusedExports.length} kullanılmayan export`,
          description: `Bu dosyada ${unusedExports.length} export var ama hiçbiri kullanılmıyor.`,
          filePath: analysis.filePath,
          suggestion: `Kullanılmayan exportları kaldırın: ${unusedExports.map(s => s.name).join(', ')}`,
          autoFixable: true,
          priority: 7
        });
      }
    });

    return suggestions;
  }

  /**
   * 🔥 Find high complexity code
   */
  private findHighComplexityCode(analyses: FileAnalysis[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    analyses.forEach(analysis => {
      const metrics = getComplexityMetrics(analysis);

      if (metrics.averageComplexity > 10) {
        suggestions.push({
          id: `high-complexity-${analysis.filePath}`,
          type: 'complexity',
          severity: 'warning',
          title: 'Yüksek kod karmaşıklığı',
          description: `Bu dosyanın ortalama karmaşıklığı ${metrics.averageComplexity.toFixed(1)} (ideal: <10)`,
          filePath: analysis.filePath,
          suggestion: 'Fonksiyonları daha küçük parçalara bölün ve refactor edin.',
          autoFixable: false,
          priority: 8
        });
      }

      // Check individual symbols
      metrics.highComplexitySymbols.forEach(symbol => {
        if (symbol.kind === 'function' || symbol.kind === 'class') {
          suggestions.push({
            id: `complex-symbol-${symbol.filePath}-${symbol.name}`,
            type: 'refactor',
            severity: 'info',
            title: `${symbol.name} çok karmaşık`,
            description: `Bu ${symbol.kind} refactor edilmeli.`,
            filePath: symbol.filePath,
            line: symbol.line,
            suggestion: 'Daha küçük fonksiyonlara bölün veya Extract Method pattern kullanın.',
            autoFixable: false,
            priority: 6
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * 🛡️ Find missing error handling
   */
  private findMissingErrorHandling(fileIndex: FileIndex[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    fileIndex.forEach(file => {
      if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) return;

      const content = file.content;

      // Check for async functions without try-catch
      const asyncFunctionRegex = /async\s+function\s+\w+|async\s+\(/g;
      const asyncMatches = content.match(asyncFunctionRegex);

      if (asyncMatches && asyncMatches.length > 0) {
        const hasTryCatch = content.includes('try') && content.includes('catch');

        if (!hasTryCatch) {
          suggestions.push({
            id: `missing-error-handling-${file.path}`,
            type: 'best-practice',
            severity: 'warning',
            title: 'Async fonksiyonlarda hata yönetimi eksik',
            description: 'Bu dosyada async fonksiyonlar var ama try-catch yok.',
            filePath: file.path,
            suggestion: 'Async fonksiyonlara try-catch blokları ekleyin.',
            autoFixable: false,
            priority: 7
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * 🧹 Find console statements
   */
  private findConsoleStatements(fileIndex: FileIndex[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    const filesWithConsole = fileIndex.filter(f =>
      /\.(ts|tsx|js|jsx)$/.test(f.path) && f.content.includes('console.')
    );

    if (filesWithConsole.length > 5) {
      suggestions.push({
        id: 'console-statements',
        type: 'best-practice',
        severity: 'info',
        title: `${filesWithConsole.length} dosyada console kullanımı`,
        description: 'Production kodunda console.log kullanımını temizleyin.',
        filePath: filesWithConsole[0].path,
        suggestion: 'Console statement\'ları kaldırın veya logger kullanın.',
        autoFixable: true,
        priority: 5
      });
    }

    return suggestions;
  }

  /**
   * 📦 Find large files
   */
  private findLargeFiles(analyses: FileAnalysis[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    const largeFiles = analyses.filter(a => a.linesOfCode > 500);

    largeFiles.forEach(analysis => {
      suggestions.push({
        id: `large-file-${analysis.filePath}`,
        type: 'refactor',
        severity: 'info',
        title: 'Büyük dosya',
        description: `Bu dosya ${analysis.linesOfCode} satır (ideal: <500)`,
        filePath: analysis.filePath,
        suggestion: 'Dosyayı daha küçük modüllere bölün.',
        autoFixable: false,
        priority: 4
      });
    });

    return suggestions;
  }

  /**
   * 🔄 Find duplicate code patterns
   */
  private findDuplicatePatterns(analyses: FileAnalysis[]): GhostSuggestion[] {
    const suggestions: GhostSuggestion[] = [];

    // Simple duplicate detection: same function signatures
    const signatureMap = new Map<string, Symbol[]>();

    analyses.forEach(analysis => {
      analysis.symbols.forEach(symbol => {
        if (symbol.signature) {
          const existing = signatureMap.get(symbol.signature) || [];
          existing.push(symbol);
          signatureMap.set(symbol.signature, existing);
        }
      });
    });

    // Find duplicates
    signatureMap.forEach((symbols, signature) => {
      if (symbols.length > 1) {
        suggestions.push({
          id: `duplicate-${signature}`,
          type: 'refactor',
          severity: 'info',
          title: 'Duplicate kod tespit edildi',
          description: `"${symbols[0].name}" fonksiyonu ${symbols.length} yerde tekrar ediyor.`,
          filePath: symbols[0].filePath,
          line: symbols[0].line,
          suggestion: 'Ortak bir utility fonksiyonu oluşturun.',
          autoFixable: false,
          priority: 6
        });
      }
    });

    return suggestions;
  }

  /**
   * 🔄 Detect circular dependencies
   */
  private detectCircularDependencies(): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];

    if (!this.dependencyGraph) return insights;

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const analysis = this.dependencyGraph!.nodes.get(node);
      if (analysis) {
        analysis.dependencies.forEach(dep => {
          if (!visited.has(dep)) {
            dfs(dep, [...path]);
          } else if (recursionStack.has(dep)) {
            // Cycle detected
            const cycleStart = path.indexOf(dep);
            if (cycleStart !== -1) {
              cycles.push(path.slice(cycleStart));
            }
          }
        });
      }

      recursionStack.delete(node);
    };

    // Check all nodes
    this.dependencyGraph.nodes.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    });

    // Create insights for cycles
    cycles.forEach((cycle) => {
      insights.push({
        type: 'circular-dependency',
        title: 'Circular dependency tespit edildi',
        description: `${cycle.length} dosya arasında döngüsel bağımlılık var.`,
        affectedFiles: cycle,
        severity: 'warning',
        recommendation: 'Dependency injection veya interface segregation kullanarak döngüyü kırın.'
      });
    });

    return insights;
  }

  /**
   * 👹 Detect god classes (too many responsibilities)
   */
  private detectGodClasses(analyses: FileAnalysis[]): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];

    analyses.forEach(analysis => {
      const classes = analysis.symbols.filter(s => s.kind === 'class');

      classes.forEach(classSymbol => {
        // Count methods in class (rough estimate)
        const methodCount = analysis.symbols.filter(s =>
          s.kind === 'function' && s.filePath === classSymbol.filePath
        ).length;

        if (methodCount > 20) {
          insights.push({
            type: 'god-class',
            title: `${classSymbol.name} çok fazla sorumluluk taşıyor`,
            description: `Bu class ${methodCount} metoda sahip (ideal: <20)`,
            affectedFiles: [classSymbol.filePath],
            severity: 'warning',
            recommendation: 'Single Responsibility Principle uygulayın ve class\'ı daha küçük parçalara bölün.'
          });
        }
      });
    });

    return insights;
  }

  /**
   * 💀 Detect dead code (unused files)
   */
  private detectDeadCode(analyses: FileAnalysis[]): ArchitectureInsight[] {
    const insights: ArchitectureInsight[] = [];

    if (!this.dependencyGraph) return insights;

    // Find files with no dependents (not imported by anyone)
    const deadFiles = analyses.filter(analysis =>
      analysis.dependents.length === 0 &&
      !analysis.filePath.includes('main.') && // Exclude entry points
      !analysis.filePath.includes('index.')
    );

    if (deadFiles.length > 0) {
      insights.push({
        type: 'dead-code',
        title: `${deadFiles.length} kullanılmayan dosya`,
        description: 'Bu dosyalar hiçbir yerde import edilmiyor.',
        affectedFiles: deadFiles.map(f => f.filePath),
        severity: 'info',
        recommendation: 'Kullanılmayan dosyaları silin veya kullanmaya başlayın.'
      });
    }

    return insights;
  }

  /**
   * 📊 Count unused exports
   */
  private countUnusedExports(analyses: FileAnalysis[]): number {
    const importedSymbols = new Set<string>();

    analyses.forEach(analysis => {
      analysis.imports.forEach(imp => {
        imp.importedSymbols.forEach(symbol => {
          importedSymbols.add(symbol);
        });
      });
    });

    let count = 0;

    analyses.forEach(analysis => {
      analysis.symbols.forEach(symbol => {
        if (symbol.isExported && !importedSymbols.has(symbol.name)) {
          count++;
        }
      });
    });

    return count;
  }

  /**
   * 🔄 Count circular dependencies
   */
  private countCircularDependencies(): number {
    if (!this.dependencyGraph) return 0;

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let cycleCount = 0;

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);

      const analysis = this.dependencyGraph!.nodes.get(node);
      if (analysis) {
        analysis.dependencies.forEach(dep => {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recursionStack.has(dep)) {
            cycleCount++;
          }
        });
      }

      recursionStack.delete(node);
    };

    this.dependencyGraph.nodes.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    return cycleCount;
  }

  /**
   * 🕸️ Get dependency graph for visualization
   */
  getDependencyGraph() {
    if (!this.dependencyGraph) return { nodes: [], links: [] };

    const nodes: { id: string; name: string; val: number }[] = [];
    const links: { source: string; target: string }[] = [];

    // Add nodes
    this.dependencyGraph.nodes.forEach((analysis, path) => {
      nodes.push({
        id: path,
        name: path.split('/').pop() || path,
        val: analysis.linesOfCode / 100 + 1 // Satır sayısına göre boyut
      });

      // Add edges (links)
      analysis.dependencies.forEach(dep => {
        // Not: resolvePath semanticBrain'den alınabilir veya burada basitçe yapılabilir
        // dependencyGraph zaten çözülmüş yolları içerdiği varsayılıyor (buildDependencyGraph'a bak)
        // Nodes map'inde anahtar olarak tam yol kullanılıyor.

        // buildDependencyGraph içerisinde resolvedPath kullanılıyor.
        // Biz burada sadece mevcut düğümleri kontrol ediyoruz.
        links.push({
          source: path,
          target: dep // buildDependencyGraph'ta dep resolution yapılmış olmalı
        });
      });
    });

    return { nodes, links };
  }

  /**
   * 📊 Get empty metrics
   */
  private getEmptyMetrics(): CodeMetrics {
    return {
      totalFiles: 0,
      totalLines: 0,
      totalSymbols: 0,
      averageComplexity: 0,
      highComplexityFiles: [],
      unusedExports: 0,
      circularDependencies: 0,
      duplicateCode: 0
    };
  }

  /**
   * 🧹 Clear cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.dependencyGraph = null;
    this.lastAnalysis = 0;
    console.log('🗑️ Ghost Developer cache cleared');
  }

  /**
   * 📊 Get cache stats
   */
  getCacheStats(): {
    cachedFiles: number;
    lastAnalysis: number;
    isAnalyzing: boolean;
  } {
    return {
      cachedFiles: this.analysisCache.size,
      lastAnalysis: this.lastAnalysis,
      isAnalyzing: this.isAnalyzing
    };
  }
}

// Singleton instance
export const ghostDeveloper = new GhostDeveloper();
