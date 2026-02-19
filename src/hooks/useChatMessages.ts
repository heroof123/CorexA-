// hooks/useChatMessages.ts
// Chat mesajları, streaming handler ve kod bloğu işleme sorumluluklarını taşır

import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { resetConversation, getConversationContext, getModelIdForRole } from "../services/ai"; // 🆕 getModelIdForRole eklendi
import { saveConversation, getConversation } from "../services/db";
import { Message, CodeAction } from "../types/index";
import { CoreMessage } from "../core/protocol";
import { callAI } from "../services/aiProvider"; // 🆕 callAI eklendi

// Uzantı → dil eşleştirme tablosu
const EXTENSION_MAP: Record<string, string> = {
    html: "html", css: "css", javascript: "js", js: "js",
    typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx",
    python: "py", py: "py", rust: "rs", rs: "rs",
    go: "go", java: "java", cpp: "cpp", c: "c",
    json: "json", xml: "xml", yaml: "yaml", yml: "yml",
    md: "md", markdown: "md", txt: "txt",
};

function generateMessageId(prefix = "msg"): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function extractCodeBlocks(text: string): Array<{ language: string; code: string; filename?: string }> {
    const codeBlocks: Array<{ language: string; code: string; filename?: string }> = [];
    const codeBlockRegex = /```(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1] || "txt";
        const filename = match[2]?.trim();
        const code = match[3].trim();
        if (code.length === 0) continue;
        codeBlocks.push({ language, code, filename });
    }
    return codeBlocks;
}

interface UseChatMessagesOptions {
    projectPath: string;
    coreMessages: CoreMessage[];
    isCoreStreaming: boolean;
    stopCoreGeneration: () => void;
    openFile: (path: string) => Promise<void>;
    addFileToIndex: (path: string, content: string) => Promise<void>;
    currentFile?: string; // 🆕 Aktif dosya yolu
}

export function useChatMessages({
    projectPath,
    coreMessages,
    isCoreStreaming,
    stopCoreGeneration,
    openFile,
    addFileToIndex,
    currentFile, // 🆕
}: UseChatMessagesOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingActions, setPendingActions] = useState<CodeAction[]>([]);
    const [toolApprovalRequest, setToolApprovalRequest] = useState<{
        toolName: string;
        parameters: Record<string, unknown>;
        resolve: (approved: boolean) => void;
    } | null>(null);

    // Streaming throttle refs
    const processedMessagesRef = useRef<Set<string>>(new Set());
    const pendingTokenUpdateRef = useRef<{ content: string; requestId: string } | null>(null);
    const tokenUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Konuşmayı yükle (proje değiştiğinde)
    useEffect(() => {
        const loadConversation = async () => {
            const savedMessages = await getConversation(projectPath);
            if (savedMessages && savedMessages.length > 0) {
                setMessages(savedMessages);
            }
        };
        if (projectPath) loadConversation();
    }, [projectPath]);

    // Konuşmayı kaydet (mesajlar değiştiğinde)
    useEffect(() => {
        if (projectPath && messages.length > 0) {
            saveConversation(projectPath, messages);
        }
    }, [messages, projectPath]);

    // Core mesajlarını işle (streaming handler)
    useEffect(() => {
        if (coreMessages.length === 0) return;
        const latestMessage = coreMessages[coreMessages.length - 1];
        if (!latestMessage || !latestMessage.messageId) return;

        // Token throttling
        if (latestMessage.messageType === "streaming/token") {
            const data = (latestMessage as any).data as { requestId: string; accumulated: string };
            pendingTokenUpdateRef.current = { content: data.accumulated, requestId: data.requestId };
            if (tokenUpdateTimeoutRef.current) clearTimeout(tokenUpdateTimeoutRef.current);
            tokenUpdateTimeoutRef.current = setTimeout(() => {
                if (!pendingTokenUpdateRef.current) return;
                const { content, requestId } = pendingTokenUpdateRef.current;
                setMessages((prev) =>
                    prev.map((msg) => (msg.id === `assistant-${requestId}` ? { ...msg, content } : msg))
                );
                pendingTokenUpdateRef.current = null;
            }, 150);
            return;
        }

        if (processedMessagesRef.current.has(latestMessage.messageId)) return;
        processedMessagesRef.current.add(latestMessage.messageId);

        switch (latestMessage.messageType) {
            case "streaming/start": {
                const requestId = ("data" in latestMessage) ? (latestMessage.data as any).requestId : "";
                const assistantMessageId = `assistant-${requestId}`;
                setMessages((prev) => {
                    if (prev.some((msg) => msg.id === assistantMessageId)) return prev;
                    return [...prev, { id: assistantMessageId, role: "assistant", content: "", timestamp: Date.now() }];
                });
                break;
            }
            case "streaming/complete": {
                const fullResponse = ("data" in latestMessage) ? (latestMessage.data as any).fullResponse : "";
                const requestId = ("data" in latestMessage) ? (latestMessage.data as any).requestId : "";
                const codeBlocks = extractCodeBlocks(fullResponse);

                if (codeBlocks.length > 0) {
                    let cleanResponse = fullResponse;
                    codeBlocks.forEach((block, index) => {
                        const filename = block.filename || `file-${index + 1}.${block.language}`;
                        const replacement = `\n📄 **Dosya oluşturuldu:** \`${filename}\` (${block.language})\n`;
                        cleanResponse = cleanResponse.replace(/```[\s\S]*?```/, replacement);
                    });
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === `assistant-${requestId}` ? { ...msg, content: cleanResponse.trim() } : msg
                        )
                    );
                    createFilesFromCodeBlocks(codeBlocks, projectPath, openFile, addFileToIndex, setMessages, currentFile);
                } else {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === `assistant-${requestId}` ? { ...msg, content: fullResponse } : msg
                        )
                    );
                }
                setIsLoading(false);
                break;
            }
            case "streaming/error":
            case "error": {
                const error = ("data" in latestMessage) ? (latestMessage.data as any).error : "Unknown error";
                setMessages((prev) => [
                    ...prev,
                    { id: generateMessageId("error"), role: "system", content: `❌ Hata: ${error}`, timestamp: Date.now() },
                ]);
                setIsLoading(false);
                break;
            }
        }

        return () => {
            if (tokenUpdateTimeoutRef.current) clearTimeout(tokenUpdateTimeoutRef.current);
        };
    }, [coreMessages, currentFile, projectPath, openFile, addFileToIndex]);

    const addMessage = useCallback((msg: Omit<Message, "id">) => {
        setMessages((prev) => [...prev, { ...msg, id: generateMessageId(msg.role) }]);
    }, []);

    const sendMessage = useCallback(
        async (userMessage: string, context?: string) => {
            if (!userMessage.trim() || isLoading) return;

            // UI'da sadece kullanıcının yazdığı mesajı göster
            const userMsg = { id: generateMessageId("user"), role: "user" as const, content: userMessage, timestamp: Date.now() };
            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);

            try {
                // Aktif modeli bul
                const modelId = getModelIdForRole();

                // Geçmişi hazırla (Context burada geçmişe dahil edilmiyor, sadece son mesaja ekleniyor)
                const history = messages.map(m => ({ role: m.role, content: m.content }));

                // AI'ya gönderilecek mesaj (Context varsa ekle)
                // Not: Context'i history'ye eklemiyoruz, çünkü bir sonraki turda history'de 
                // devasa dosya içeriği olmasını istemeyiz. Sadece o anki prompt için geçerli olsun.
                const fullPrompt = context ? `${userMessage}\n${context}` : userMessage;

                // Mesaj placeholder
                const msgId = generateMessageId("assistant");
                setMessages(prev => [...prev, { id: msgId, role: "assistant", content: "", timestamp: Date.now() }]);

                // AI çağrısı (Streaming)
                await callAI(
                    fullPrompt, // AI burayı tam metin olarak görür
                    modelId,
                    history,
                    (token) => {
                        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: m.content + token } : m));
                    }
                );
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata oluştu.";
                setMessages((prev) => [...prev, { id: generateMessageId("error"), role: "system" as const, content: `❌ AI Hatası: ${errorMessage}`, timestamp: Date.now() }]);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, messages, addMessage]
    );

    const handleStopGeneration = useCallback(() => {
        stopCoreGeneration();
        setIsLoading(false);
    }, [stopCoreGeneration]);

    const handleRegenerateResponse = useCallback(() => {
        const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMessage) {
            setMessages((prev) => {
                const lastAssistantIndex = [...prev].reverse().findIndex((m) => m.role === "assistant");
                if (lastAssistantIndex === -1) return prev;
                const actualIndex = prev.length - 1 - lastAssistantIndex;
                return prev.filter((_, i) => i !== actualIndex);
            });
            sendMessage(lastUserMessage.content);
        }
    }, [messages, sendMessage]);

    const handleNewSession = useCallback(() => {
        const confirmMessage = `Yeni oturum başlatılsın mı?\n\n• ${messages.length} mesaj temizlenecek\n• Sohbet geçmişi silinecek\n• Proje dosyaları korunacak\n\nDevam edilsin mi?`;
        if (window.confirm(confirmMessage)) {
            resetConversation();
            setPendingActions([]);
            setMessages([
                {
                    id: generateMessageId("new-session"),
                    role: "system",
                    content: `🔄 Yeni oturum başlatıldı!\n\n✅ Sohbet geçmişi temizlendi\n✅ Context sıfırlandı\n✅ Proje dosyaları korundu\n\nYeni sorular sorabilirsin! 🚀`,
                    timestamp: Date.now(),
                },
            ]);
        }
    }, [messages.length]);

    const getProjectContext = useCallback(() => {
        return getConversationContext().projectContext;
    }, []);

    return {
        // State
        messages,
        isLoading,
        pendingActions,
        toolApprovalRequest,
        isCoreStreaming,

        // Setters
        setMessages,
        setPendingActions,
        setToolApprovalRequest,

        // Actions
        addMessage,
        sendMessage,
        handleStopGeneration,
        handleRegenerateResponse,
        handleNewSession,
        getProjectContext,
    };
}

