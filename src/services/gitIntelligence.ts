// src/services/gitIntelligence.ts
// Git timeline intelligence - commit history analysis

import { invoke } from '@tauri-apps/api/core';

export interface GitCommit {
  hash: string;
  author: string;
  timestamp: number;
  message: string;
  files: string[];
  issueRefs: string[];
}

interface CodeSection {
  startLine: number;
  endLine: number;
  content: string;
}

/**
 * Git Intelligence
 * Provides commit history analysis and timeline intelligence
 */
export class GitIntelligence {
  private commitCache: Map<string, GitCommit[]> = new Map();

  /**
   * 🆕 TASK 9.1: Load commits for a file
   */
  async loadFileHistory(filePath: string, limit: number = 10): Promise<GitCommit[]> {
    // Check cache
    if (this.commitCache.has(filePath)) {
      return this.commitCache.get(filePath)!.slice(0, limit);
    }

    try {
      // Call Tauri backend for git log
      const gitLog = await invoke<string>('git_log_file', {
        path: filePath,
        limit
      });

      const commits = this.parseGitLog(gitLog);
      this.commitCache.set(filePath, commits);

      console.log(`📜 Loaded ${commits.length} commits for ${filePath}`);
      return commits;
    } catch (error) {
      // 🆕 TASK 9.15: Graceful degradation when git unavailable
      console.warn(`⚠️ Git history unavailable for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 🆕 Get history for the entire project
   */
  async getProjectHistory(limit: number = 50): Promise<GitCommit[]> {
    try {
      const gitLog = await invoke<string>('git_log_project', { limit });
      return this.parseGitLog(gitLog);
    } catch (error) {
      console.warn('⚠️ Project git history unavailable:', error);
      return [];
    }
  }

  /**
   * 🆕 TASK 9.1: Parse git log output
   */
  private parseGitLog(gitLog: string): GitCommit[] {
    const commits: GitCommit[] = [];

    // Split by commit separator
    const commitBlocks = gitLog.split('\ncommit ').filter(b => b.trim().length > 0);

    commitBlocks.forEach(block => {
      const lines = block.split('\n');
      if (lines.length < 3) return;

      // Parse commit hash (first line might have "commit " prefix)
      const hashLine = lines[0].replace('commit ', '').trim();
      const hash = hashLine.split(' ')[0];

      // Find Author line
      const authorLine = lines.find(l => l.startsWith('Author:'));
      const author = authorLine ? authorLine.replace('Author:', '').trim() : 'Unknown';

      // Find Date line
      const dateLine = lines.find(l => l.startsWith('Date:'));
      const dateStr = dateLine ? dateLine.replace('Date:', '').trim() : '';
      const timestamp = dateStr ? new Date(dateStr).getTime() : Date.now();

      // Extract commit message (lines after Date, before empty line or end)
      const dateIndex = lines.findIndex(l => l.startsWith('Date:'));
      const messageLines = lines.slice(dateIndex + 1).filter(l => l.trim().length > 0);
      const message = messageLines.join('\n').trim();

      // 🆕 TASK 9.11: Extract issue references
      const issueRefs = this.extractIssueRefs(message);

      commits.push({
        hash,
        author,
        timestamp,
        message,
        files: [],
        issueRefs
      });
    });

    return commits;
  }

  /**
   * 🆕 TASK 9.11: Extract issue references from commit message
   */
  private extractIssueRefs(message: string): string[] {
    const refs: string[] = [];

    // GitHub issues: #123
    const githubRefs = message.match(/#\d+/g);
    if (githubRefs) refs.push(...githubRefs);

    // JIRA: PROJ-123
    const jiraRefs = message.match(/[A-Z]+-\d+/g);
    if (jiraRefs) refs.push(...jiraRefs);

    // Remove duplicates
    return Array.from(new Set(refs));
  }

  /**
   * 🆕 TASK 9.3: Find commits that modified a specific code section
   */
  async findCommitsForSection(
    filePath: string,
    section: CodeSection
  ): Promise<GitCommit[]> {
    try {
      // Use git blame for line-level history
      const blameOutput = await invoke<string>('git_blame', {
        path: filePath,
        startLine: section.startLine,
        endLine: section.endLine
      });

      const commits = this.parseGitBlame(blameOutput);
      console.log(`🔍 Found ${commits.length} commits for section ${section.startLine}-${section.endLine}`);
      return commits;
    } catch (error) {
      // 🆕 TASK 9.15: Graceful degradation
      console.warn(`⚠️ Git blame failed for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse git blame output
   */
  private parseGitBlame(blameOutput: string): GitCommit[] {
    const commits = new Map<string, GitCommit>();
    const lines = blameOutput.split('\n');

    lines.forEach(line => {
      // Git blame format: hash (author date time timezone line_number) content
      const match = line.match(/^([a-f0-9]+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (match) {
        const [, hash, author, dateStr] = match;

        if (!commits.has(hash)) {
          commits.set(hash, {
            hash,
            author: author.trim(),
            timestamp: new Date(dateStr).getTime(),
            message: '', // Would need separate git show call
            files: [],
            issueRefs: []
          });
        }
      }
    });

    return Array.from(commits.values());
  }

  /**
   * 🆕 TASK 9.5: Build commit context for AI
   */
  buildCommitContext(commits: GitCommit[]): string {
    if (commits.length === 0) return '';

    let context = '=== GIT HISTORY ===\n\n';

    // 🆕 TASK 19.1: Include 3 most recent commits
    commits.slice(0, 3).forEach(commit => {
      // 🆕 TASK 19.5: Format with author and timestamp
      context += `📝 ${commit.hash.substring(0, 7)} by ${commit.author}\n`;
      context += `   ${new Date(commit.timestamp).toLocaleDateString()}\n`;

      // 🆕 TASK 9.13: Truncate long messages to 200 characters
      const message = commit.message.length > 200
        ? commit.message.substring(0, 200) + '...'
        : commit.message;

      context += `   ${message}\n`;

      // Include issue references if any
      if (commit.issueRefs.length > 0) {
        context += `   Issues: ${commit.issueRefs.join(', ')}\n`;
      }

      context += '\n';
    });

    return context;
  }

  /**
   * 🆕 TASK 9.7: Track symbol history
   */
  async getSymbolHistory(filePath: string, symbolName: string): Promise<GitCommit[]> {
    try {
      // Get all commits for the file
      const allCommits = await this.loadFileHistory(filePath, 50);

      // Filter commits that mention the symbol in the message or diff
      const symbolCommits = allCommits.filter(commit =>
        commit.message.toLowerCase().includes(symbolName.toLowerCase())
      );

      console.log(`🔍 Found ${symbolCommits.length} commits related to symbol: ${symbolName}`);
      return symbolCommits;
    } catch (error) {
      console.warn(`⚠️ Symbol history failed for ${symbolName}:`, error);
      return [];
    }
  }

  /**
   * 🆕 TASK 9.9: Detect hotspots (frequently changed areas)
   */
  async detectHotspots(filePaths: string[]): Promise<Map<string, number>> {
    const hotspots = new Map<string, number>();

    for (const filePath of filePaths) {
      try {
        const commits = await this.loadFileHistory(filePath, 100);
        hotspots.set(filePath, commits.length);
      } catch (error) {
        console.warn(`⚠️ Hotspot detection failed for ${filePath}:`, error);
        hotspots.set(filePath, 0);
      }
    }

    // Sort by commit count (descending)
    const sortedHotspots = new Map(
      Array.from(hotspots.entries()).sort((a, b) => b[1] - a[1])
    );

    console.log(`🔥 Detected ${sortedHotspots.size} hotspots`);
    return sortedHotspots;
  }

  /**
   * Clear commit cache
   */
  clearCache(): void {
    this.commitCache.clear();
    console.log('🗑️ Git commit cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedFiles: number;
    totalCommits: number;
  } {
    const totalCommits = Array.from(this.commitCache.values())
      .reduce((sum, commits) => sum + commits.length, 0);

    return {
      cachedFiles: this.commitCache.size,
      totalCommits
    };
  }
}

// ============================================================================
// Global Instance
// ============================================================================

export const gitIntelligence = new GitIntelligence();
