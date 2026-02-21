// hooks/useProjectManager.ts
// Proje açma, indexleme ve dosya yönetimi sorumluluklarını taşır

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createEmbedding } from "../services/embedding";
import { sendToAI, resetConversation, updateProjectContext } from "../services/ai";
import { saveProjectIndex, getProjectIndex } from "../services/db";
import { FileIndex, Message } from "../types/index";
import { addRecentProject, getProjectTypeFromFiles } from "../services/recentProjects";
import { incrementalIndexer } from "../services/incrementalIndexer";
import { dependencyAnalyzer } from "../services/dependencyAnalyzer";
import { initializeServices } from "../services/serviceInitializer";

interface UseProjectManagerOptions {
  onMessage: (msg: Omit<Message, "id">) => void;
  onNotification: (type: "success" | "error" | "warning" | "info", title: string, message: string) => void;
  fileIndex: FileIndex[];
  setFileIndex: React.Dispatch<React.SetStateAction<FileIndex[]>>;
}

export function useProjectManager({
  onMessage,
  onNotification,
  fileIndex,
  setFileIndex,
}: UseProjectManagerOptions) {
  const [projectPath, setProjectPath] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [hasProject, setHasProject] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState({ current: 0, total: 0 });

  // Proje türünü analiz et ve AI'ya gönder
  const analyzeProjectStructure = useCallback(
    async (indexed: FileIndex[], path: string): Promise<string> => {
      try {
        const hasPackageJson = indexed.some((f) => f.path.endsWith("package.json"));
        const hasCargoToml = indexed.some((f) => f.path.endsWith("Cargo.toml"));
        const hasPyprojectToml = indexed.some((f) => f.path.endsWith("pyproject.toml"));
        const hasRequirementsTxt = indexed.some((f) => f.path.endsWith("requirements.txt"));

        let projectType = "Bilinmeyen";
        const features: string[] = [];
        let purpose = "";

        if (hasPackageJson) {
          const packageJson = indexed.find((f) => f.path.endsWith("package.json"));
          if (packageJson) {
            try {
              const pkg = JSON.parse(packageJson.content);
              if (pkg.dependencies?.react || pkg.devDependencies?.react) {
                projectType = "React";
                if (pkg.dependencies?.["@tauri-apps/api"]) features.push("Tauri (masaüstü uygulama)");
                if (pkg.dependencies?.["react-native"] || pkg.dependencies?.expo)
                  features.push("React Native (mobil uygulama)");
              } else if (pkg.dependencies?.vue) {
                projectType = "Vue.js";
              } else if (pkg.dependencies?.angular) {
                projectType = "Angular";
              } else if (pkg.dependencies?.express) {
                projectType = "Node.js/Express";
                purpose = "Backend API sunucusu";
              } else if (pkg.dependencies?.next) {
                projectType = "Next.js";
                purpose = "Full-stack web uygulaması";
              } else {
                projectType = "Node.js";
              }
              if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript)
                features.push("TypeScript");
              if (pkg.dependencies?.tailwindcss) features.push("Tailwind CSS");
              if (pkg.dependencies?.prisma || pkg.dependencies?.["@prisma/client"])
                features.push("Prisma (veritabanı)");
            } catch {
              projectType = "JavaScript/Node.js";
            }
          }
        } else if (hasCargoToml) {
          projectType = "Rust";
          purpose = "Sistem programlama";
        } else if (hasPyprojectToml || hasRequirementsTxt) {
          projectType = "Python";
        }

        const projectName = path.split(/[\\\/]/).pop() || "Proje";
        const prompt = `Yeni bir proje açıldı. Kullanıcıya KISA ve SADE bir şekilde açıkla:\n\nProje Adı: ${projectName}\nProje Türü: ${projectType}\n${purpose ? `Amaç: ${purpose}` : ""}\n${features.length > 0 ? `Özellikler: ${features.join(", ")}` : ""}\nDosya Sayısı: ${indexed.length}\n\nKURALLAR:\n1. Sadece 3-4 cümle yaz\n2. Proje türünü ve amacını söyle\n3. Önemli özellikleri listele (3-5 madde)\n4. DETAYA GİRME!\n5. Samimi ve anlaşılır dil kullan`;

        return await sendToAI(prompt);
      } catch {
        return `Merhaba! 👋 Projen yüklendi. ${indexed.length} dosya hazır. Ne yapmak istersin? 😊`;
      }
    },
    []
  );

  const scanAndIndexProject = useCallback(
    async (path: string) => {
      try {
        setIsIndexing(true);
        console.log("🚀 Incremental indexing başlatılıyor...");

        const result = await incrementalIndexer.indexProject(
          path,
          fileIndex,
          (current, total, file) => {
            setIndexProgress({ current, total });
            console.log(`📊 ${current}/${total}: ${file}`);
          }
        );

        setFiles(result.indexed.map((f) => f.path));
        setFileIndex(result.indexed);

        if (result.indexed.length === 0) {
          onMessage({
            role: "system",
            content: `📁 Proje boş veya dosya bulunamadı.\n\nYeni dosyalar ekleyebilir veya mevcut dosyaları kontrol edebilirsiniz.`,
            timestamp: Date.now(),
          });
          setIsIndexing(false);
          return;
        }

        console.log("🔗 Bağımlılık analizi yapılıyor...");
        dependencyAnalyzer.buildGraph(result.indexed);
        updateProjectContext(path, result.indexed);

        await saveProjectIndex({
          projectPath: path,
          files: result.indexed,
          lastIndexed: Date.now(),
          version: "1.0",
        });

        const projectAnalysis = await analyzeProjectStructure(result.indexed, path);

        onMessage({
          role: "system",
          content: `✅ Proje indekslendi! ${result.indexed.length} dosya hazır.`,
          timestamp: Date.now(),
        });
        onMessage({
          role: "assistant",
          content: projectAnalysis,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("İndeksleme hatası:", err);
        onNotification("error", "İndeksleme Hatası", String(err));
      } finally {
        setIsIndexing(false);
      }
    },
    [fileIndex, setFileIndex, analyzeProjectStructure, onMessage, onNotification]
  );

  const loadOrIndexProject = useCallback(
    async (path: string) => {
      try {
        const cachedIndex = await getProjectIndex(path);

        if (cachedIndex && cachedIndex.files.length > 0) {
          console.log("📦 Cache'den yüklendi:", cachedIndex.files.length, "dosya");
          setFiles(cachedIndex.files.map((f) => f.path));
          setFileIndex(cachedIndex.files);

          const projectAnalysis = await analyzeProjectStructure(cachedIndex.files, path);
          onMessage({
            role: "system",
            content: `✅ Proje cache'den yüklendi! ${cachedIndex.files.length} dosya indekslendi.`,
            timestamp: Date.now(),
          });
          onMessage({
            role: "assistant",
            content: projectAnalysis,
            timestamp: Date.now(),
          });
          return;
        }

        await scanAndIndexProject(path);
      } catch (err) {
        console.error("Load/index error:", err);
        onNotification("error", "Proje Yükleme Hatası", String(err));
      }
    },
    [setFileIndex, analyzeProjectStructure, scanAndIndexProject, onMessage, onNotification]
  );

  const handleProjectSelect = useCallback(
    async (path: string) => {
      console.log("🔵 Proje seçildi:", path);
      setProjectPath(path);
      resetConversation();
      setHasProject(true);

      await loadOrIndexProject(path);

      try {
        await initializeServices(path);
      } catch (error) {
        console.error("❌ Servis başlatma hatası:", error);
        onNotification("error", "Servis Hatası", "AI servisleri başlatılamadı");
      }

      const projectType = getProjectTypeFromFiles(files);
      await addRecentProject(path, files.length, projectType);
    },
    [files, loadOrIndexProject, onNotification]
  );

  const handleOpenProject = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        await handleProjectSelect(selected);
      }
    } catch (error) {
      console.error("Proje açma hatası:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not available") || errorMessage.includes("undefined")) {
        onNotification("error", "Tauri Hatası", "Lütfen uygulamayı yeniden başlatın: npm run tauri:dev");
      } else {
        onNotification("error", "Proje Açılamadı", errorMessage);
      }
    }
  }, [handleProjectSelect, onNotification]);

  const handleCreateNewProject = useCallback(async (projectName: string) => {
    try {
      if (!projectName.trim()) {
        onNotification("warning", "Uyarı", "Lütfen bir proje ismi girin.");
        return;
      }

      // 1. Ana klasörü seç
      const parentDir = await open({ directory: true, multiple: false, title: "Projenin oluşturulacağı ana klasörü seçin" });
      if (!parentDir || typeof parentDir !== "string") return;

      // 2. Yeni proje klasör yolunu oluştur
      const newProjectPath = `${parentDir}/${projectName.trim()}`.replace(/\\/g, '/');

      // 3. Klasörü oluştur (Rust tarafında invoke)
      try {
        await invoke("create_directory", { path: newProjectPath });
      } catch (err) {
        // Eğer klasör zaten varsa devam edebiliriz veya hata verebiliriz
        console.warn("Klasör zaten mevcut veya oluşturulamadı:", err);
      }

      // 4. Projeyi aç
      await handleProjectSelect(newProjectPath);

      // 5. AI'ya projeyi başlatması için komut gönder
      onMessage({
        role: "assistant",
        content: `Harika! **${projectName}** projesini oluşturdum. 🚀\n\nBu projeyi nasıl başlatmamı istersin? Örneğin:\n- "Basit bir React & Tailwind projesi kur"\n- "Python veri analizi yapısı oluştur"\n- "Boş bir README ve temel klasörleri ekle"`,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error("Proje oluşturma hatası:", error);
      onNotification("error", "Proje Oluşturulamadı", String(error));
    }
  }, [handleProjectSelect, onNotification, onMessage]);

  // Dosya indexe ekle (embedding ile)
  const addFileToIndex = useCallback(
    async (filePath: string, content: string) => {
      const normalizedPath = filePath.replace(/\\/g, '/');

      // 1) Anında GUI ağacına (Tree View) ekle (Eğer yoksa)
      setFiles(prev => {
        const normalizedPrev = prev.map(p => p.replace(/\\/g, '/'));
        if (!normalizedPrev.includes(normalizedPath)) {
          return [...prev, normalizedPath];
        }
        return prev;
      });

      // 2) Index state'ine kaba olarak ekle (embedding henüz boş)
      setFileIndex((prev) => {
        const existing = prev.find((f) => f.path.replace(/\\/g, '/') === normalizedPath);
        if (existing) {
          return prev.map((f) =>
            f.path.replace(/\\/g, '/') === normalizedPath ? { ...f, content: content.substring(0, 10000), lastModified: Date.now() } : f
          );
        }
        return [
          ...prev,
          { path: normalizedPath, content: content.substring(0, 10000), embedding: [], lastModified: Date.now() },
        ];
      });

      // 3) Arka planda Embedding işlemini başlat, GUI'yi bekletme
      createEmbedding(content).then((embedding) => {
        setFileIndex((prev) =>
          prev.map((f) => f.path.replace(/\\/g, '/') === normalizedPath ? { ...f, embedding } : f)
        );
      }).catch((err) => {
        console.error(`❌ Embedding hatası (${filePath}):`, err);
      });
    },
    [setFileIndex, setFiles]
  );

  const saveIndexToDisk = useCallback(
    async (updatedIndex: FileIndex[]) => {
      if (!projectPath) return;
      await saveProjectIndex({
        projectPath,
        files: updatedIndex,
        lastIndexed: Date.now(),
        version: "1.0",
      });
    },
    [projectPath]
  );

  return {
    // State
    projectPath,
    files,
    hasProject,
    isIndexing,
    indexProgress,
    // Setters
    setHasProject,
    // Actions
    handleProjectSelect,
    handleOpenProject,
    handleCreateNewProject,
    loadOrIndexProject,
    addFileToIndex,
    saveIndexToDisk,
  };
}
