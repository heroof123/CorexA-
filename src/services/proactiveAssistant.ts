// services/proactiveAssistant.ts
// 🧠 TASK 29: Ghost Developer entegrasyonu
import { FileIndex } from "../types/index";
import { ghostDeveloper, type GhostSuggestion } from "./ghostDeveloper";

export interface ProactiveSuggestion {
  id: string;
  type: 'improvement' | 'warning' | 'tip' | 'feature';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
  icon: string;
}

export class ProactiveAssistant {
  private lastAnalysis: number = 0;
  private analysisInterval: number = 120000; // 2 dakika (daha az sıklık)
  private userRequestedSuggestions: boolean = false; // Kullanıcı istedi mi?

  async analyzeProject(fileIndex: FileIndex[], currentFile?: string): Promise<ProactiveSuggestion[]> {
    const now = Date.now();

    // Kullanıcı öneriler istemiyorsa ve çok yakın zamanda analiz yaptıysak, boş dön
    if (!this.userRequestedSuggestions && now - this.lastAnalysis < this.analysisInterval) {
      return [];
    }

    this.lastAnalysis = now;
    this.userRequestedSuggestions = false; // Reset flag

    // 🧠 TASK 29: Ghost Developer kullan
    const ghostAnalysis = await ghostDeveloper.analyzeProject(fileIndex);

    // Ghost suggestions'ı ProactiveSuggestion formatına çevir
    const suggestions = this.convertGhostSuggestions(ghostAnalysis.suggestions);

    // Legacy critical issues (fallback)
    if (suggestions.length === 0) {
      suggestions.push(...this.analyzeCriticalIssues(fileIndex));

      // Mevcut dosya analizi (sadece kullanıcı isterse)
      if (currentFile) {
        const file = fileIndex.find(f => f.path === currentFile);
        if (file) {
          suggestions.push(...this.analyzeCriticalFileIssues(file));
        }
      }
    }

    // Sadece yüksek öncelikli önerileri göster
    return suggestions
      .filter(s => s.priority === 'high')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 3); // Maksimum 3 öneri
  }

  /**
   * 🧠 TASK 29: Convert Ghost suggestions to Proactive suggestions
   */
  private convertGhostSuggestions(ghostSuggestions: GhostSuggestion[]): ProactiveSuggestion[] {
    return ghostSuggestions
      .filter(gs => gs.priority >= 7) // Sadece yüksek öncelikli
      .slice(0, 3) // Maksimum 3
      .map(gs => {
        // Map type
        let type: 'improvement' | 'warning' | 'tip' | 'feature' = 'improvement';
        if (gs.type === 'unused-code' || gs.type === 'best-practice') {
          type = 'warning';
        } else if (gs.type === 'refactor' || gs.type === 'complexity') {
          type = 'improvement';
        }

        // Map priority
        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (gs.priority >= 8) {
          priority = 'high';
        } else if (gs.priority >= 6) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        // Map icon
        let icon = '💡';
        if (gs.type === 'unused-code') icon = '🧹';
        else if (gs.type === 'complexity') icon = '🔥';
        else if (gs.type === 'refactor') icon = '🔧';
        else if (gs.type === 'architecture') icon = '🏗️';
        else if (gs.type === 'dependency') icon = '🔗';
        else if (gs.type === 'best-practice') icon = '✨';

        return {
          id: gs.id,
          type,
          title: gs.title,
          description: gs.description,
          action: gs.suggestion,
          priority,
          icon
        };
      });
  }

  // Kullanıcı öneriler istediğinde çağır
  requestSuggestions() {
    this.userRequestedSuggestions = true;
  }

  private analyzeCriticalIssues(fileIndex: FileIndex[]): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    // Sadece gerçekten kritik sorunları kontrol et

    // Console.log kontrolü (yüksek öncelik)
    const filesWithConsoleLog = fileIndex.filter(f => f.content.includes('console.log'));
    if (filesWithConsoleLog.length > 3) {
      suggestions.push({
        id: 'console-logs',
        type: 'warning',
        title: `${filesWithConsoleLog.length} dosyada console.log bulundu`,
        description: 'Üretim kodunda console.log kullanımını temizleyin.',
        action: 'Console.log\'ları temizle',
        priority: 'high',
        icon: '🧹'
      });
    }

    // Çok büyük dosyalar (yüksek öncelik)
    const veryLargeFiles = fileIndex.filter(f => f.content.length > 100000);
    if (veryLargeFiles.length > 0) {
      suggestions.push({
        id: 'very-large-files',
        type: 'warning',
        title: `${veryLargeFiles.length} dosya çok büyük (>100KB)`,
        description: 'Bu dosyalar performans sorunlarına yol açabilir.',
        action: 'Büyük dosyaları böl',
        priority: 'high',
        icon: '📦'
      });
    }

    return suggestions;
  }

  private analyzeCriticalFileIssues(file: FileIndex): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const content = file.content;

    // Sadece kritik dosya sorunları

    // Console.log kontrolü
    if (content.includes('console.log')) {
      suggestions.push({
        id: 'file-console-logs',
        type: 'warning',
        title: 'Bu dosyada console.log var',
        description: 'Üretim kodunda console.log kullanımını temizleyin.',
        action: 'Console.log\'ları temizle',
        priority: 'high',
        icon: '🧹'
      });
    }

    return suggestions;
  }

  // 🧠 TASK 29: Aktif dosyayı analiz etme (Ghost Developer entegrasyonu)
  async analyzeActiveFile(filePath: string, fileContent: string): Promise<ProactiveSuggestion[]> {
    const ghostSuggestions = await ghostDeveloper.analyzeActiveFile(filePath, fileContent);
    return this.convertGhostSuggestions(ghostSuggestions);
  }

  // 🧠 TASK 29: AI Review (Ghost Developer entegrasyonu)
  async getAIReview(fileIndex: FileIndex[], currentFile?: string): Promise<string> {
    if (!currentFile) return "Analiz edilecek dosya seçilmedi.";

    const file = fileIndex.find(f => f.path === currentFile);
    if (!file) return `${currentFile} bulunamadı.`;

    const ghostSuggestions = await ghostDeveloper.analyzeActiveFile(file.path, file.content);
    if (ghostSuggestions.length === 0) return "Bu dosyada şu an için kritik bir sorun tespit edilmedi.";

    return `### 👻 Ghost Review: ${currentFile}\n\n` +
      ghostSuggestions.map(s => `- **${s.title}**: ${s.description} (${s.suggestion})`).join('\n');
  }

  // Get contextual suggestions based on user activity
  getContextualSuggestions(
    userMessage: string
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // If user is asking about errors, suggest error handling
    if (lowerMessage.includes('hata') || lowerMessage.includes('error')) {
      suggestions.push({
        id: 'error-handling',
        type: 'tip',
        title: 'Hata yönetimi önerisi',
        description: 'Try-catch blokları ve error boundary\'ler ekleyebiliriz.',
        action: 'Hata yönetimi ekle',
        priority: 'medium',
        icon: '🛡️'
      });
    }

    // If user is asking about performance
    if (lowerMessage.includes('performans') || lowerMessage.includes('yavaş')) {
      suggestions.push({
        id: 'performance-tips',
        type: 'improvement',
        title: 'Performans optimizasyonu',
        description: 'Kod performansını artırmak için çeşitli teknikler uygulayabiliriz.',
        action: 'Performansı optimize et',
        priority: 'high',
        icon: '⚡'
      });
    }

    return suggestions;
  }
}