import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { ContextEngine } from './ContextEngine'
import { db } from '../../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt, BibleEntry, FieldValue } from '../../db/schema'

function makeMinimalPrompt(overrides: Partial<Prompt> = {}): Prompt {
    return {
        id: uuidv4(),
        scope: 'global',
        categoryId: uuidv4(),
        name: 'Test Prompt',
        tags: [],
        description: 'Test',
        outputMode: 'chat',
        defaultModel: 'test-model',
        allowedModels: [],
        temperature: 0.7,
        maxOutputTokens: 2000,
        tokenBudget: 35000,
        systemInstruction: 'You are a helper.',
        userTemplate: 'User says: {{userInput}}',
        applicableFields: ['prose'],
        presets: [],
        contextRecipe: [],
        inputs: [],
        isFavorite: false,
        isEnabled: true,
        isTrashed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides
    }
}

describe('ContextEngine', () => {
    const novelId = uuidv4()

    beforeEach(async () => {
        await db.scenes.clear()
        await db.bibleEntries.clear()
        await db.fieldValues.clear()
        await db.occurrences.clear()
    })

    it('substitutes manual input variables into userTemplate', async () => {
        const prompt = makeMinimalPrompt({
            userTemplate: 'Focus on: {{focus}} with style: {{style}}',
            inputs: [
                { kind: 'manual', name: 'focus', manualType: 'text', isRequired: false },
                { kind: 'manual', name: 'style', manualType: 'text', isRequired: false }
            ]
        })

        const result = await ContextEngine.assemble(prompt, null, { focus: 'character', style: 'noir' })

        expect(result.assembledUserPrompt).toBe('Focus on: character with style: noir')
    })

    it('uses default values for unspecified manual inputs', async () => {
        const prompt = makeMinimalPrompt({
            userTemplate: 'Mode: {{mode}}',
            inputs: [
                { kind: 'manual', name: 'mode', manualType: 'select', options: ['A', 'B'], defaultValue: 'B', isRequired: false }
            ]
        })

        const result = await ContextEngine.assemble(prompt, null, {})

        expect(result.assembledUserPrompt).toBe('Mode: B')
    })

    it('enforces token budget and excludes sources when exhausted', async () => {
        const sceneId = uuidv4()
        const longText = 'word '.repeat(200000)

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Long Scene',
            content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: longText }] }] },
            status: 'Draft',
            wordCount: 200000,
            notes: '',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            tokenBudget: 100,
            userTemplate: '{{sceneContent}}',
            inputs: [
                { kind: 'context', name: 'sceneContent', type: 'CurrentScene', isRequired: true }
            ]
        })

        const result = await ContextEngine.assemble(prompt, sceneId)

        expect(result.excludedSources.length).toBeGreaterThanOrEqual(1)
        expect(result.excludedSources[0].reason).toContain('budget')
        expect(result.assembledUserPrompt).not.toContain('{{sceneContent}}')
    })

    it('respects excludedObjectIds for manual exclusion', async () => {
        const sceneId = uuidv4()

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Excluded Scene',
            content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Some text.' }] }] },
            status: 'Draft',
            wordCount: 2,
            notes: '',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            userTemplate: '{{sceneContent}}',
            inputs: [
                { kind: 'context', name: 'sceneContent', type: 'CurrentScene', isRequired: true }
            ]
        })

        const result = await ContextEngine.assemble(prompt, sceneId, {}, [], [sceneId])

        expect(result.excludedSources.length).toBeGreaterThanOrEqual(1)
        expect(result.excludedSources[0].reason).toContain('Manually excluded')
        expect(result.assembledUserPrompt).not.toContain('{{sceneContent}}')
    })

    it('includes real field values for Character occurrences, not just the name', async () => {
        const sceneId = uuidv4()
        const charId = uuidv4()

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Tavern Scene',
            content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'In the tavern...' }] }] },
            status: 'Draft',
            wordCount: 10,
            notes: '',
            sortOrder: 1,
            narrativePosition: { sequence: 10 },
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: charId,
            novelId,
            name: 'Lord Corvus',
            type: 'Character',
            tags: ['nobility'],
            aliases: ['The Raven'],
            description: 'A shadowy diplomat.',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Occurrence links Corvus to Tavern Scene
        await db.occurrences.add({
            id: uuidv4(),
            novelId,
            sceneId,
            entryId: charId,
            keywordOrAlias: 'Lord Corvus',
            confidence: 1.0,
            isConfirmed: true,
            isDismissed: false
        })

        // Add Canon field
        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: charId,
            fieldKey: 'Secret Weapon',
            value: 'Poisoned signet ring',
            state: 'Canon',
            validFrom: { sequence: 1 },
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            userTemplate: 'Characters in scene:\n{{characters}}',
            inputs: [
                { kind: 'context', name: 'characters', type: 'CharacterState', isRequired: true }
            ]
        })

        const result = await ContextEngine.assemble(prompt, sceneId)

        expect(result.assembledUserPrompt).toContain('Lord Corvus')
        expect(result.assembledUserPrompt).toContain('Description: A shadowy diplomat.')
        expect(result.assembledUserPrompt).toContain('- Secret Weapon: Poisoned signet ring')
        expect(result.includedSources.some(s => s.name === 'Lord Corvus')).toBe(true)
    })

    it('enforces temporal narrative bounds: future facts cannot leak into earlier scenes', async () => {
        const earlySceneId = uuidv4()
        const lateSceneId = uuidv4()
        const charId = uuidv4()

        // Early scene (sequence = 5)
        await db.scenes.add({
            id: earlySceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Early Scene',
            content: { type: 'doc', content: [] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 1,
            narrativePosition: { sequence: 5 },
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Late scene (sequence = 20)
        await db.scenes.add({
            id: lateSceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Late Scene',
            content: { type: 'doc', content: [] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 2,
            narrativePosition: { sequence: 20 },
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: charId,
            novelId,
            name: 'Prince Eric',
            type: 'Character',
            tags: [],
            aliases: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Future fact: only valid from sequence 15 onward
        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: charId,
            fieldKey: 'Title',
            value: 'King of Valoria',
            state: 'Canon',
            validFrom: { sequence: 15 },
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            userTemplate: '{{charInfo}}',
            inputs: [
                { kind: 'context', name: 'charInfo', type: 'CharacterState', isRequired: true }
            ]
        })

        // Test 1: Early scene (sequence 5) with pinned character -> King title must NOT appear
        const earlyResult = await ContextEngine.assemble(prompt, earlySceneId, {}, [charId])
        expect(earlyResult.assembledUserPrompt).not.toContain('King of Valoria')

        // Test 2: Late scene (sequence 20) with pinned character -> King title MUST appear
        const lateResult = await ContextEngine.assemble(prompt, lateSceneId, {}, [charId])
        expect(lateResult.assembledUserPrompt).toContain('King of Valoria')
    })

    it('excludes Retconned and Discarded facts from automatic context', async () => {
        const sceneId = uuidv4()
        const charId = uuidv4()

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Scene',
            content: { type: 'doc', content: [] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 1,
            narrativePosition: { sequence: 10 },
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: charId,
            novelId,
            name: 'Wizard',
            type: 'Character',
            tags: [],
            aliases: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: charId,
            fieldKey: 'Element',
            value: 'Fire',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: charId,
            fieldKey: 'Old Element',
            value: 'Water',
            state: 'Retconned',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: charId,
            fieldKey: 'Draft Idea',
            value: 'Lightning',
            state: 'Discarded',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            userTemplate: '{{charInfo}}',
            inputs: [
                { kind: 'context', name: 'charInfo', type: 'CharacterState', isRequired: true }
            ]
        })

        const result = await ContextEngine.assemble(prompt, sceneId, {}, [charId])
        expect(result.assembledUserPrompt).toContain('Fire')
        expect(result.assembledUserPrompt).not.toContain('Water')
        expect(result.assembledUserPrompt).not.toContain('Lightning')
    })

    it('honors excludeFromContext on BibleEntry even when pinned', async () => {
        const sceneId = uuidv4()
        const charId = uuidv4()

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId: uuidv4(),
            name: 'Scene',
            content: { type: 'doc', content: [] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: charId,
            novelId,
            name: 'Secret Spy',
            type: 'Character',
            tags: [],
            aliases: [],
            excludeFromContext: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const prompt = makeMinimalPrompt({
            userTemplate: '{{charInfo}}',
            inputs: [
                { kind: 'context', name: 'charInfo', type: 'CharacterState', isRequired: true }
            ]
        })

        const result = await ContextEngine.assemble(prompt, sceneId, {}, [charId])
        expect(result.assembledUserPrompt).not.toContain('Secret Spy')
        expect(result.excludedSources.some(s => s.reason.includes('excludeFromContext'))).toBe(true)
    })

    it('leaves zero {{variables}} unresolved even when context sources are empty or missing', async () => {
        const prompt = makeMinimalPrompt({
            systemInstruction: 'Instruction with {{missingContext}} and {{unsuppliedManual}}',
            userTemplate: 'Template with {{characters}} and {{previousScene}} and {{random}}',
            inputs: [
                { kind: 'context', name: 'characters', type: 'CharacterState', isRequired: false },
                { kind: 'context', name: 'previousScene', type: 'PreviousScene', isRequired: false },
                { kind: 'manual', name: 'unsuppliedManual', manualType: 'text', isRequired: false }
            ]
        })

        const result = await ContextEngine.assemble(prompt, null)

        expect(result.assembledUserPrompt).not.toContain('{{')
        expect(result.assembledUserPrompt).not.toContain('}}')
        expect(result.assembledSystemInstruction).not.toContain('{{')
        expect(result.assembledSystemInstruction).not.toContain('}}')
    })

    describe('assembleChatContext', () => {
        it('resolves Scene, Codex with fields, and Planning content into shared system instruction with receipt', async () => {
            const sceneId = uuidv4()
            const charId = uuidv4()

            await db.scenes.add({
                id: sceneId,
                novelId,
                chapterId: uuidv4(),
                name: 'Climax Battle',
                content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The clash begins.' }] }] },
                status: 'Draft',
                wordCount: 10,
                notes: '',
                sortOrder: 1,
                planningContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Climax planning notes.' }] }] },
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            await db.bibleEntries.add({
                id: charId,
                novelId,
                name: 'Commander Aria',
                type: 'Character',
                tags: [],
                aliases: [],
                description: 'A brave strategist.',
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            await db.fieldValues.add({
                id: uuidv4(),
                novelId,
                entryId: charId,
                fieldKey: 'Tactical Role',
                value: 'Vanguard Leader',
                state: 'Canon',
                validFrom: null,
                validUntil: null,
                provenance: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            const refs = [
                { id: sceneId, type: 'Scene', name: 'Climax Battle' },
                { id: charId, type: 'Codex_Character', name: 'Commander Aria' },
                { id: sceneId, type: 'Planning_Scene', name: 'Scene Plan: Climax Battle' }
            ]

            const assembly = await ContextEngine.assembleChatContext(novelId, refs)

            expect(assembly.includedSources.length).toBe(3)
            expect(assembly.assembledSystemInstruction).toContain('Climax Battle')
            expect(assembly.assembledSystemInstruction).toContain('The clash begins.')
            expect(assembly.assembledSystemInstruction).toContain('Commander Aria')
            expect(assembly.assembledSystemInstruction).toContain('Tactical Role: Vanguard Leader')
            expect(assembly.assembledSystemInstruction).toContain('Climax planning notes.')
            expect(assembly.totalEstimatedTokens).toBeGreaterThan(0)
        })

        it('respects manual exclusions and token budgets in assembleChatContext', async () => {
            const sceneId = uuidv4()
            const charId = uuidv4()

            await db.scenes.add({
                id: sceneId,
                novelId,
                chapterId: uuidv4(),
                name: 'Excluded Scene',
                content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Should not appear.' }] }] },
                status: 'Draft',
                wordCount: 10,
                notes: '',
                sortOrder: 1,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            await db.bibleEntries.add({
                id: charId,
                novelId,
                name: 'Aria',
                type: 'Character',
                tags: [],
                aliases: [],
                description: 'A strategist.',
                createdAt: Date.now(),
                updatedAt: Date.now()
            })

            const refs = [
                { id: sceneId, type: 'Scene', name: 'Excluded Scene' },
                { id: charId, type: 'Codex_Character', name: 'Aria' }
            ]

            // Manual exclusion of scene
            const assemblyExcl = await ContextEngine.assembleChatContext(novelId, refs, null, [sceneId])
            expect(assemblyExcl.assembledSystemInstruction).not.toContain('Should not appear.')
            expect(assemblyExcl.excludedSources.some(e => e.id === sceneId && e.reason.includes('Manually excluded'))).toBe(true)
            expect(assemblyExcl.includedSources.some(s => s.id === charId)).toBe(true)

            // Extremely tight budget limits
            const assemblyBudget = await ContextEngine.assembleChatContext(novelId, refs, null, [], 15)
            expect(assemblyBudget.excludedSources.some(e => e.reason.includes('budget exhausted'))).toBe(true)
        })
    })
})
