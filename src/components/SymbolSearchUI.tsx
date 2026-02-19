// src/components/SymbolSearchUI.tsx
// Symbol search UI component

import React, { useState, useEffect, useCallback } from 'react';
import { symbolSearch, type SearchResult } from '../services/symbolSearch';

interface SymbolSearchUIProps {
  onSelect?: (result: SearchResult) => void;
  onClose?: () => void;
}

/**
 * 🆕 TASK 14.11: Symbol Search UI Component
 */
export const SymbolSearchUI: React.FC<SymbolSearchUIProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterKind, setFilterKind] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      try {
        const searchResults = filterKind === 'all'
          ? symbolSearch.search(query, 50)
          : symbolSearch.searchByType(query, filterKind, 50);
        
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filterKind]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [results, selectedIndex, onClose]);

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result);
    onClose?.();
  };

  const getKindIcon = (kind: string): string => {
    switch (kind) {
      case 'function': return '𝑓';
      case 'class': return 'C';
      case 'interface': return 'I';
      case 'type': return 'T';
      case 'variable': return 'v';
      case 'constant': return 'c';
      case 'method': return 'm';
      case 'property': return 'p';
      default: return '•';
    }
  };

  const getKindColor = (kind: string): string => {
    switch (kind) {
      case 'function': return '#dcdcaa';
      case 'class': return '#4ec9b0';
      case 'interface': return '#4ec9b0';
      case 'type': return '#4ec9b0';
      case 'variable': return '#9cdcfe';
      case 'constant': return '#4fc1ff';
      case 'method': return '#dcdcaa';
      case 'property': return '#9cdcfe';
      default: return '#cccccc';
    }
  };

  const availableKinds = symbolSearch.getAvailableKinds();

  return (
    <div className="symbol-search-overlay">
      <div className="symbol-search-container">
        {/* Search Input */}
        <div className="search-header">
          <input
            type="text"
            className="search-input"
            placeholder="Search symbols... (Cmd/Ctrl+P)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Filter Buttons */}
        <div className="filter-bar">
          <button
            className={`filter-button ${filterKind === 'all' ? 'active' : ''}`}
            onClick={() => setFilterKind('all')}
          >
            All
          </button>
          {availableKinds.map(kind => (
            <button
              key={kind}
              className={`filter-button ${filterKind === kind ? 'active' : ''}`}
              onClick={() => setFilterKind(kind)}
            >
              {kind}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="results-container">
          {isLoading && (
            <div className="loading-indicator">Searching...</div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="no-results">No symbols found</div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="results-list">
              {results.map((result, index) => (
                <div
                  key={`${result.filePath}:${result.line}:${result.symbol}`}
                  className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="result-icon" style={{ color: getKindColor(result.kind) }}>
                    {getKindIcon(result.kind)}
                  </div>
                  <div className="result-content">
                    <div className="result-name">
                      {result.symbol}
                      <span className="result-kind">{result.kind}</span>
                    </div>
                    <div className="result-location">
                      {result.filePath.split('/').pop()}:{result.line}
                    </div>
                  </div>
                  <div className="result-score">
                    {(result.score * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {results.length > 0 && (
            <div className="search-footer">
              {results.length} results • Use ↑↓ to navigate • Enter to select • Esc to close
            </div>
          )}
        </div>
      </div>

      <style>{`
        .symbol-search-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 10vh;
          z-index: 1000;
        }

        .symbol-search-container {
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 8px;
          width: 600px;
          max-height: 70vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .search-header {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #3c3c3c;
        }

        .search-input {
          flex: 1;
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          padding: 8px 12px;
          color: #cccccc;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus {
          border-color: #007acc;
        }

        .close-button {
          background: transparent;
          border: none;
          color: #cccccc;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          margin-left: 8px;
        }

        .close-button:hover {
          color: #ffffff;
        }

        .filter-bar {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          border-bottom: 1px solid #3c3c3c;
          overflow-x: auto;
        }

        .filter-button {
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          padding: 4px 12px;
          color: #cccccc;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .filter-button:hover {
          background: #3c3c3c;
        }

        .filter-button.active {
          background: #007acc;
          border-color: #007acc;
          color: #ffffff;
        }

        .results-container {
          flex: 1;
          overflow-y: auto;
          min-height: 200px;
        }

        .loading-indicator,
        .no-results {
          padding: 32px;
          text-align: center;
          color: #858585;
        }

        .results-list {
          padding: 4px;
        }

        .result-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          margin-bottom: 2px;
        }

        .result-item:hover,
        .result-item.selected {
          background: #2d2d2d;
        }

        .result-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          margin-right: 12px;
        }

        .result-content {
          flex: 1;
          min-width: 0;
        }

        .result-name {
          color: #cccccc;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .result-kind {
          color: #858585;
          font-size: 11px;
          text-transform: uppercase;
        }

        .result-location {
          color: #858585;
          font-size: 12px;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .result-score {
          color: #858585;
          font-size: 11px;
          margin-left: 12px;
        }

        .search-footer {
          padding: 8px 12px;
          border-top: 1px solid #3c3c3c;
          color: #858585;
          font-size: 11px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};
