import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { AIChatService } from './AIChatService'

describe('AIChatService', () => {
    const novelId = 'test-chat-novel'

    beforeEach(async () => {
        await db.aiChatThreads.clear()
    })

    it('creates, retrieves, and lists active threads', async () => {
        const id1 = await AIChatService.createThread(novelId, 'claude-3', 'Brainstorming')
        const id2 = await AIChatService.createThread(novelId, 'gpt-4o', 'Outline Review')

        const thread1 = await AIChatService.getThread(id1)
        expect(thread1).toBeDefined()
        expect(thread1?.title).toBe('Brainstorming')
        expect(thread1?.modelId).toBe('claude-3')
        expect(thread1?.contextReferences).toEqual([])

        const active = await AIChatService.getActiveThreads(novelId)
        expect(active.length).toBe(2)
        expect(active.map(t => t.id)).toContain(id1)
        expect(active.map(t => t.id)).toContain(id2)
    })

    it('persists and updates context references on a thread', async () => {
        const id = await AIChatService.createThread(novelId, 'model-1', 'Context Test')

        const refs = [
            { id: 'scene-1', type: 'Scene', name: 'Opening Scene' },
            { id: 'char-1', type: 'Codex_Character', name: 'Hero' }
        ]

        await AIChatService.updateContextReferences(id, refs)

        const updated = await AIChatService.getThread(id)
        expect(updated?.contextReferences).toEqual(refs)

        // Removing a reference persists immediately
        const reducedRefs = [refs[0]]
        await AIChatService.updateContextReferences(id, reducedRefs)

        const finalThread = await AIChatService.getThread(id)
        expect(finalThread?.contextReferences).toEqual(reducedRefs)
    })

    it('adds messages and maintains chronology', async () => {
        const id = await AIChatService.createThread(novelId, 'model-1', 'Message Test')

        await AIChatService.addMessage(id, 'user', 'What is the theme?')
        await AIChatService.addMessage(id, 'assistant', 'The theme is sacrifice.')

        const thread = await AIChatService.getThread(id)
        expect(thread?.messages.length).toBe(2)
        expect(thread?.messages[0].role).toBe('user')
        expect(thread?.messages[0].content).toBe('What is the theme?')
        expect(thread?.messages[1].role).toBe('assistant')
        expect(thread?.messages[1].content).toBe('The theme is sacrifice.')
    })

    it('pins and archives threads correctly', async () => {
        const id1 = await AIChatService.createThread(novelId, 'model-1', 'Thread 1')
        const id2 = await AIChatService.createThread(novelId, 'model-1', 'Thread 2')

        await AIChatService.togglePin(id2, true)
        let active = await AIChatService.getActiveThreads(novelId)
        expect(active[0].id).toBe(id2) // Pinned thread comes first

        await AIChatService.toggleArchive(id1, true)
        active = await AIChatService.getActiveThreads(novelId)
        expect(active.length).toBe(1)
        expect(active[0].id).toBe(id2)

        const archived = await AIChatService.getArchivedThreads(novelId)
        expect(archived.length).toBe(1)
        expect(archived[0].id).toBe(id1)
    })
})