// Kod bloklarından dosya oluştur (pure function, hook dışında)
async function createFilesFromCodeBlocks(
    codeBlocks: Array<{ language: string; code: string; filename?: string }>,
    projectPath: string,
    openFile: (path: string) => Promise<void>,
    addFileToIndex: (path: string, content: string) => Promise<void>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    currentFile?: string // 🆕
) {
    for (const block of codeBlocks) {
        const ext = EXTENSION_MAP[block.language.toLowerCase()] || "txt";
        let filename = block.filename;
        let isModification = false;

        // 🚨 Eğer filename belirtilmemişse VE açık bir dosya varsa -> O dosyayı güncelle!
        if (!filename && currentFile) {
            // Uzantı kontrolü gevşetildi: Kullanıcı aktif dosyayı düzenlemek istiyor sayıyoruz.
            // Sadece çok bariz uyumsuzlukları engelleyebiliriz ama şimdilik doğrudan yazsın.
            filename = currentFile.split(/[\\\/]/).pop(); // Sadece dosya adı
            isModification = true;
        }

        // Eğer hala filename yoksa -> Yeni dosya oluştur
        if (!filename) {
            filename = `generated_${Date.now()}.${ext}`;
        }

        if (!/\.\w+$/.test(filename)) filename = `${filename}.${ext}`;
        filename = filename.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");

        // Full path oluştur
        // Eğer isModification ise ve currentFile varsa, tam yolu kullan
        let filepath = (isModification && currentFile) ? currentFile : (projectPath ? `${projectPath}/${filename}` : filename);

        // Windows path düzeltme (Tauri için)
        if (projectPath && !filepath.includes(projectPath) && !filepath.includes(":") && !filepath.startsWith("/")) {
            filepath = `${projectPath}/${filename}`;
        }

        try {
            await invoke("write_file", { path: filepath, content: block.code });
            await openFile(filepath);
            await addFileToIndex(filepath, block.code);
            setMessages((prev) => [
                ...prev,
                {
                    id: `file-created-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    role: "system",
                    content: isModification
                        ? `✅ **${filename}** güncellendi!`
                        : `✅ **${filename}** oluşturuldu ve açıldı`,
                    timestamp: Date.now(),
                },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `file-error-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    role: "system",
                    content: `❌ ${filename} yazılamadı: ${error}`,
                    timestamp: Date.now(),
                },
            ]);
        }
    }
}
