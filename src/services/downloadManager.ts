// Download Manager - Global indirme yöneticisi
// Sayfa değişse bile indirmeler devam eder

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface DownloadTask {
  id: string;
  url: string;
  destination: string;
  modelName: string;
  totalSize: number;
  downloadedSize: number;
  progress: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
  startTime: number;
}

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Map<string, ((task: DownloadTask) => void)[]> = new Map();
  private progressListener: UnlistenFn | null = null;
  private initialized: boolean = false;

  constructor() {
    this.loadTasks();
    this.initializeListener();
  }

  /**
   * LocalStorage'dan görevleri yükle
   */
  private loadTasks(): void {
    try {
      const stored = localStorage.getItem('download-tasks');
      if (stored) {
        const tasks = JSON.parse(stored) as DownloadTask[];
        tasks.forEach(task => {
          // Sadece devam eden indirmeleri yükle
          if (task.status === 'downloading') {
            this.tasks.set(task.id, task);
          }
        });
        console.log(`📦 ${this.tasks.size} aktif indirme yüklendi`);
      }
    } catch (error) {
      console.error('Download tasks yüklenemedi:', error);
    }
  }

  /**
   * Görevleri LocalStorage'a kaydet
   */
  private saveTasks(): void {
    try {
      const tasks = Array.from(this.tasks.values());
      localStorage.setItem('download-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Download tasks kaydedilemedi:', error);
    }
  }

  /**
   * Global progress listener'ı başlat
   */
  private async initializeListener(): Promise<void> {
    if (this.initialized) return;

    try {
      this.progressListener = await listen('download-progress', (event: any) => {
        const payload = event.payload as {
          url: string;
          downloaded: number;
          total: number;
          progress: number;
        };

        // İlgili task'ı bul
        const task = Array.from(this.tasks.values()).find(t => t.url === payload.url);
        if (task) {
          task.downloadedSize = payload.downloaded;
          task.totalSize = payload.total;
          task.progress = payload.progress;

          // Tamamlandı mı?
          if (payload.progress >= 100) {
            task.status = 'completed';
            console.log(`✅ İndirme tamamlandı: ${task.modelName}`);
          }

          this.saveTasks();
          this.notifyListeners(task.id, task);
        }
      });

      this.initialized = true;
      console.log('✅ Download Manager başlatıldı');
    } catch (error) {
      console.error('Download Manager başlatılamadı:', error);
    }
  }

  /**
   * Yeni indirme başlat
   */
  async startDownload(
    url: string,
    destination: string,
    modelName: string
  ): Promise<string> {
    const taskId = `download-${Date.now()}`;
    
    const task: DownloadTask = {
      id: taskId,
      url,
      destination,
      modelName,
      totalSize: 0,
      downloadedSize: 0,
      progress: 0,
      status: 'downloading',
      startTime: Date.now()
    };

    this.tasks.set(taskId, task);
    this.saveTasks();

    console.log(`📥 İndirme başlatıldı: ${modelName}`);

    // Rust backend'e indirme komutu gönder
    try {
      await invoke('download_gguf_model', {
        url,
        destination
      });

      // İndirme tamamlandı
      task.status = 'completed';
      task.progress = 100;
      this.saveTasks();
      this.notifyListeners(taskId, task);

      return taskId;
    } catch (error) {
      // İndirme başarısız
      task.status = 'failed';
      task.error = String(error);
      this.saveTasks();
      this.notifyListeners(taskId, task);
      throw error;
    }
  }

  /**
   * İndirme durumunu al
   */
  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Tüm indirmeleri al
   */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Aktif indirmeleri al
   */
  getActiveDownloads(): DownloadTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'downloading');
  }

  /**
   * İndirme değişikliklerini dinle
   */
  onTaskUpdate(taskId: string, callback: (task: DownloadTask) => void): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, []);
    }
    this.listeners.get(taskId)!.push(callback);

    // Unsubscribe fonksiyonu döndür
    return () => {
      const callbacks = this.listeners.get(taskId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Tüm indirme değişikliklerini dinle
   */
  onAnyTaskUpdate(callback: (task: DownloadTask) => void): () => void {
    const listenerId = 'global-listener';
    if (!this.listeners.has(listenerId)) {
      this.listeners.set(listenerId, []);
    }
    this.listeners.get(listenerId)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(listenerId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Listener'ları bilgilendir
   */
  private notifyListeners(taskId: string, task: DownloadTask): void {
    // Task-specific listeners
    const taskListeners = this.listeners.get(taskId) || [];
    taskListeners.forEach(callback => callback(task));

    // Global listeners
    const globalListeners = this.listeners.get('global-listener') || [];
    globalListeners.forEach(callback => callback(task));
  }

  /**
   * İndirmeyi temizle (tamamlanan veya başarısız)
   */
  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.listeners.delete(taskId);
    this.saveTasks();
  }

  /**
   * Tüm tamamlanan indirmeleri temizle
   */
  clearCompleted(): void {
    const completed = Array.from(this.tasks.entries())
      .filter(([_, task]) => task.status === 'completed' || task.status === 'failed');
    
    completed.forEach(([id]) => {
      this.tasks.delete(id);
      this.listeners.delete(id);
    });

    this.saveTasks();
    console.log(`🗑️ ${completed.length} tamamlanmış indirme temizlendi`);
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    if (this.progressListener) {
      this.progressListener();
      this.progressListener = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// Global singleton instance
export const downloadManager = new DownloadManager();
