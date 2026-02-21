export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolExecution?: {
    toolName: string;
    status: "running" | "completed" | "failed";
    startTime: number;
    endTime?: number;
    result?: any; // Keep as any for flexibility with tool results
    error?: string;
  };
};

export type FileIndex = {
  path: string;
  content: string;
  embedding: number[];
  lastModified: number;
};

export type ProjectIndex = {
  projectPath: string;
  files: FileIndex[];
  lastIndexed: number;
  version: string;
};

export type DiffChange = {
  filePath: string;
  oldContent: string;
  newContent: string;
  approved: boolean;
};

export type CodeAction = {
  id: string;
  type: "create" | "modify" | "delete" | "patch";
  filePath: string;
  content: string;
  oldContent?: string;
  description: string;
  patchData?: { search: string; replace: string };
};

export type AIResponse = {
  text: string;
  actions?: CodeAction[];
};

export type FileNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
};