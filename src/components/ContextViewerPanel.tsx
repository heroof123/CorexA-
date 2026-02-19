// src/components/ContextViewerPanel.tsx
// Context quality metrics and transparency viewer

import React, { useState, useEffect } from 'react';

interface ContextQualityMetrics {
  qualityScore: number;
  fileCount: number;
  symbolCount: number;
  dependencyDepth: number;
  averageRelevance: number;
  suggestions?: string[];
}

interface ContextViewerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🆕 TASK 23.1: Context Viewer Component
 * Displays context quality metrics and included files
 */
export const ContextViewerPanel: React.FC<ContextViewerPanelProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<ContextQualityMetrics | null>(null);
  const [includedFiles] = useState<Array<{ path: string; reason: string; score: number }>>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Get latest context metrics - placeholder implementation
    // This would be populated from smartContextBuilder's last build
    setMetrics({
      qualityScore: 75,
      fileCount: 10,
      symbolCount: 150,
      dependencyDepth: 3,
      averageRelevance: 0.85,
      suggestions: []
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const getQualityColor = (score: number): string => {
    if (score >= 70) return '#4ec9b0'; // Good - green
    if (score >= 40) return '#dcdcaa'; // Medium - yellow
    return '#f48771'; // Low - red
  };

  const getQualityLabel = (score: number): string => {
    if (score >= 70) return 'Excellent';
    if (score >= 40) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="context-viewer-overlay">
      <div className="context-viewer-panel">
        {/* Header */}
        <div className="panel-header">
          <h2>Context Quality</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Quality Score */}
        {metrics && (
          <div className="quality-section">
            <div className="quality-score-container">
              <div 
                className="quality-score-circle"
                style={{ borderColor: getQualityColor(metrics.qualityScore) }}
              >
                <span className="score-value">{metrics.qualityScore}</span>
                <span className="score-label">/ 100</span>
              </div>
              <div className="quality-info">
                <h3 style={{ color: getQualityColor(metrics.qualityScore) }}>
                  {getQualityLabel(metrics.qualityScore)}
                </h3>
                <p className="quality-description">
                  {metrics.qualityScore >= 70 && 'Context is comprehensive and relevant'}
                  {metrics.qualityScore >= 40 && metrics.qualityScore < 70 && 'Context is adequate but could be improved'}
                  {metrics.qualityScore < 40 && 'Consider adding more relevant files'}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Files Included</div>
                <div className="metric-value">{metrics.fileCount}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Symbols</div>
                <div className="metric-value">{metrics.symbolCount}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Dependency Depth</div>
                <div className="metric-value">{metrics.dependencyDepth}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Avg Relevance</div>
                <div className="metric-value">{(metrics.averageRelevance * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Suggestions */}
            {metrics.suggestions && metrics.suggestions.length > 0 && (
              <div className="suggestions-section">
                <h4>Suggestions</h4>
                <ul className="suggestions-list">
                  {metrics.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Included Files */}
        <div className="files-section">
          <h3>Included Files</h3>
          {includedFiles.length === 0 ? (
            <div className="empty-state">
              No context files available. Start a conversation to see included files.
            </div>
          ) : (
            <div className="files-list">
              {includedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-header">
                    <span className="file-path">{file.path}</span>
                    <span className="file-score">{(file.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="file-reason">{file.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .context-viewer-overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 400px;
          background: #1e1e1e;
          border-left: 1px solid #3c3c3c;
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
        }

        .context-viewer-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #3c3c3c;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cccccc;
        }

        .close-button {
          background: transparent;
          border: none;
          color: #cccccc;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .close-button:hover {
          color: #ffffff;
        }

        .quality-section {
          padding: 20px;
          border-bottom: 1px solid #3c3c3c;
        }

        .quality-score-container {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .quality-score-circle {
          width: 80px;
          height: 80px;
          border: 4px solid;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .score-value {
          font-size: 24px;
          font-weight: bold;
          color: #ffffff;
        }

        .score-label {
          font-size: 12px;
          color: #858585;
        }

        .quality-info {
          flex: 1;
        }

        .quality-info h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .quality-description {
          margin: 0;
          font-size: 13px;
          color: #858585;
          line-height: 1.5;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 6px;
          padding: 12px;
        }

        .metric-label {
          font-size: 11px;
          color: #858585;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #ffffff;
        }

        .suggestions-section {
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 6px;
          padding: 12px;
        }

        .suggestions-section h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #cccccc;
        }

        .suggestions-list {
          margin: 0;
          padding-left: 20px;
          font-size: 12px;
          color: #858585;
        }

        .suggestions-list li {
          margin-bottom: 4px;
        }

        .files-section {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .files-section h3 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #cccccc;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #858585;
          font-size: 13px;
        }

        .files-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .file-item {
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 6px;
          padding: 12px;
        }

        .file-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .file-path {
          font-size: 13px;
          color: #cccccc;
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .file-score {
          font-size: 12px;
          color: #4ec9b0;
          font-weight: 600;
        }

        .file-reason {
          font-size: 12px;
          color: #858585;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
