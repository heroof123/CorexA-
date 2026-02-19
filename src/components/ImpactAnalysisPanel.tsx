// src/components/ImpactAnalysisPanel.tsx
// Impact analysis results viewer

import React, { useState, useEffect } from 'react';
import { impactAnalysis } from '../services/impactAnalysis';

export interface ImpactResult {
  filePath: string;
  impactScore: number;
  directDependents: string[];
  transitiveDependents: string[];
  affectedSymbols: string[];
  isHighRisk: boolean;
  affectsAPI: boolean;
  symbolReferences?: Array<{ symbol: string; count: number }>;
}

interface ImpactAnalysisPanelProps {
  filePath: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🆕 TASK 23.2: Impact Analysis Panel Component
 * Displays impact analysis results for file changes
 */
export const ImpactAnalysisPanel: React.FC<ImpactAnalysisPanelProps> = ({ 
  filePath, 
  isOpen, 
  onClose 
}) => {
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !filePath) return;

    const analyzeImpact = async () => {
      setIsLoading(true);
      try {
        const result = await impactAnalysis.analyzeFileImpact(filePath);
        setImpact(result);
      } catch (error) {
        console.error('Impact analysis failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeImpact();
  }, [filePath, isOpen]);

  if (!isOpen) return null;

  const getRiskColor = (score: number): string => {
    if (score > 10) return '#f48771'; // High risk - red
    if (score > 5) return '#dcdcaa'; // Medium risk - yellow
    return '#4ec9b0'; // Low risk - green
  };

  const getRiskLabel = (score: number): string => {
    if (score > 10) return 'High Risk';
    if (score > 5) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div className="impact-panel-overlay">
      <div className="impact-panel">
        {/* Header */}
        <div className="panel-header">
          <div>
            <h2>Impact Analysis</h2>
            <p className="file-path">{filePath}</p>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="panel-content">
          {isLoading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Analyzing impact...</p>
            </div>
          )}

          {!isLoading && impact && (
            <>
              {/* Impact Score */}
              <div className="impact-score-section">
                <div 
                  className="impact-score-badge"
                  style={{ 
                    backgroundColor: getRiskColor(impact.impactScore),
                    color: '#1e1e1e'
                  }}
                >
                  <span className="score-value">{impact.impactScore}</span>
                  <span className="score-label">files affected</span>
                </div>
                <div className="risk-info">
                  <h3 style={{ color: getRiskColor(impact.impactScore) }}>
                    {getRiskLabel(impact.impactScore)}
                  </h3>
                  <p className="risk-description">
                    {impact.impactScore > 10 && 'This change affects many files. Consider careful testing.'}
                    {impact.impactScore > 5 && impact.impactScore <= 10 && 'This change has moderate impact. Review affected files.'}
                    {impact.impactScore <= 5 && 'This change has limited impact. Safe to proceed.'}
                  </p>
                </div>
              </div>

              {/* API Impact Warning */}
              {impact.affectsAPI && (
                <div className="warning-banner">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <strong>API Change Detected</strong>
                    <p>This file exports public APIs. Changes may affect external consumers.</p>
                  </div>
                </div>
              )}

              {/* Direct Dependents */}
              {impact.directDependents.length > 0 && (
                <div className="dependents-section">
                  <h4>Direct Dependents ({impact.directDependents.length})</h4>
                  <div className="file-list">
                    {impact.directDependents.map((file, index) => (
                      <div key={index} className="file-item direct">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transitive Dependents */}
              {impact.transitiveDependents.length > 0 && (
                <div className="dependents-section">
                  <h4>Transitive Dependents ({impact.transitiveDependents.length})</h4>
                  <div className="file-list">
                    {impact.transitiveDependents.slice(0, 10).map((file, index) => (
                      <div key={index} className="file-item transitive">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file}</span>
                      </div>
                    ))}
                    {impact.transitiveDependents.length > 10 && (
                      <div className="more-files">
                        +{impact.transitiveDependents.length - 10} more files
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Symbol References */}
              {impact.symbolReferences && impact.symbolReferences.length > 0 && (
                <div className="references-section">
                  <h4>Symbol References</h4>
                  <div className="references-list">
                    {impact.symbolReferences.map((ref, index) => (
                      <div key={index} className="reference-item">
                        <div className="reference-symbol">{ref.symbol}</div>
                        <div className="reference-count">{ref.count} references</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Impact */}
              {impact.impactScore === 0 && (
                <div className="empty-state">
                  <span className="empty-icon">✓</span>
                  <p>No dependent files found. This file can be modified safely.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .impact-panel-overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 450px;
          background: #1e1e1e;
          border-left: 1px solid #3c3c3c;
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
        }

        .impact-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #3c3c3c;
        }

        .panel-header h2 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #cccccc;
        }

        .file-path {
          margin: 0;
          font-size: 12px;
          color: #858585;
          font-family: 'Consolas', 'Monaco', monospace;
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

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #858585;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #3c3c3c;
          border-top-color: #007acc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .impact-score-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          padding: 20px;
          background: #2d2d2d;
          border-radius: 8px;
        }

        .impact-score-badge {
          min-width: 80px;
          height: 80px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .score-value {
          font-size: 28px;
        }

        .score-label {
          font-size: 10px;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .risk-info {
          flex: 1;
        }

        .risk-info h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .risk-description {
          margin: 0;
          font-size: 13px;
          color: #858585;
          line-height: 1.5;
        }

        .warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(244, 135, 113, 0.1);
          border: 1px solid rgba(244, 135, 113, 0.3);
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .warning-icon {
          font-size: 20px;
        }

        .warning-banner strong {
          display: block;
          color: #f48771;
          margin-bottom: 4px;
        }

        .warning-banner p {
          margin: 0;
          font-size: 13px;
          color: #cccccc;
        }

        .dependents-section {
          margin-bottom: 24px;
        }

        .dependents-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #cccccc;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #2d2d2d;
          border-radius: 4px;
          font-size: 13px;
        }

        .file-item.direct {
          border-left: 3px solid #007acc;
        }

        .file-item.transitive {
          border-left: 3px solid #858585;
        }

        .file-icon {
          font-size: 14px;
        }

        .file-name {
          color: #cccccc;
          font-family: 'Consolas', 'Monaco', monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .more-files {
          padding: 8px 12px;
          text-align: center;
          color: #858585;
          font-size: 12px;
          font-style: italic;
        }

        .references-section {
          margin-bottom: 24px;
        }

        .references-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #cccccc;
        }

        .references-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reference-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #2d2d2d;
          border-radius: 4px;
        }

        .reference-symbol {
          font-family: 'Consolas', 'Monaco', monospace;
          color: #dcdcaa;
          font-size: 13px;
        }

        .reference-count {
          font-size: 12px;
          color: #858585;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
          color: #4ec9b0;
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 0;
          color: #858585;
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};
