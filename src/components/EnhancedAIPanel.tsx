import { useState } from 'react';
import {
  performCodeReview,
  generateDocumentationForPanel,
  generateTestsForPanel,
  suggestRefactoringForPanel,
  scanSecurity,
  analyzePackages,
  analyzeEnvironment
} from '../services/ai';


interface EnhancedAIPanelProps {
  selectedFile: string;
  fileContent: string;
  onClose: () => void;
}

type AITool = 'review' | 'docs' | 'tests' | 'refactor' | 'security' | 'packages' | 'env';

export default function EnhancedAIPanel({ selectedFile, fileContent, onClose }: EnhancedAIPanelProps) {
  const [activeTool, setActiveTool] = useState<AITool>('review');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const tools = [
    {
      id: 'review' as AITool,
      name: 'Code Review',
      icon: '🔍',
      description: 'Kod kalitesi analizi ve öneriler',
      color: 'bg-blue-600'
    },
    {
      id: 'docs' as AITool,
      name: 'Documentation',
      icon: '📚',
      description: 'Otomatik dokümantasyon oluştur',
      color: 'bg-green-600'
    },
    {
      id: 'tests' as AITool,
      name: 'Test Generator',
      icon: '🧪',
      description: 'Unit ve integration testler',
      color: 'bg-purple-600'
    },
    {
      id: 'refactor' as AITool,
      name: 'Refactoring',
      icon: '🔧',
      description: 'Kod iyileştirme önerileri',
      color: 'bg-orange-600'
    },
    {
      id: 'security' as AITool,
      name: 'Security Scan',
      icon: '🔒',
      description: 'Güvenlik açığı taraması',
      color: 'bg-red-600'
    },
    {
      id: 'packages' as AITool,
      name: 'Package Analysis',
      icon: '📦',
      description: 'Paket güvenlik ve güncellik',
      color: 'bg-indigo-600'
    },
    {
      id: 'env' as AITool,
      name: 'Environment',
      icon: '⚙️',
      description: 'Environment değişken analizi',
      color: 'bg-teal-600'
    }
  ];

  const runTool = async (tool: AITool) => {
    if (!selectedFile || !fileContent) {
      alert('Lütfen önce bir dosya seçin');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      let result;

      switch (tool) {
        case 'review':
          result = await performCodeReview(selectedFile, fileContent);
          break;
        case 'docs':
          result = await generateDocumentationForPanel(selectedFile, fileContent);
          break;
        case 'tests':
          result = await generateTestsForPanel(selectedFile, fileContent);
          break;
        case 'refactor':
          result = await suggestRefactoringForPanel(selectedFile, fileContent);
          break;
        case 'security':
          result = await scanSecurity(selectedFile, fileContent);
          break;
        case 'packages':
          if (selectedFile.includes('package.json')) {
            result = await analyzePackages(fileContent);
          } else {
            alert('Package analizi için package.json dosyası seçin');
            return;
          }
          break;
        case 'env':
          if (selectedFile.includes('.env')) {
            result = await analyzeEnvironment(fileContent);
          } else {
            alert('Environment analizi için .env dosyası seçin');
            return;
          }
          break;
        default:
          throw new Error('Bilinmeyen araç');
      }

      setResults(result);
    } catch (error) {
      console.error('AI tool error:', error);
      alert('Analiz sırasında hata oluştu: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    switch (activeTool) {
      case 'review':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${results.score >= 80 ? 'text-green-500' : results.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">Kod Kalitesi Puanı</p>
            </div>

            {results.issues.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🐛 Sorunlar ({results.issues.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.issues.map((issue: any, index: number) => (
                    <div key={index} className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono">Satır {issue.line}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${issue.severity === 'high' ? 'bg-red-500 text-white' :
                          issue.severity === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p>{issue.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">📋 Özet</h4>
              <p className="text-sm">{results.summary}</p>
            </div>
          </div>
        );

      case 'docs':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">📖 README</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-32">{results.readme}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📚 API Docs</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-32">{results.apiDocs}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">💬 Yorum Önerileri</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-32">{results.comments}</pre>
              </div>
            </div>
          </div>
        );

      case 'tests':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🧪 Unit Tests</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-40">{results.unitTests}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🔗 Integration Tests</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-40">{results.integrationTests}</pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📋 Test Planı</h4>
              <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-32">{results.testPlan}</pre>
              </div>
            </div>
          </div>
        );

      case 'refactor':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">📋 Özet</h4>
              <p className="text-sm">{results.summary}</p>
            </div>

            {results.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🔧 Refactoring Önerileri ({results.suggestions.length})</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {results.suggestions.map((suggestion: any, index: number) => (
                    <div key={index} className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs text-white ${suggestion.impact === 'high' ? 'bg-red-500' :
                          suggestion.impact === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}>
                          {suggestion.impact} impact
                        </span>
                        <span className="text-sm font-medium">{suggestion.type}</span>
                      </div>
                      <p className="text-sm mb-2">{suggestion.description}</p>
                      {suggestion.before && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="font-medium mb-1">Önce:</div>
                            <pre className="bg-red-50 p-2 rounded overflow-auto max-h-20">{suggestion.before}</pre>
                          </div>
                          <div>
                            <div className="font-medium mb-1">Sonra:</div>
                            <pre className="bg-green-50 p-2 rounded overflow-auto max-h-20">{suggestion.after}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${results.score >= 80 ? 'text-green-500' : results.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">Güvenlik Puanı</p>
            </div>

            {results.vulnerabilities.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🚨 Güvenlik Açıkları ({results.vulnerabilities.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.vulnerabilities.map((vuln: any, index: number) => (
                    <div key={index} className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono">Satır {vuln.line}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs text-white ${vuln.severity === 'critical' ? 'bg-red-600' :
                          vuln.severity === 'high' ? 'bg-red-500' :
                            vuln.severity === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                          }`}>
                          {vuln.severity}
                        </span>
                        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{vuln.type}</span>
                      </div>
                      <p className="mb-1">{vuln.description}</p>
                      <p className="text-xs text-green-600">💡 {vuln.solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">📋 Özet</h4>
              <p className="text-sm">{results.summary}</p>
            </div>
          </div>
        );

      case 'packages':
        return (
          <div className="space-y-4">
            {results.outdated.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">📦 Eski Paketler ({results.outdated.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.outdated.map((pkg: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm">
                      <span className="font-mono">{pkg.name}</span>
                      <span>{pkg.current} → {pkg.latest}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${pkg.type === 'major' ? 'bg-red-500 text-white' :
                        pkg.type === 'minor' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                        {pkg.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.security.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🚨 Güvenlik Sorunları ({results.security.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.security.map((issue: any, index: number) => (
                    <div key={index} className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono">{issue.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs text-white ${issue.severity === 'critical' ? 'bg-red-600' :
                          issue.severity === 'high' ? 'bg-red-500' :
                            issue.severity === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                          }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p>{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">📋 Özet</h4>
              <p className="text-sm">{results.summary}</p>
            </div>
          </div>
        );

      case 'env':
        return (
          <div className="space-y-4">
            {results.missing.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">❓ Eksik Değişkenler ({results.missing.length})</h4>
                <div className="space-y-1">
                  {results.missing.map((variable: string, index: number) => (
                    <div key={index} className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-mono">
                      {variable}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.insecure.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🚨 Güvenlik Sorunları ({results.insecure.length})</h4>
                <div className="space-y-2">
                  {results.insecure.map((issue: any, index: number) => (
                    <div key={index} className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm">
                      <div className="font-mono font-medium mb-1">{issue.key}</div>
                      <p className="text-red-600 mb-1">{issue.issue}</p>
                      <p className="text-green-600 text-xs">💡 {issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.template && (
              <div>
                <h4 className="font-semibold mb-2">📄 .env.example Şablonu</h4>
                <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded">
                  <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-32">{results.template}</pre>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg w-[900px] h-[700px] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold">🤖 Enhanced AI Tools</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex">
          {/* Sidebar - Tools */}
          <div className="w-64 border-r border-[var(--color-border)] p-3">
            <div className="space-y-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${activeTool === tool.id
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                    : 'hover:bg-[var(--color-hover)] border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl">{tool.icon}</span>
                    <span className="font-medium">{tool.name}</span>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">{tool.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tool Header */}
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tools.find(t => t.id === activeTool)?.icon}</span>
                  <div>
                    <h4 className="font-semibold">{tools.find(t => t.id === activeTool)?.name}</h4>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      {selectedFile ? selectedFile.split('/').pop() : 'Dosya seçilmedi'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => runTool(activeTool)}
                  disabled={isLoading || !selectedFile || !fileContent}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? '⏳ Analiz ediliyor...' : '🚀 Çalıştır'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">🤖</div>
                    <p className="text-[var(--color-textSecondary)]">AI analiz yapıyor...</p>
                  </div>
                </div>
              ) : results ? (
                renderResults()
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-4">{tools.find(t => t.id === activeTool)?.icon}</div>
                    <p className="text-[var(--color-textSecondary)] mb-2">
                      {tools.find(t => t.id === activeTool)?.description}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Analiz başlatmak için "Çalıştır" butonuna tıklayın
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}