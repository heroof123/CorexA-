// src/components/MCPPanel.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { mcpService, McpServerConfig, McpTool } from '../services/mcpService';
import { Plus, Play, Square, Box, Info, Server, Activity, Terminal, ExternalLink } from 'lucide-react';

export const MCPPanel: React.FC = () => {
    const [servers, setServers] = useState<McpServerConfig[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [tools, setTools] = useState<McpTool[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Add Server Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newServer, setNewServer] = useState<McpServerConfig>({
        name: '',
        command: '',
        args: []
    });
    const [argsString, setArgsString] = useState('');

    const refreshServers = useCallback(async () => {
        try {
            const activeServers = await mcpService.listActiveServers();
            setServers(activeServers);
        } catch (error) {
            console.error('Failed to list servers:', error);
        }
    }, []);

    useEffect(() => {
        refreshServers();
        const interval = setInterval(refreshServers, 5000);
        return () => clearInterval(interval);
    }, [refreshServers]);

    const handleAddServer = async () => {
        if (!newServer.name || !newServer.command) return;

        setIsLoading(true);
        try {
            const config = {
                ...newServer,
                args: argsString.split(' ').filter(a => a.trim() !== '')
            };
            await mcpService.startServer(config);
            setNewServer({ name: '', command: '', args: [] });
            setArgsString('');
            setShowAddForm(false);
            await refreshServers();
        } catch (error) {
            alert('Failed to start server: ' + error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopServer = async (name: string) => {
        try {
            await mcpService.stopServer(name);
            if (selectedServer === name) {
                setSelectedServer(null);
                setTools([]);
            }
            await refreshServers();
        } catch (error) {
            console.error('Failed to stop server:', error);
        }
    };

    const handleSelectServer = async (name: string) => {
        setSelectedServer(name);
        try {
            const serverTools = await mcpService.listTools(name);
            setTools(serverTools);
        } catch (error) {
            console.error('Failed to list tools:', error);
            setTools([]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <Box size={18} className="text-blue-400" />
                    <h2 className="font-semibold text-sm tracking-tight">MCP Servers</h2>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-blue-400"
                    title="Add new server"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Add Server Form */}
                {showAddForm && (
                    <div className="p-4 border-b border-white/5 bg-blue-500/[0.03] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Server Name (e.g. Google Search)"
                                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={newServer.name}
                                onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Command (e.g. npx)"
                                    className="flex-1 bg-black/40 border border-white/10 rounded-md p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    value={newServer.command}
                                    onChange={e => setNewServer({ ...newServer, command: e.target.value })}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Arguments (space separated)"
                                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
                                value={argsString}
                                onChange={e => setArgsString(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-3 py-1.5 text-xs hover:bg-white/5 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddServer}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Activity size={14} className="animate-spin" /> : <Play size={14} />}
                                    Start Server
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Server List */}
                <div className="p-2 space-y-1">
                    {servers.length === 0 && !showAddForm && (
                        <div className="p-8 text-center flex flex-col items-center gap-3 opacity-40">
                            <Server size={32} />
                            <p className="text-xs">No MCP servers active.<br />Add one to extend AI capabilities.</p>
                        </div>
                    )}

                    {servers.map(server => (
                        <div
                            key={server.name}
                            onClick={() => handleSelectServer(server.name)}
                            className={`group p-3 rounded-lg border transition-all cursor-pointer ${selectedServer === server.name
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                    <span className="text-xs font-medium text-gray-200">{server.name}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleStopServer(server.name); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                                >
                                    <Square size={14} fill="currentColor" />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                                <span className="flex items-center gap-1"><Terminal size={10} /> {server.command}</span>
                                <span className="flex items-center gap-1 italic">{server.args.length} args</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tools Section */}
                {selectedServer && (
                    <div className="mt-4 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-3 bg-white/[0.01] flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            <Activity size={10} className="text-blue-500" />
                            Available Tools ({tools.length})
                        </div>
                        <div className="p-2 space-y-2">
                            {tools.length === 0 && (
                                <div className="p-4 text-center text-xs opacity-50 italic">
                                    Loading tools...
                                </div>
                            )}
                            {tools.map(tool => (
                                <div key={tool.name} className="p-3 rounded-md bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                                            <Box size={12} />
                                            {tool.name}
                                        </div>
                                        <Info size={12} className="text-gray-600 cursor-help hover:text-gray-400 transition-colors" />
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                                        {tool.description}
                                    </p>
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] text-gray-500 font-mono border border-white/5">
                                            JSON Schema
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Status */}
            <div className="p-2 border-t border-white/5 flex items-center justify-between bg-black/20">
                <div className="text-[10px] text-gray-600 flex items-center gap-1">
                    <Info size={10} />
                    MCP Protocol v1.0
                </div>
                <a
                    href="https://modelcontextprotocol.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                >
                    Documentation <ExternalLink size={10} />
                </a>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
};
