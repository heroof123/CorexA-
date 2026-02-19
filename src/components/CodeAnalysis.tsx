// CodeAnalysis.tsx — Full AI-powered, no fake regex
// Her analiz gerçek yüklü AI modeline gönderilir.
import { useState, useEffect, useCallback } from 'react';
import { useCore } from '../hooks/useCore';
import type { FileIndex } from '../types/index';

interface CodeAnalysisProps {
  onClose: () => void;
  // App.tsx'ten geçirilen opsiyonel prop'lar (arka plan modu için)
  isOpen?: boolean;
  fileIndex?: FileIndex[];
  currentFile?: string;
  onNavigateToIssue?: (file: string, line: number) => void;
}

interface FileReview {
  filePath: string;
  fileName: string;
  score: number;
  issues: Array<{
    line: number;
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
  summary: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  errorMessage?: string;
}

interface AnalysisState {
  files: FileReview[];
  totalFiles: number;
  analyzedFiles: number;
  isRunning: boolean;
  activeTab: 'overview' | 'issues' | 'suggestions';
  selectedFile: string | null;
}

export default function CodeAnalysis({ onClose }: CodeAnalysisProps) {
  const core = useCore();
  // fileIndex: prop olarak geçildiyse onu kullan, yoksa useCore'dan al
  const fileIndex = (core as any).fileIndex as import('../types/index').FileIndex[] || [];

  const [state, setState] = useState<AnalysisState>({
    files: [],
    totalFiles: 0,
    analyzedFiles: 0,
    isRunning: false,
    activeTab: 'overview',
    selectedFile: null,
  });

  // Analiz edilebilir dosyalar
  const getAnalyzableFiles = useCallback(() => {
    return fileIndex.filter((f: import('../types/index').FileIndex) => {
      const ext = f.path.split('.').pop()?.toLowerCase();
      return ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'css', 'html'].includes(ext || '');
    }).slice(0, 30); // Max 30 dosya (çok büyük projelerde limit)
  }, [fileIndex]);

