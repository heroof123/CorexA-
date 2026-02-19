import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { backgroundReasoner } from '../services/backgroundReasoner';

interface StatusBarProps {
  projectPath: string;
  selectedFile: string;
  fileContent: string;
  cursorPosition?: { line: number; column: number };
  hasUnsavedChanges: boolean;
}

export default function StatusBar({ 
  projectPath, 
  selectedFile, 
  fileContent, 
  cursorPosition = { line: 1, column: 1 },
  hasUnsavedChanges 
}: StatusBarProps) {
  const { theme } = useTheme();
  const [gitBranch, setGitBranch] = useState<string>('');
  const [gitStatus, setGitStatus] = useState<'clean' | 'modified' | 'staged' | 'unknown'>('unknown');
  const [encoding] = useState('UTF-8');
  const [lineEnding] = useState('LF');
  const [language, setLanguage] = useState('');
  
  // 🆕 TASK 23.3: Background analysis progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisQueue, setAnalysisQueue] = useState(0);

  // Detect file language from extension
  useEffect(() => {
    if (selectedFile) {
      const ext = selectedFile.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        'ts': 'TypeScript',
        'tsx': 'TypeScript React',
        'js': 'JavaScript',
        'jsx': 'JavaScript React',
        'rs': 'Rust',
        'py': 'Python',
        'json': 'JSON',
        'md': 'Markdown',
        'css': 'CSS',
        'scss': 'SCSS',
        'html': 'HTML',
        'txt': 'Plain Text',
        'toml': 'TOML',
        'yaml': 'YAML',
        'yml': 'YAML'
      };
      setLanguage(languageMap[ext || ''] || 'Unknown');
    } else {
      setLanguage('');
    }
  }, [selectedFile]);

  // Mock git status (in real implementation, this would call git commands)
  useEffect(() => {
    if (projectPath) {
      // Simulate git branch detection
      setGitBranch('main');
      setGitStatus(hasUnsavedChanges ? 'modified' : 'clean');
    }
  }, [projectPath, hasUnsavedChanges]);

  // 🆕 TASK 23.3: Subscribe to background analysis events
  useEffect(() => {
    const handleAnalysisStart = () => {
      setIsAnalyzing(true);
    };

    const handleAnalysisComplete = () => {
      setIsAnalyzing(false);
    };

    // Subscribe to events
    backgroundReasoner.on('analysis-start', handleAnalysisStart);
    backgroundReasoner.on('analysis-complete', handleAnalysisComplete);

    // Update queue size periodically
    const interval = setInterval(() => {
      const stats = backgroundReasoner.getStats();
      setAnalysisQueue(stats.queueLength);
      setIsAnalyzing(stats.isRunning);
    }, 500);

    return () => {
      backgroundReasoner.off('analysis-start', handleAnalysisStart);
      backgroundReasoner.off('analysis-complete', handleAnalysisComplete);
      clearInterval(interval);
    };
  }, []);

  // Calculate file stats
  const lineCount = fileContent ? fileContent.split('\n').length : 0;
  const charCount = fileContent ? fileContent.length : 0;
  const selectedText: string = ''; // Would be passed from editor
  const selectedTextLength = selectedText.length;

  const getGitStatusIcon = () => {
    switch (gitStatus) {
      case 'clean': return '✓';
      case 'modified': return '●';
      case 'staged': return '●';
      default: return '?';
    }
  };

  const getGitStatusColor = () => {
    switch (gitStatus) {
      case 'clean': return 'text-green-500';
      case 'modified': return 'text-yellow-500';
      case 'staged': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="h-6 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-3 flex items-center justify-between text-xs text-[var(--color-textSecondary)] select-none">
      {/* Left side - Git and project info */}
      <div className="flex items-center gap-4">
        {gitBranch && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.5 0a3.5 3.5 0 1 1-2.5 6v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V7a3.5 3.5 0 1 1-2.5-6 3.5 3.5 0 0 1 2.5 6v1h2V7a3.5 3.5 0 0 1 2.5-6z"/>
            </svg>
            <span>{gitBranch}</span>
            <span className={getGitStatusColor()}>{getGitStatusIcon()}</span>
          </div>
        )}
        
        {selectedFile && (
          <div className="flex items-center gap-2">
            <span className="opacity-60">📄</span>
            <span>{selectedFile.split(/[\\/]/).pop()}</span>
            {hasUnsavedChanges && <span className="text-yellow-500">●</span>}
          </div>
        )}
      </div>

      {/* Right side - File info and cursor position */}
      <div className="flex items-center gap-4">
        {/* 🆕 TASK 23.3: Background analysis indicator */}
        {(isAnalyzing || analysisQueue > 0) && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-3 h-3 relative">
              <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-xs">
              {isAnalyzing ? 'Analyzing...' : `${analysisQueue} queued`}
            </span>
          </div>
        )}
        
        {selectedFile && (
          <>
            <span>{language}</span>
            <span>{encoding}</span>
            <span>{lineEnding}</span>
            
            {lineCount > 0 && (
              <span>
                Ln {cursorPosition.line}, Col {cursorPosition.column}
              </span>
            )}
            
            {selectedText && (
              <span>({selectedTextLength} selected)</span>
            )}
            
            <span>{lineCount} lines</span>
            <span>{charCount} chars</span>
          </>
        )}
        
        <div className="flex items-center gap-2">
          <span className="opacity-60">🎨</span>
          <span className="capitalize">{theme}</span>
        </div>
      </div>
    </div>
  );
}