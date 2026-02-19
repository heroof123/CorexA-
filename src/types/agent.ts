export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'user-review';

export interface TaskStep {
    id: string;
    description: string;
    toolCall?: {
        name: string;
        parameters: any;
    };
    result?: any;
    status: TaskStatus;
    timestamp: number;
}

export interface AgentTask {
    id: string;
    title: string;
    objective: string;
    context?: string;
    steps: TaskStep[];
    currentStepIndex: number;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
}

export interface AgentState {
    isThinking: boolean;
    currentTask: AgentTask | null;
    mode: 'chat' | 'agent';
}
