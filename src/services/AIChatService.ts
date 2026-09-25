import { db } from '../db/database'
import { AIChatThread } from '../db/schema'

export class AIChatService {
    static async createThread(novelId: string, modelId: string, title: string = 'New Chat'): Promise<string> {
        const id = crypto.randomUUID()
        const now = Date.now()
        await db.aiChatThreads.add({
            id,
            novelId,
            title,
            messages: [],
            modelId,
            contextReferences: [],
            isPinned: false,
            isArchived: false,
            createdAt: now,
            updatedAt: now
        })
        return id
    }

    static async getThread(threadId: string): Promise<AIChatThread | undefined> {
        return await db.aiChatThreads.get(threadId)
    }

    static async updateThread(threadId: string, updates: Partial<AIChatThread>): Promise<void> {
        await db.aiChatThreads.update(threadId, { ...updates, updatedAt: Date.now() })
    }

    static async addMessage(threadId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
        const thread = await db.aiChatThreads.get(threadId)
        if (!thread) throw new Error('Thread not found')

        const newMessages = [...thread.messages, { role, content }]
        await db.aiChatThreads.update(threadId, {
            messages: newMessages,
            updatedAt: Date.now()
        })
    }

    static async togglePin(threadId: string, isPinned: boolean): Promise<void> {
        await db.aiChatThreads.update(threadId, { isPinned, updatedAt: Date.now() })
    }

    static async toggleArchive(threadId: string, isArchived: boolean): Promise<void> {
        await db.aiChatThreads.update(threadId, { isArchived, updatedAt: Date.now() })
    }

    static async deleteThread(threadId: string): Promise<void> {
        await db.aiChatThreads.delete(threadId)
    }

    static async getActiveThreads(novelId: string): Promise<AIChatThread[]> {
        const results = await db.aiChatThreads.where('novelId').equals(novelId).toArray()
        const active = results.filter(t => !t.isArchived)
        return active.sort((a, b) => {
            if (a.isPinned === b.isPinned) return b.updatedAt - a.updatedAt
            return a.isPinned ? -1 : 1
        })
    }

    static async getArchivedThreads(novelId: string): Promise<AIChatThread[]> {
        const results = await db.aiChatThreads.where('novelId').equals(novelId).toArray()
        const archived = results.filter(t => t.isArchived)
        return archived.sort((a, b) => b.updatedAt - a.updatedAt)
    }
}
