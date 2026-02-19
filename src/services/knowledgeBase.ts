/**
 * Knowledge Base Service
 * AI'nın proje ve kullanıcı tercihlerini hatırlamasını sağlayan, localStorage tabanlı kalıcı hafıza.
 */

export interface KnowledgeItem {
    id: string;
    category: 'user_preference' | 'project_context' | 'solution_pattern';
    content: string;
    timestamp: number;
}

const STORAGE_KEY = 'corex-knowledge-base';

class KnowledgeBaseService {
    private items: KnowledgeItem[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.items = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load knowledge base', e);
        }
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
        } catch (e) {
            console.error('Failed to save knowledge base', e);
        }
    }

    public addKnowledge(content: string, category: KnowledgeItem['category'] = 'project_context') {
        const newItem: KnowledgeItem = {
            id: crypto.randomUUID(),
            category,
            content,
            timestamp: Date.now()
        };
        this.items.push(newItem);
        this.save();
        return newItem;
    }

    public search(query: string): KnowledgeItem[] {
        const q = query.toLowerCase();
        // Basit kelime bazlı arama (ileride vektör benzerliği olabilir)
        return this.items.filter(item => item.content.toLowerCase().includes(q));
    }

    public getAll(): KnowledgeItem[] {
        return this.items;
    }

    public clear() {
        this.items = [];
        this.save();
    }
}

export const knowledgeBase = new KnowledgeBaseService();
