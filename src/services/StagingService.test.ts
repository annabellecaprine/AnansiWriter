import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { StagingService } from './StagingService'
import type { StagingMessage, EntityState } from '../db/schema'

describe('StagingService', () => {
    const novelId = 'test-staging-novel'
    const charId = 'test-staging-char'

    beforeEach(async () => {
        await db.stagingSessions.clear()
        await db.fieldValues.clear()
        await db.bibleEntries.clear()

        await db.bibleEntries.add({
            id: charId,
            novelId,
            name: 'Kaelen',
            type: 'Character',
            tags: [],
            aliases: [],
            description: 'A rogue scout.',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    describe('Save and Reopen Session', () => {
        it('saves a session and restores character, model, context snapshot, and message tree', async () => {
            const history: StagingMessage[] = [
                { id: 'm1', parentId: null, role: 'user', content: 'Who are you?', timestamp: 100 },
                { id: 'm2', parentId: 'm1', role: 'Character', content: 'I am Kaelen.', timestamp: 200 }
            ]

            const contextSnapshot = {
                assembledSystemInstruction: 'Roleplay Kaelen',
                budgetLimit: 35000,
                totalEstimatedTokens: 250,
                includedSources: [{ id: charId, name: 'Kaelen', type: 'Character', contentSpan: '...', estimatedTokens: 250 }],
                excludedSources: []
            }

            const sessionId = await StagingService.saveSession({
                novelId,
                name: 'Kaelen Voice Test',
                characterId: charId,
                modelId: 'anthropic/claude-3-haiku',
                provider: 'openrouter',
                contextSnapshot,
                history
            })

            const session = await StagingService.getSession(sessionId)
            expect(session).toBeDefined()
            expect(session?.name).toBe('Kaelen Voice Test')
            expect(session?.metadata.characterId).toBe(charId)
            expect(session?.metadata.modelId).toBe('anthropic/claude-3-haiku')
            expect(session?.context).toEqual(contextSnapshot)
            expect(session?.history.length).toBe(2)
            expect(session?.history[1].content).toBe('I am Kaelen.')

            const list = await StagingService.listSessions(novelId)
            expect(list.length).toBe(1)
            expect(list[0].id).toBe(sessionId)
        })

        it('fails to save when required fields are missing', async () => {
            await expect(StagingService.saveSession({
                novelId: '',
                name: 'Test',
                characterId: charId,
                contextSnapshot: {},
                history: []
            })).rejects.toThrow('novelId is required')

            await expect(StagingService.saveSession({
                novelId,
                name: '',
                characterId: charId,
                contextSnapshot: {},
                history: []
            })).rejects.toThrow('Session name cannot be empty')

            await expect(StagingService.saveSession({
                novelId,
                name: 'Valid Name',
                characterId: '',
                contextSnapshot: {},
                history: []
            })).rejects.toThrow('A target character is required')
        })
    })

    describe('Branching Message Tree', () => {
        it('preserves the original conversation path while creating a distinct child path', () => {
            // Linear sequence: m1 -> m2 -> m3
            const m1: StagingMessage = { id: 'm1', parentId: null, role: 'user', content: 'Root question', timestamp: 1 }
            const m2: StagingMessage = { id: 'm2', parentId: 'm1', role: 'Character', content: 'Root answer', timestamp: 2 }
            const m3: StagingMessage = { id: 'm3', parentId: 'm2', role: 'user', content: 'Deep dive A', timestamp: 3 }

            let history = [m1, m2, m3]

            // Verify linear trajectory to m3
            const pathOriginal = StagingService.getActivePath(history, 'm3')
            expect(pathOriginal.map(m => m.id)).toEqual(['m1', 'm2', 'm3'])

            // Branch from m1
            const { branchId, activeLeafId } = StagingService.branchFromMessage(history, 'm1')
            expect(branchId).toBeDefined()
            expect(activeLeafId).toBe('m1')

            // Append new message on the branch: m4 parent is m1
            const { message: m4, newHistory } = StagingService.addMessage(history, 'user', 'Alternative question', activeLeafId)
            expect(m4.parentId).toBe('m1')
            history = newHistory

            // Verify original path is still intact
            const pathA = StagingService.getActivePath(history, 'm3')
            expect(pathA.map(m => m.id)).toEqual(['m1', 'm2', 'm3'])

            // Verify branched path has diverged cleanly
            const pathB = StagingService.getActivePath(history, m4.id)
            expect(pathB.map(m => m.id)).toEqual(['m1', m4.id])
            expect(pathB.map(m => m.content)).toEqual(['Root question', 'Alternative question'])
        })

        it('throws when branching from a non-existent message ID', () => {
            expect(() => StagingService.branchFromMessage([], 'non-existent')).toThrow('Target message non-existent not found')
        })
    })

    describe('Insight Promotion with Provenance', () => {
        it('promotes insight to Codex without automatic Canon marking, preserving provenance', async () => {
            const sessionId = 'session-123'
            const branchId = 'branch-abc'
            const messageId = 'msg-456'

            const fieldId = await StagingService.promoteInsight({
                novelId,
                entryId: charId,
                fieldKey: 'Secret Weakness',
                value: 'Afraid of deep water',
                state: 'Drafted', // Explicit non-canon state
                provenance: {
                    stagingSessionId: sessionId,
                    branchId,
                    messageId,
                    promotionTarget: 'BibleEntry'
                }
            })

            const field = await db.fieldValues.get(fieldId)
            expect(field).toBeDefined()
            expect(field?.entryId).toBe(charId)
            expect(field?.fieldKey).toBe('Secret Weakness')
            expect(field?.value).toBe('Afraid of deep water')
            expect(field?.state).toBe('Drafted') // Never marked Canon automatically
            expect(field?.provenance.length).toBe(1)

            const prov = field?.provenance[0] as any
            expect(prov.stagingSessionId).toBe(sessionId)
            expect(prov.branchId).toBe(branchId)
            expect(prov.messageId).toBe(messageId)
            expect(prov.promotionTarget).toBe('BibleEntry')
        })

        it('supports explicit Canon selection when author explicitly chooses Canon', async () => {
            const fieldId = await StagingService.promoteInsight({
                novelId,
                entryId: charId,
                fieldKey: 'Confirmed Trait',
                value: 'Expert archer',
                state: 'Canon', // Explicit author choice
                provenance: {
                    stagingSessionId: 'sess-1',
                    messageId: 'msg-1'
                }
            })

            const field = await db.fieldValues.get(fieldId)
            expect(field?.state).toBe('Canon')
        })

        it('fails promotion when parameters are missing or destination does not exist', async () => {
            await expect(StagingService.promoteInsight({
                novelId,
                entryId: 'non-existent-entry',
                fieldKey: 'Trait',
                value: 'Some value',
                state: 'Drafted',
                provenance: { stagingSessionId: 's', messageId: 'm' }
            })).rejects.toThrow('Target Bible entry does not exist')

            await expect(StagingService.promoteInsight({
                novelId,
                entryId: charId,
                fieldKey: '',
                value: 'Some value',
                state: 'Drafted',
                provenance: { stagingSessionId: 's', messageId: 'm' }
            })).rejects.toThrow('Field key/name is required')

            await expect(StagingService.promoteInsight({
                novelId,
                entryId: charId,
                fieldKey: 'Trait',
                value: '   ',
                state: 'Drafted',
                provenance: { stagingSessionId: 's', messageId: 'm' }
            })).rejects.toThrow('Promoted content cannot be empty')
        })
    })
})
