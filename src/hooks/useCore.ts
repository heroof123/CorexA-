// hooks/useCore.ts
// React hook for Continue.dev-style Core communication

import { useEffect, useState, useCallback, useRef } from 'react';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { 
  CoreMessage, 
  GUIMessage, 
  createChatRequest,
  createStopGeneration,
  isStreamingMessage 
} from '../core/protocol';

/**
 * useCore Hook
 * Provides interface to communicate with Core through Extension
 */
export function useCore() {
  const [coreMessages, setCoreMessages] = useState<CoreMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  
  // 🔥 FIXED 2025: Batch streaming/token messages to prevent excessive re-renders
  const pendingTokenRef = useRef<CoreMessage | null>(null);
  const tokenBatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Listen to Core messages
  useEffect(() => {
    const setupListener = async () => {
      console.log('🎧 useCore: Setting up Core message listener...');
      
      const unlisten = await listen<CoreMessage>('core-message', (event) => {
        const message = event.payload;
        console.log(`📨 useCore: Received Core message: ${message.messageType}`);
        
        // 🔥 Batch streaming/token messages - don't setState for every token
        if (message.messageType === 'streaming/token') {
          pendingTokenRef.current = message;
          
          // Clear existing timeout
          if (tokenBatchTimeoutRef.current) {
            clearTimeout(tokenBatchTimeoutRef.current);
          }
          
        // 🔥 Batch after 200ms instead of immediate setState
          tokenBatchTimeoutRef.current = setTimeout(() => {
            if (pendingTokenRef.current) {
              setCoreMessages(prev => [...prev, pendingTokenRef.current!]);
              pendingTokenRef.current = null;
            }
          }, 200);
          
          return; // Don't process immediately
        }
        
        // For non-token messages, add immediately
        setCoreMessages(prev => [...prev, message]);
        
        // Track streaming state
        if (isStreamingMessage(message)) {
          if (message.messageType === 'streaming/start') {
            setIsStreaming(true);
            setCurrentRequestId(message.data.requestId);
          } else if (message.messageType === 'streaming/complete' || message.messageType === 'streaming/error') {
            setIsStreaming(false);
            setCurrentRequestId(null);
          }
        }
      });
      
      unlistenRef.current = unlisten;
      console.log('✅ useCore: Listener setup complete');
    };
    
    setupListener();
    
    // Cleanup
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        console.log('🧹 useCore: Listener cleaned up');
      }
      if (tokenBatchTimeoutRef.current) {
        clearTimeout(tokenBatchTimeoutRef.current);
      }
    };
  }, []);
  
  /**
   * Send message to Core
   */
  const sendMessage = useCallback(async (message: GUIMessage) => {
    console.log(`📤 useCore: Sending GUI message: ${message.messageType}`);
    try {
      await emit('gui-message', message);
    } catch (error) {
      console.error('❌ useCore: Failed to send message:', error);
      throw error;
    }
  }, []);
  
  /**
   * Send chat request
   */
  const sendChatRequest = useCallback(async (
    text: string,
    options?: {
      context?: string[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => {
    const message = createChatRequest(text, options);
    await sendMessage(message);
    return message.data.requestId;
  }, [sendMessage]);
  
  /**
   * Stop current generation
   */
  const stopGeneration = useCallback(async () => {
    if (!currentRequestId) {
      console.warn('⚠️ useCore: No active request to stop');
      return;
    }
    
    const message = createStopGeneration(currentRequestId);
    await sendMessage(message);
  }, [currentRequestId, sendMessage]);
  
  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setCoreMessages([]);
  }, []);
  
  return {
    // State
    coreMessages,
    isStreaming,
    currentRequestId,
    
    // Actions
    sendMessage,
    sendChatRequest,
    stopGeneration,
    clearMessages,
  };
}