  // AI analizini başlat
  const startAnalysis = useCallback(async () => {
    const analyzableFiles = getAnalyzableFiles();

    if (analyzableFiles.length === 0) {
      alert('Analiz edilebilecek dosya bulunamadı. Bir proje klasörü açın.');
      return;
    }

    // State'i sıfırla
    const initialFiles: FileReview[] = analyzableFiles.map((f: import('../types/index').FileIndex) => ({
      filePath: f.path,
      fileName: f.path.split(/[/\\]/).pop() || f.path,
      score: 0,
      issues: [],
      suggestions: [],
      summary: '',
      status: 'pending'
    }));

    setState(prev => ({
      ...prev,
      files: initialFiles,
      totalFiles: analyzableFiles.length,
      analyzedFiles: 0,
      isRunning: true,
      selectedFile: null,
    }));

    // Dosyaları sırasıyla AI ile analiz et
    const { performCodeReview } = await import('../services/ai');

    for (let i = 0; i < analyzableFiles.length; i++) {
      const file = analyzableFiles[i];

      // Bu dosyayı "analyzing" olarak işaretle
      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.filePath === file.path ? { ...f, status: 'analyzing' } : f
        )
      }));

      try {
        const content = file.content || '';
        if (!content.trim()) {
          setState(prev => ({
            ...prev,
            analyzedFiles: prev.analyzedFiles + 1,
            files: prev.files.map(f =>
              f.filePath === file.path ? {
                ...f,
                status: 'done',
                score: 100,
                summary: 'Dosya boş veya içerik okunamadı.',
                issues: [],
                suggestions: []
              } : f
            )
          }));
          continue;
        }

        const result = await performCodeReview(file.path, content);

        setState(prev => ({
          ...prev,
          analyzedFiles: prev.analyzedFiles + 1,
          files: prev.files.map(f =>
            f.filePath === file.path ? {
              ...f,
              status: 'done',
              score: result.score,
              issues: result.issues,
              suggestions: result.suggestions,
              summary: result.summary
            } : f
          )
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          analyzedFiles: prev.analyzedFiles + 1,
          files: prev.files.map(f =>
            f.filePath === file.path ? {
              ...f,
              status: 'error',
              score: 0,
              errorMessage: String(err)
            } : f
          )
        }));
      }
    }

    setState(prev => ({ ...prev, isRunning: false }));
  }, [getAnalyzableFiles]);

  useEffect(() => {
    // Panel açılınca otomatik analizi başlat
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hesaplamalar
  const doneFiles = state.files.filter(f => f.status === 'done');
  const avgScore = doneFiles.length > 0
    ? Math.round(doneFiles.reduce((s, f) => s + f.score, 0) / doneFiles.length)
    : 0;
  const allIssues = doneFiles.flatMap(f => f.issues.map(i => ({ ...i, fileName: f.fileName, filePath: f.filePath })));
  const allSuggestions = doneFiles.flatMap(f => f.suggestions.map(s => ({ text: s, fileName: f.fileName })));
  const criticalCount = allIssues.filter(i => i.severity === 'high').length;

  const selectedFileData = state.selectedFile
    ? state.files.find(f => f.filePath === state.selectedFile)
    : null;

  const scoreColor = (score: number) =>
    score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  const statusIcon = (status: FileReview['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'analyzing': return '🔄';
      case 'done': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        width: '90vw', maxWidth: 1000,
        height: '85vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700 }}>
                AI Kod Analizi
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 12 }}>
                Yüklü AI modeli ile gerçek analiz
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!state.isRunning && (
              <button
                onClick={startAnalysis}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 14px',
                  cursor: 'pointer', fontSize: 13
                }}
              >
                🔄 Yeniden Analiz Et
              </button>
            )}
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 12px',
              cursor: 'pointer', fontSize: 16
            }}>✕</button>
          </div>
        </div>

        {/* Progress bar */}
        {state.isRunning && (
          <div style={{ padding: '8px 20px', background: 'var(--color-background)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>
                AI analiz ediliyor... ({state.analyzedFiles}/{state.totalFiles})
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>
                {state.totalFiles > 0 ? Math.round((state.analyzedFiles / state.totalFiles) * 100) : 0}%
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${state.totalFiles > 0 ? (state.analyzedFiles / state.totalFiles) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                borderRadius: 2,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sol panel — dosya listesi */}
          <div style={{
            width: 280, borderRight: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
          }}>
            {/* Özet istatistikler */}
            {doneFiles.length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-background)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(avgScore) }}>
                      {doneFiles.length > 0 ? avgScore : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-textSecondary)' }}>Ort. Skor</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-background)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: criticalCount > 0 ? '#ef4444' : '#22c55e' }}>
                      {criticalCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-textSecondary)' }}>Kritik Sorun</div>
                  </div>
                </div>
              </div>
            )}

            {/* Dosya listesi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {state.files.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--color-textSecondary)', textAlign: 'center', fontSize: 13 }}>
                  {state.isRunning ? '🔄 Başlatılıyor...' : 'Dosya bulunamadı'}
                </div>
              ) : (
                state.files.map(file => (
                  <div
                    key={file.filePath}
                    onClick={() => file.status === 'done' && setState(prev => ({ ...prev, selectedFile: file.filePath }))}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 4,
                      cursor: file.status === 'done' ? 'pointer' : 'default',
                      background: state.selectedFile === file.filePath
                        ? 'var(--color-primary)20'
                        : 'transparent',
                      border: state.selectedFile === file.filePath
                        ? '1px solid var(--color-primary)'
                        : '1px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{statusIcon(file.status)}</span>
                      {file.status === 'analyzing' && (
                        <span style={{ fontSize: 10, animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>
                      )}
                      <span style={{
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', fontSize: 13
                      }}>
                        {file.fileName}
                      </span>
                      {file.status === 'done' && (
                        <span style={{
                          fontWeight: 700, fontSize: 12,
                          color: scoreColor(file.score),
                          minWidth: 28, textAlign: 'right'
                        }}>
                          {file.score}
                        </span>
                      )}
                    </div>
                    {file.status === 'analyzing' && (
                      <div style={{ fontSize: 10, color: 'var(--color-textSecondary)', marginTop: 2, paddingLeft: 24 }}>
                        AI analiz ediyor...
                      </div>
                    )}
                    {file.status === 'done' && file.issues.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--color-textSecondary)', marginTop: 2, paddingLeft: 24 }}>
                        {file.issues.length} sorun
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sağ panel — detaylar */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!selectedFileData ? (
              /* Genel özet göster */
              <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                {state.isRunning && doneFiles.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                    <h3 style={{ color: 'var(--color-text)' }}>AI Analiz Yapıyor...</h3>
                    <p style={{ color: 'var(--color-textSecondary)' }}>
                      {state.totalFiles} dosya sırasıyla inceleniyor. Bu işlem birkaç dakika sürebilir.
                    </p>
                  </div>
                ) : doneFiles.length > 0 ? (
                  <div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
                      {(['overview', 'issues', 'suggestions'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: state.activeTab === tab ? 'var(--color-primary)' : 'var(--color-background)',
                            color: state.activeTab === tab ? '#fff' : 'var(--color-text)',
                            cursor: 'pointer', fontSize: 13, fontWeight: 500
                          }}
                        >
                          {tab === 'overview' ? '📊 Genel' : tab === 'issues' ? `🐛 Sorunlar (${allIssues.length})` : `💡 Öneriler (${allSuggestions.length})`}
                        </button>
                      ))}
                    </div>

                    {state.activeTab === 'overview' && (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                          {[
                            { label: 'Analiz Edilen Dosya', value: doneFiles.length, color: '#2563eb' },
                            { label: 'Ortalama Kalite Skoru', value: `${avgScore}/100`, color: scoreColor(avgScore) },
                            { label: 'Toplam Sorun', value: allIssues.length, color: allIssues.length === 0 ? '#22c55e' : '#ef4444' },
                          ].map(stat => (
                            <div key={stat.label} style={{
                              padding: 16, background: 'var(--color-background)',
                              borderRadius: 12, border: '1px solid var(--color-border)', textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                              <div style={{ fontSize: 12, color: 'var(--color-textSecondary)', marginTop: 4 }}>{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Dosya skor listesi */}
                        <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>📁</span> Dosya Kalite Raporu
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[...doneFiles].sort((a, b) => a.score - b.score).map(file => (
                            <div
                              key={file.filePath}
                              onClick={() => setState(prev => ({ ...prev, selectedFile: file.filePath }))}
                              style={{
                                padding: '10px 14px',
                                background: 'var(--color-background)',
                                borderRadius: 8,
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 12
                              }}
                            >
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${scoreColor(file.score)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontWeight: 700, color: scoreColor(file.score), fontSize: 14 }}>{file.score}</span>
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-textSecondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.summary.substring(0, 80)}...</div>
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                {file.issues.filter(i => i.severity === 'high').length > 0 && (
                                  <span style={{ padding: '2px 6px', background: '#ef444420', color: '#ef4444', borderRadius: 4, fontSize: 11 }}>
                                    {file.issues.filter(i => i.severity === 'high').length} 🔴
                                  </span>
                                )}
                                {file.issues.filter(i => i.severity === 'medium').length > 0 && (
                                  <span style={{ padding: '2px 6px', background: '#eab30820', color: '#eab308', borderRadius: 4, fontSize: 11 }}>
                                    {file.issues.filter(i => i.severity === 'medium').length} 🟡
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {state.activeTab === 'issues' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {allIssues.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 40 }}>🎉</div>
                            <p style={{ color: 'var(--color-textSecondary)' }}>Sorun bulunamadı!</p>
                          </div>
                        ) : (
                          [...allIssues].sort((a, b) => {
                            const order = { high: 0, medium: 1, low: 2 };
                            return order[a.severity] - order[b.severity];
                          }).map((issue, idx) => (
                            <div key={idx} style={{
                              padding: '10px 14px',
                              background: 'var(--color-background)',
                              borderRadius: 8,
                              border: `1px solid ${issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#eab308' : 'var(--color-border)'}30`
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                  background: issue.severity === 'high' ? '#ef444420' : issue.severity === 'medium' ? '#eab30820' : '#3b82f620',
                                  color: issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#eab308' : '#3b82f6'
                                }}>
                                  {issue.severity === 'high' ? '🔴 Kritik' : issue.severity === 'medium' ? '🟡 Orta' : '🔵 Düşük'}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--color-textSecondary)' }}>
                                  {issue.fileName} {issue.line > 0 && `— Satır ${issue.line}`}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13 }}>{issue.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {state.activeTab === 'suggestions' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {allSuggestions.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-textSecondary)' }}>Öneri bulunamadı</div>
                        ) : (
                          allSuggestions.map((s, idx) => (
                            <div key={idx} style={{
                              padding: '10px 14px',
                              background: 'var(--color-background)',
                              borderRadius: 8, border: '1px solid var(--color-border)',
                              display: 'flex', gap: 10
                            }}>
                              <span style={{ color: '#7c3aed', flexShrink: 0 }}>💡</span>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--color-textSecondary)', marginBottom: 2 }}>{s.fileName}</div>
                                <p style={{ margin: 0, fontSize: 13 }}>{s.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-textSecondary)' }}>
                    <div style={{ fontSize: 40 }}>📁</div>
                    <p>Bir dosya seçin veya analiz başlatın</p>
                  </div>
                )}
              </div>
            ) : (
              /* Seçili dosya detayı */
              <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                <button
                  onClick={() => setState(prev => ({ ...prev, selectedFile: null }))}
                  style={{
                    background: 'none', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer', color: 'var(--color-text)',
                    marginBottom: 16, fontSize: 13
                  }}
                >
                  ← Genel Görünüm
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `${scoreColor(selectedFileData.score)}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(selectedFileData.score) }}>
                      {selectedFileData.score}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>{selectedFileData.fileName}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-textSecondary)' }}>
                      {selectedFileData.filePath}
                    </p>
                  </div>
                </div>

                {selectedFileData.summary && (
                  <div style={{ padding: 14, background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>📋 AI Özeti</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-textSecondary)', lineHeight: 1.6 }}>{selectedFileData.summary}</p>
                  </div>
                )}

                {selectedFileData.issues.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 10, fontSize: 14 }}>🐛 Sorunlar ({selectedFileData.issues.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedFileData.issues.map((issue, idx) => (
                        <div key={idx} style={{
                          padding: '8px 12px',
                          background: 'var(--color-background)',
                          borderRadius: 6,
                          border: `1px solid ${issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#eab308' : 'var(--color-border)'}40`
                        }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            {issue.line > 0 && <code style={{ fontSize: 11, background: 'var(--color-border)', padding: '1px 4px', borderRadius: 3 }}>Satır {issue.line}</code>}
                            <span style={{
                              fontSize: 11, padding: '1px 6px', borderRadius: 3,
                              background: issue.severity === 'high' ? '#ef444420' : issue.severity === 'medium' ? '#eab30820' : '#3b82f620',
                              color: issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#eab308' : '#3b82f6'
                            }}>{issue.type}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13 }}>{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFileData.suggestions.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 10, fontSize: 14 }}>💡 Öneriler</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedFileData.suggestions.map((s, idx) => (
                        <div key={idx} style={{
                          padding: '8px 12px',
                          background: 'var(--color-background)',
                          borderRadius: 6, border: '1px solid var(--color-border)',
                          fontSize: 13, display: 'flex', gap: 8
                        }}>
                          <span>✨</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}