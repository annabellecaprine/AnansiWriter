import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import { BibleExporter } from './export/BibleExporter'
import { CodexImportService } from './CodexImportService'
import { CodexConfigService } from './CodexConfigService'

describe('CodexImportService', () => {
    const novelId = uuidv4()
    const targetNovelId = uuidv4()

    beforeEach(async () => {
        for (const table of db.tables) {
            await table.clear()
        }

        // Setup source novel
        await db.novels.add({
            id: novelId,
            title: 'Source Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Setup target novel
        await db.novels.add({
            id: targetNovelId,
            title: 'Target Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    it('should detect a BibleExporter zip as a Codex archive', async () => {
        const entryId = uuidv4()
        await db.bibleEntries.add({
            id: entryId,
            novelId,
            name: 'Finn',
            type: 'Character',
            aliases: ['The Hungering One'],
            tags: ['Vampire'],
            keywords: ['blood'],
            description: 'A dhampir warrior.',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const blob = await BibleExporter.exportBible(novelId)
        const isCodex = await CodexImportService.isCodexArchive(blob)
        expect(isCodex).toBe(true)
    })

    it('should parse entries, attributes, and relationships from a codex export zip', async () => {
        const finnId = uuidv4()
        const swordId = uuidv4()

        await db.bibleEntries.add({
            id: finnId,
            novelId,
            name: 'Finn',
            type: 'Character',
            aliases: ['The Hungering One'],
            tags: ['Vampire'],
            keywords: ['blood'],
            description: 'A dhampir warrior.',
            researchNotes: 'Originated in book 1.',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: swordId,
            novelId,
            name: 'Moonlight Blade',
            type: 'Item',
            aliases: ['Silver Sword'],
            tags: ['Weapon'],
            description: 'A glowing blade.',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Add fields
        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: finnId,
            fieldKey: 'Distinguishing Traits',
            value: 'Silver eyes',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Add relationship: Finn -> Moonlight Blade
        await db.relationships.add({
            id: uuidv4(),
            novelId,
            sourceId: finnId,
            targetId: swordId,
            type: 'Possesses a...',
            isBidirectional: false,
            notes: 'Inherited from family',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const blob = await BibleExporter.exportBible(novelId)
        const parsed = await CodexImportService.parseCodexArchive(blob)

        expect(parsed.entries.length).toBe(2)
        expect(parsed.entryCountsByType['Character']).toBe(1)
        expect(parsed.entryCountsByType['Item']).toBe(1)

        const finn = parsed.entries.find(e => e.name === 'Finn')
        expect(finn).toBeDefined()
        expect(finn?.type).toBe('Character')
        expect(finn?.aliases).toContain('The Hungering One')
        expect(finn?.tags).toContain('Vampire')
        expect(finn?.description).toBe('A dhampir warrior.')
        expect(finn?.researchNotes).toBe('Originated in book 1.')
        expect(finn?.fields).toEqual([{ fieldKey: 'Distinguishing Traits', value: 'Silver eyes' }])
        expect(finn?.relationships).toEqual([{
            type: 'Possesses a...',
            targetName: 'Moonlight Blade',
            notes: 'Inherited from family'
        }])
    })

    it('should import codex entries into a target novel and resolve relationships', async () => {
        const finnId = uuidv4()
        const swordId = uuidv4()

        await db.bibleEntries.add({
            id: finnId,
            novelId,
            name: 'Finn',
            type: 'Character',
            aliases: [],
            tags: [],
            description: 'Warrior',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.bibleEntries.add({
            id: swordId,
            novelId,
            name: 'Moonlight Blade',
            type: 'Item',
            aliases: [],
            tags: [],
            description: 'Weapon',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.relationships.add({
            id: uuidv4(),
            novelId,
            sourceId: finnId,
            targetId: swordId,
            type: 'Possesses a...',
            isBidirectional: false,
            notes: 'Sacred relic',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const blob = await BibleExporter.exportBible(novelId)
        const parsed = await CodexImportService.parseCodexArchive(blob)

        const result = await CodexImportService.importCodexPackage(parsed, {
            targetNovelId: targetNovelId,
            overwriteExisting: false
        })

        expect(result.importedCount).toBe(2)
        expect(result.relationshipsCreated).toBe(1)

        // Verify target novel has entries
        const targetEntries = await db.bibleEntries.where({ novelId: targetNovelId }).toArray()
        expect(targetEntries.length).toBe(2)

        const targetFinn = targetEntries.find(e => e.name === 'Finn')
        const targetBlade = targetEntries.find(e => e.name === 'Moonlight Blade')
        expect(targetFinn).toBeDefined()
        expect(targetBlade).toBeDefined()

        // Verify target novel has relationship
        const targetRels = await db.relationships.where({ novelId: targetNovelId }).toArray()
        expect(targetRels.length).toBe(1)
        expect(targetRels[0].sourceId).toBe(targetFinn!.id)
        expect(targetRels[0].targetId).toBe(targetBlade!.id)
        expect(targetRels[0].type).toBe('Possesses a...')
        expect(targetRels[0].notes).toBe('Sacred relic')
    })
})
