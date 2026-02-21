import * as monaco from 'monaco-editor';
import { parseFile } from './semanticBrain';
import { gitIntelligence } from './gitIntelligence';

/**
 * 🆕 Smart Code Lens Provider
 * Provides interactive labels above functions and classes
 */
export class SmartCodeLensProvider implements monaco.languages.CodeLensProvider {
    /**
     * 🆕 Provide CodeLens items for a model
     */
    async provideCodeLenses(
        model: monaco.editor.ITextModel,
        _token: monaco.CancellationToken
    ): Promise<monaco.languages.CodeLensList> {
        const filePath = model.uri.path;
        const content = model.getValue();

        try {
            // 1. Parse file for symbols
            const analysis = await parseFile(filePath, content);
            const codeLenses: monaco.languages.CodeLens[] = [];

            for (const symbol of analysis.symbols) {
                // Only show for functions and classes
                if (symbol.kind !== 'function' && symbol.kind !== 'class') {
                    continue;
                }

                const range = new monaco.Range(
                    symbol.line,
                    symbol.column,
                    symbol.line,
                    symbol.column + symbol.name.length
                );

                // A. Complexity Lens
                const complexity = this.estimateComplexity(symbol.signature || '');
                codeLenses.push({
                    range,
                    command: {
                        id: 'corex.showComplexityInfo',
                        title: `📊 Complexity: ${this.getComplexityLabel(complexity)}`,
                        arguments: [symbol]
                    }
                });

                // B. Author Lens (Async loading)
                codeLenses.push({
                    range,
                    command: {
                        id: 'corex.showAuthorInfo',
                        title: `👤 Loading author...`,
                        arguments: [filePath, symbol]
                    }
                });
            }

            return {
                lenses: codeLenses,
                dispose: () => { }
            };
        } catch (error) {
            console.error('❌ CodeLens provider error:', error);
            return { lenses: [], dispose: () => { } };
        }
    }

    /**
     * 🆕 Resolve CodeLens (for lazy loading metadata)
     */
    async resolveCodeLens(
        _model: monaco.editor.ITextModel,
        codeLens: monaco.languages.CodeLens,
        _token: monaco.CancellationToken
    ): Promise<monaco.languages.CodeLens> {
        if (codeLens.command?.id === 'corex.showAuthorInfo') {
            const [filePath, symbol] = codeLens.command.arguments as [string, any];

            try {
                // Get git history for this section
                const commits = await gitIntelligence.findCommitsForSection(filePath, {
                    startLine: symbol.line,
                    endLine: symbol.line + 5, // Approximate
                    content: ''
                });

                if (commits.length > 0) {
                    const lastCommit = commits[0];
                    codeLens.command.title = `👤 ${lastCommit.author} • ${new Date(lastCommit.timestamp).toLocaleDateString()}`;
                } else {
                    codeLens.command.title = `👤 No git history`;
                }
            } catch (error) {
                codeLens.command.title = `👤 Author unknown`;
            }
        }

        return codeLens;
    }

    private estimateComplexity(signature: string): number {
        let complexity = 1;
        complexity += (signature.match(/if|else|for|while|case|&&|\|\||\?|catch/g) || []).length;
        return complexity;
    }

    private getComplexityLabel(complexity: number): string {
        if (complexity > 15) return '🔴 Very High';
        if (complexity > 10) return '🟠 High';
        if (complexity > 5) return '🟡 Medium';
        return '🟢 Low';
    }
}

export const smartCodeLensProvider = new SmartCodeLensProvider();
