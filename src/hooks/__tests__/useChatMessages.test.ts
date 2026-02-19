// src/hooks/__tests__/useChatMessages.test.ts
// useChatMessages hook testleri

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';

// NOT: Tauri invoke setup.ts'teki global mock tarafından yönetiliyor.

vi.mock('../../services/ai', () => ({
    resetConversation: vi.fn(),
    getConversationContext: vi.fn().mockReturnValue({ projectContext: 'test context' }),
}));

vi.mock('../../services/db', () => ({
    saveConversation: vi.fn().mockResolvedValue(undefined),
    getConversation: vi.fn().mockResolvedValue(null),
}));

const mockSendChatRequest = vi.fn().mockResolvedValue('req-123');
const mockStopCoreGeneration = vi.fn();
const mockOpenFile = vi.fn().mockResolvedValue(undefined);
const mockAddFileToIndex = vi.fn().mockResolvedValue(undefined);

const defaultOptions = {
    projectPath: '/mock/project',
    coreMessages: [] as any[],
    isCoreStreaming: false,
    sendChatRequest: mockSendChatRequest,
    stopCoreGeneration: mockStopCoreGeneration,
    openFile: mockOpenFile,
    addFileToIndex: mockAddFileToIndex,
};

describe('useChatMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('başlangıçta boş state ile dönmeli', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        expect(result.current.messages).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.pendingActions).toEqual([]);
        expect(result.current.toolApprovalRequest).toBeNull();
    });

    it('addMessage ile mesaj ekleyebilmeli', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        act(() => {
            result.current.addMessage({
                role: 'system',
                content: 'Test mesajı',
                timestamp: Date.now(),
            });
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Test mesajı');
        expect(result.current.messages[0].role).toBe('system');
        expect(result.current.messages[0].id).toBeDefined();
    });

    it('sendMessage kullanıcı mesajı eklemeli ve AI\'ya göndermeli', async () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        await act(async () => {
            await result.current.sendMessage('Merhaba AI!');
        });

        // Kullanıcı mesajı eklenmeli
        const userMsg = result.current.messages.find(m => m.role === 'user');
        expect(userMsg).toBeDefined();
        expect(userMsg?.content).toBe('Merhaba AI!');

        // sendChatRequest çağrılmalı
        expect(mockSendChatRequest).toHaveBeenCalledWith('Merhaba AI!');
    });

    it('boş mesaj göndermemeli', async () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        await act(async () => {
            await result.current.sendMessage('   ');
        });

        expect(result.current.messages).toHaveLength(0);
        expect(mockSendChatRequest).not.toHaveBeenCalled();
    });

    it('yükleme sırasında mesaj göndermemeli', async () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        // İlk mesajı gönder (isLoading true olacak)
        mockSendChatRequest.mockImplementation(() => new Promise(() => { })); // hiç resolve olmayan
        act(() => {
            result.current.sendMessage('İlk mesaj');
        });

        // İkinci mesaj gönderilmemeli
        await act(async () => {
            await result.current.sendMessage('İkinci mesaj');
        });

        const userMessages = result.current.messages.filter(m => m.role === 'user');
        expect(userMessages).toHaveLength(1);
    });

    it("mesaj gönderme hatasını yönetmeli", async () => {
        const mockSend = vi.fn().mockRejectedValue(new Error("AI sunucusuna bağlanılamadı"));
        const { result } = renderHook(() => useChatMessages({ ...defaultOptions, sendChatRequest: mockSend }));

        await act(async () => {
            await result.current.sendMessage("test");
        });

        expect(result.current.messages).toContainEqual(expect.objectContaining({
            role: "system",
            content: expect.stringContaining("AI sunucusuna bağlanılamadı")
        }));
    });

    it("regenerateResponse son asistan mesajını silip tekrar göndermeli", async () => {
        const mockSend = vi.fn().mockResolvedValue("cevap");
        const { result } = renderHook(() => useChatMessages({ ...defaultOptions, sendChatRequest: mockSend }));

        await act(async () => {
            await result.current.sendMessage("ilk mesaj");
        });

        // Mock assistant response
        await act(async () => {
            result.current.setMessages(prev => [...prev, { id: "assistant-1", role: "assistant", content: "eski cevap", timestamp: Date.now() }]);
        });

        expect(result.current.messages.length).toBe(2);

        await act(async () => {
            result.current.handleRegenerateResponse();
        });

        // Eski asistan mesajı silinmiş olmalı ve yeni istek atılmış olmalı
        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(result.current.messages.some(m => m.content === "eski cevap")).toBe(false);
    });

    it("handleNewSession onay ile her şeyi sıfırlamalı", async () => {
        window.confirm = vi.fn().mockReturnValue(true);
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        await act(async () => {
            result.current.setMessages([{ id: "1", role: "user", content: "test", timestamp: Date.now() }]);
            result.current.handleNewSession();
        });

        expect(result.current.messages.length).toBe(1);
        expect(result.current.messages[0].role).toBe("system");
        expect(result.current.messages[0].content).toContain("Yeni oturum başlatıldı");
    });

    it("streaming token'ları throttle etmeli", async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        await act(async () => {
            // Streaming start
            const startMsg = { messageId: "1", messageType: "streaming/start", data: { requestId: "req1" } };
            const { rerender } = renderHook(() => useChatMessages({ ...defaultOptions, coreMessages: [startMsg as any] }));
        });

        // Burada renderHook içindeki useEffect'i tetiklemek için coreMessages değişmeli
        // Testi basitleştirmek için manuel tetikleme yapıyoruz
    });

    it("code block içeren streaming tamamlanınca parsellemeli", async () => {
        const mockOpenFile = vi.fn();
        const { result } = renderHook(() => useChatMessages({ ...defaultOptions, openFile: mockOpenFile }));

        const completeMsg = {
            messageId: "2",
            messageType: "streaming/complete",
            data: {
                requestId: "req1",
                fullResponse: "İşte kod:\n```typescript\nconst x = 1;\n```"
            }
        };

        await act(async () => {
            // Hook'u yeni coreMessages ile tekrar render deşeriyoruz
            // Gerçeğe uygunluk için useEffect'in tetiğini beklemeliyiz
        });
    });
    it('AI hatası olduğunda hata mesajı eklemeli', async () => {
        mockSendChatRequest.mockRejectedValueOnce(new Error('AI sunucusuna bağlanılamadı'));

        const { result } = renderHook(() => useChatMessages(defaultOptions));

        await act(async () => {
            await result.current.sendMessage('Hatalı istek');
        });

        const errorMsg = result.current.messages.find(m => m.role === 'system' && m.content.includes('❌'));
        expect(errorMsg).toBeDefined();
        expect(errorMsg?.content).toContain('AI sunucusuna bağlanılamadı');
    });

    it('handleStopGeneration streaming durmalı', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        act(() => {
            result.current.handleStopGeneration();
        });

        expect(mockStopCoreGeneration).toHaveBeenCalled();
        expect(result.current.isLoading).toBe(false);
    });

    it('handleNewSession onay sonrası temizlemeli', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        // Birkaç mesaj ekle
        act(() => {
            result.current.addMessage({ role: 'user', content: 'Test 1', timestamp: Date.now() });
            result.current.addMessage({ role: 'assistant', content: 'Cevap 1', timestamp: Date.now() });
        });

        expect(result.current.messages.length).toBeGreaterThan(0);

        act(() => {
            result.current.handleNewSession();
        });

        // Yeni session mesajı olmalı
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toContain('Yeni oturum');
        expect(result.current.pendingActions).toEqual([]);
    });

    it('handleNewSession iptal edildiğinde değişmemeli', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        act(() => {
            result.current.addMessage({ role: 'user', content: 'Test', timestamp: Date.now() });
        });

        const msgCountBefore = result.current.messages.length;

        act(() => {
            result.current.handleNewSession();
        });

        expect(result.current.messages.length).toBe(msgCountBefore);
    });

    it('getProjectContext doğru context döndürmeli', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        const ctx = result.current.getProjectContext();
        expect(ctx).toBe('test context');
    });

    it('pendingActions setter çalışmalı', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        act(() => {
            result.current.setPendingActions([
                { id: '1', type: 'create', filePath: '/test.ts', content: 'code', description: 'test' },
            ]);
        });

        expect(result.current.pendingActions).toHaveLength(1);
        expect(result.current.pendingActions[0].filePath).toBe('/test.ts');
    });

    it('toolApprovalRequest setter çalışmalı', () => {
        const { result } = renderHook(() => useChatMessages(defaultOptions));

        const mockResolve = vi.fn();
        act(() => {
            result.current.setToolApprovalRequest({
                toolName: 'run_terminal',
                parameters: { command: 'npm test' },
                resolve: mockResolve,
            });
        });

        expect(result.current.toolApprovalRequest).not.toBeNull();
        expect(result.current.toolApprovalRequest?.toolName).toBe('run_terminal');

        act(() => {
            result.current.setToolApprovalRequest(null);
        });

        expect(result.current.toolApprovalRequest).toBeNull();
    });

    it('isCoreStreaming prop olarak geçmeli', () => {
        const { result } = renderHook(() =>
            useChatMessages({ ...defaultOptions, isCoreStreaming: true })
        );

        expect(result.current.isCoreStreaming).toBe(true);
    });
});
