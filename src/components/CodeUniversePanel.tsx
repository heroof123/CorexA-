import { useEffect, useState, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { codeUniverseService, CodeUniverseData } from '../services/codeUniverseService';
import * as THREE from 'three';

interface CodeUniversePanelProps {
    projectPath: string;
    onOpenFile: (path: string) => void;
    onClose: () => void;
}

export default function CodeUniversePanel({ projectPath, onOpenFile, onClose }: CodeUniversePanelProps) {
    const [data, setData] = useState<CodeUniverseData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const fgRef = useRef<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const universeData = await codeUniverseService.getUniverseData(projectPath);
            setData(universeData);
            setLoading(false);
        };
        fetchData();
    }, [projectPath]);

    // Bloom effect / Glowing nodes
    const nodeThreeObject = (node: any) => {
        const geometry = new THREE.SphereGeometry(node.val || 1, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: node.color || 0x00ffff,
            transparent: true,
            opacity: 0.8,
            emissive: node.color || 0x00ffff,
            emissiveIntensity: 0.5
        });
        return new THREE.Mesh(geometry, material);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
            {/* Header */}
            <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🌌</span>
                    <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest">Code Universe</h2>
                    <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        {data.nodes.length} Nodes
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-neutral-400 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                    ✕ Close Universe
                </button>
            </div>

            {/* 3D Canvas */}
            <div className="flex-1 relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-blue-400 animate-pulse">Mapping dependencies...</p>
                        </div>
                    </div>
                )}

                <ForceGraph3D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="name"
                    nodeColor={(node: any) => node.color || '#00ffff'}
                    nodeVal="val"
                    linkColor={() => '#ffffff'}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    backgroundColor="#000000"
                    onNodeClick={(node: any) => {
                        onOpenFile(node.id);
                        onClose();
                    }}
                    nodeThreeObject={nodeThreeObject}
                />

                {/* Legend / Overlay */}
                <div className="absolute bottom-6 left-6 p-4 glass-panel border border-blue-500/30 rounded-lg max-w-xs pointer-events-none">
                    <h3 className="text-xs font-bold text-blue-400 mb-2">Universe Guide</h3>
                    <ul className="text-[10px] text-neutral-400 space-y-1">
                        <li className="flex items-center gap-2 font-mono">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Spheres: Source Files
                        </li>
                        <li className="flex items-center gap-2 font-mono">
                            <span className="w-2 h-2 bg-white/30 h-[1px]"></span>
                            Lines: Imports / Dependencies
                        </li>
                        <li className="mt-2 text-neutral-500 italic">
                            Use Mouse to Orbit, Scroll to Zoom
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
