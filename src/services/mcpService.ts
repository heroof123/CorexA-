// src/services/mcpService.ts

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface McpServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export interface McpTool {
    name: string;
    description: string;
    inputSchema: any;
}

export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: string | number;
    method: string;
    params?: any;
}

export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: string | number;
    result?: any;
    error?: any;
}

class McpService {
    private responseWaiters: Map<string | number, (res: JsonRpcResponse) => void> = new Map();
    private activeListeners: Set<string> = new Set();

    /**
     * MCP Server başlatır ve cevapları dinlemeye başlar
     */
    async startServer(config: McpServerConfig): Promise<string> {
        const result = await invoke<string>("start_mcp_server", { config });

        // Bu server için daha önce dinleyici eklenmemişse ekle
        if (!this.activeListeners.has(config.name)) {
            await listen<string>(`mcp-response-${config.name}`, (event) => {
                try {
                    const response: JsonRpcResponse = JSON.parse(event.payload);
                    if (response.id && this.responseWaiters.has(response.id)) {
                        const resolve = this.responseWaiters.get(response.id);
                        if (resolve) {
                            resolve(response);
                            this.responseWaiters.delete(response.id);
                        }
                    }
                } catch (e) {
                    console.error(`[MCP ${config.name}] Response parse error:`, e, event.payload);
                }
            });
            this.activeListeners.add(config.name);
        }

        return result;
    }

    /**
     * MCP Server'a JSON-RPC isteği gönderir ve cevabı bekler
     */
    async sendRequest(serverName: string, method: string, params?: any): Promise<any> {
        const requestId = Math.floor(Math.random() * 1000000);
        const request: JsonRpcRequest = {
            jsonrpc: "2.0",
            id: requestId,
            method,
            params,
        };

        return new Promise(async (resolve, reject) => {
            // Timeout ekle (30 saniye)
            const timeout = setTimeout(() => {
                if (this.responseWaiters.has(requestId)) {
                    this.responseWaiters.delete(requestId);
                    reject(new Error(`MCP Request timeout: ${method}`));
                }
            }, 30000);

            this.responseWaiters.set(requestId, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.result);
                }
            });

            try {
                await invoke("send_mcp_request", {
                    serverName,
                    request: JSON.stringify(request),
                });
            } catch (e) {
                clearTimeout(timeout);
                this.responseWaiters.delete(requestId);
                reject(e);
            }
        });
    }

    /**
     * Server'daki araçları listeler
     */
    async listTools(serverName: string): Promise<McpTool[]> {
        const result = await this.sendRequest(serverName, "tools/list");
        return result.tools || [];
    }

    /**
     * Bir aracı çağırır
     */
    async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        return await this.sendRequest(serverName, "tools/call", {
            name: toolName,
            arguments: args,
        });
    }

    /**
     * Server'ı durdurur
     */
    async stopServer(serverName: string): Promise<string> {
        return await invoke<string>("stop_mcp_server", { serverName });
    }

    /**
     * Aktif server'ları listeler
     */
    async listActiveServers(): Promise<McpServerConfig[]> {
        return await invoke<McpServerConfig[]>("list_mcp_servers");
    }
}

export const mcpService = new McpService();
