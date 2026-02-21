// hooks/useFileEditor.ts
// Dosya açma, kaydetme, tab yönetimi ve editör state sorumluluklarını taşır

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createEmbedding } from "../services/embedding";
import { saveProjectIndex } from "../services/db";
import { FileIndex, Message } from "../types/index";
import { smartContextBuilder } from "../services/smartContextBuilder";

interface UseFileEditorOptions {
  projectPath: string;
  fileIndex: FileIndex[];
  setFileIndex: React.Dispatch<React.SetStateAction<FileIndex[]>>;
  onMessage: (msg: Omit<Message, "id">) => void;
  onNotification: (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string
  ) => void;
}

export function useFileEditor({
  projectPath,
  fileIndex,
  setFileIndex,
  onMessage,
  onNotification,
}: UseFileEditorOptions) {
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; content: string }>>([]);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selection, setSelection] = useState("");


  const openFile = useCallback(
    async (filePath: string) => {
      if (hasUnsavedChanges) {
        const confirm = window.confirm("Kaydedilmemiş değişiklikler var. Devam edilsin mi?");
        if (!confirm) return;
      }

      try {
        // Zaten açık mı?
        const existingTab = openTabs.find(tab => tab.path === filePath);
        if (existingTab) {
          setSelectedFile(filePath);
          setFileContent(existingTab.content);
          setHasUnsavedChanges(false);
          return;
        }

        const content = await invoke<string>("read_file", { path: filePath });

        // Büyük dosya uyarısı (>5MB)
        const fileSizeMB = new Blob([content]).size / (1024 * 1024);
        if (fileSizeMB > 5) {
          const confirm = window.confirm(
            `⚠️ Bu dosya çok büyük (${fileSizeMB.toFixed(2)} MB).\n\nAçmak performans sorunlarına neden olabilir.\nDevam edilsin mi?`
          );
          if (!confirm) return;
          onNotification(
            "warning",
            "Büyük Dosya",
            `${filePath.split(/[\\\/]/).pop()} - ${fileSizeMB.toFixed(2)} MB`
          );
        }

        setSelectedFile(filePath);
        setFileContent(content);
        setHasUnsavedChanges(false);
        smartContextBuilder.trackFileOpen(filePath);
        setOpenTabs(prev => [...prev, { path: filePath, content }]);
      } catch (err) {
        console.error("Dosya okuma hatası:", err);
        onNotification("error", "Dosya Hatası", `${filePath.split(/[\\\/]/).pop()} okunamadı`);
      }
    },
    [hasUnsavedChanges, openTabs, onNotification]
  );

  const closeTab = useCallback(
    (filePath: string) => {
      if (selectedFile === filePath && openTabs.length > 1) {
        const currentIndex = openTabs.findIndex(tab => tab.path === filePath);
        const nextTab = currentIndex > 0 ? openTabs[currentIndex - 1] : openTabs[currentIndex + 1];
        setSelectedFile(nextTab.path);
        setFileContent(nextTab.content);
      } else if (selectedFile === filePath) {
        setSelectedFile("");
        setFileContent("");
      }

      smartContextBuilder.trackFileClose(filePath);
      setOpenTabs(prev => prev.filter(tab => tab.path !== filePath));
      setHasUnsavedChanges(false);
    },
    [selectedFile, openTabs]
  );

  const saveFile = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await invoke("write_file", { path: selectedFile, content: fileContent });
      smartContextBuilder.trackFileEdit(selectedFile);

      // Tab içeriğini güncelle
      setOpenTabs(prev =>
        prev.map(tab => (tab.path === selectedFile ? { ...tab, content: fileContent } : tab))
      );

      import("../services/ragService").then(({ ragService }) => {
        ragService.indexFile(selectedFile).catch(err => console.error("RAG Index Error:", err));
      });

      // Index güncelle (embedding arka planda)
      const idx = fileIndex.findIndex(f => f.path === selectedFile);
      if (idx !== -1) {
        const embedding = await createEmbedding(fileContent);
        const newIndex = [...fileIndex];
        newIndex[idx] = {
          path: selectedFile,
          content: fileContent,
          embedding,
          lastModified: Date.now(),
        };
        setFileIndex(newIndex);

        if (projectPath) {
          await saveProjectIndex({
            projectPath,
            files: newIndex,
            lastIndexed: Date.now(),
            version: "1.0",
          });
        }
      }

      setHasUnsavedChanges(false);
      onMessage({
        role: "system",
        content: `✅ Kaydedildi: ${selectedFile}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Dosya yazma hatası:", err);
      onNotification("error", "Kaydetme Hatası", `Dosya kaydedilemedi: ${err}`);
    }
  }, [selectedFile, fileContent, fileIndex, projectPath, setFileIndex, onMessage, onNotification]);

  const handleEditorChange = useCallback(
    (value: string) => {
      setFileContent(value);
      setHasUnsavedChanges(true);
      setOpenTabs(prev =>
        prev.map(tab => (tab.path === selectedFile ? { ...tab, content: value } : tab))
      );
    },
    [selectedFile]
  );

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Code Files",
          extensions: ["ts", "tsx", "js", "jsx", "rs", "py", "json", "md", "txt", "css", "html"],
        },
      ],
    });
    if (typeof selected === "string") {
      await openFile(selected);
    }
  }, [openFile]);

  const handleCloseFile = useCallback(() => {
    if (selectedFile) {
      if (hasUnsavedChanges) {
        const confirm = window.confirm("Kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?");
        if (!confirm) return;
      }
      closeTab(selectedFile);
    }
  }, [selectedFile, hasUnsavedChanges, closeTab]);

  return {
    // State
    selectedFile,
    fileContent,
    hasUnsavedChanges,
    openTabs,
    cursorPosition,
    selection,
    // Setters
    setCursorPosition,
    setSelection,
    // Actions
    openFile,
    closeTab,
    saveFile,
    handleEditorChange,
    handleOpenFile,
    handleCloseFile,
  };
}
