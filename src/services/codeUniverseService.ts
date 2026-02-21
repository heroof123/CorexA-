import { invoke } from "@tauri-apps/api/core";
import { ghostDeveloper } from "./ghostDeveloper";

export interface UniverseNode {
    id: string; // File path
    name: string;
    val: number; // Size/Importance (based on LOC)
    group: string; // Directory
    color?: string;
}

export interface UniverseLink {
    source: string;
    target: string;
}

export interface CodeUniverseData {
    nodes: UniverseNode[];
    links: UniverseLink[];
}

export class CodeUniverseService {
    private static instance: CodeUniverseService;

    private constructor() { }

    public static getInstance(): CodeUniverseService {
        if (!CodeUniverseService.instance) {
            CodeUniverseService.instance = new CodeUniverseService();
        }
        return CodeUniverseService.instance;
    }

    public async getUniverseData(_projectPath: string): Promise<CodeUniverseData> {
        try {
            const { nodes: ghostNodes, links: ghostLinks } = (ghostDeveloper as any).getDependencyGraph();

            if (ghostNodes.length > 0) {
                const nodes: UniverseNode[] = ghostNodes.map((n: any) => ({
                    id: n.id,
                    name: n.name,
                    val: n.val,
                    group: n.id.split(/[\\\/]/).slice(0, -1).join("/") || "root",
                    color: this.getColorByExtension(n.id)
                }));

                const links: UniverseLink[] = ghostLinks.map((l: any) => ({
                    source: l.source,
                    target: l.target
                }));

                return { nodes, links };
            }

            // Fallback to basic file list if dependency graph not ready
            const files = await invoke<string[]>("get_all_files", { path: _projectPath });
            const nodes: UniverseNode[] = [];

            for (const file of files) {
                const isCode = /\.(ts|tsx|js|jsx|rs|py|go)$/.test(file);
                if (!isCode || file.includes("node_modules") || file.includes(".git")) continue;

                const pathParts = file.split(/[\\/]/);
                const name = pathParts[pathParts.length - 1];
                const group = pathParts.slice(0, -1).join("/") || "root";

                nodes.push({
                    id: file,
                    name,
                    val: 5,
                    group,
                    color: this.getColorByExtension(file)
                });
            }

            return { nodes, links: [] };
        } catch (error) {
            console.error("Failed to fetch universe data:", error);
            return { nodes: [], links: [] };
        }
    }

    private getColorByExtension(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts': return '#3178c6';
            case 'tsx': return '#61dafb';
            case 'js':
            case 'jsx': return '#f7df1e';
            case 'rs': return '#dea584';
            case 'py': return '#3776ab';
            case 'html': return '#e34f26';
            case 'css': return '#1572b6';
            default: return '#00ffff';
        }
    }
}

export const codeUniverseService = CodeUniverseService.getInstance();
