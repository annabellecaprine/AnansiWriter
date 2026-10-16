import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { CodexConfigService, DEFAULT_CODEX_CATEGORIES, DEFAULT_RELATIONSHIP_TYPES } from './CodexConfigService'

describe('CodexConfigService', () => {
    beforeEach(async () => {
        await db.appSettings.clear()
        await db.bibleEntries.clear()
        await db.relationships.clear()
    })

    it('initializes with default categories and relationship types on first query', async () => {
        const categories = await CodexConfigService.getCategories()
        expect(categories.length).toBe(DEFAULT_CODEX_CATEGORIES.length)
        expect(categories[0].name).toBe('Character')

        const relTypes = await CodexConfigService.getRelationshipTypes()
        expect(relTypes.length).toBe(DEFAULT_RELATIONSHIP_TYPES.length)
        expect(relTypes.some(r => r.name === 'Possesses a...')).toBe(true)
    })

    it('adds a new category with custom fields, color, and icon', async () => {
        const newCat = await CodexConfigService.addCategory({
            name: 'Artifact',
            icon: 'Sword',
            color: '#ef4444',
            defaultFields: ['Power Level', 'Attunement', 'Curse']
        })

        expect(newCat.id).toBeDefined()
        expect(newCat.name).toBe('Artifact')
        expect(newCat.defaultFields).toEqual(['Power Level', 'Attunement', 'Curse'])

        const all = await CodexConfigService.getCategories()
        expect(all.some(c => c.name === 'Artifact')).toBe(true)
    })

    it('updates category without touching existing entries when applyToExisting is false', async () => {
        const cat = await CodexConfigService.addCategory({
            name: 'Faction',
            icon: 'Shield',
            color: '#3b82f6',
            defaultFields: ['Influence']
        })

        // Add a bible entry with 'Faction'
        await db.bibleEntries.add({
            id: 'entry-1',
            name: 'The Iron Guard',
            type: 'Faction',
            tags: [],
            aliases: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const res = await CodexConfigService.updateCategory(cat.id, { name: 'Syndicate' }, false)
        expect(res.modifiedCount).toBe(0)

        // Existing entry is still 'Faction'
        const entry = await db.bibleEntries.get('entry-1')
        expect(entry?.type).toBe('Faction')

        // Settings list has 'Syndicate'
        const all = await CodexConfigService.getCategories()
        expect(all.find(c => c.id === cat.id)?.name).toBe('Syndicate')
    })

    it('updates category and migrates existing entries when applyToExisting is true', async () => {
        const cat = await CodexConfigService.addCategory({
            name: 'Spell',
            icon: 'Sparkles',
            color: '#a855f7',
            defaultFields: ['Mana Cost']
        })

        await db.bibleEntries.add({
            id: 'entry-2',
            name: 'Fireball',
            type: 'Spell',
            tags: [],
            aliases: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        const res = await CodexConfigService.updateCategory(cat.id, { name: 'Incantation' }, true)
        expect(res.modifiedCount).toBe(1)

        const entry = await db.bibleEntries.get('entry-2')
        expect(entry?.type).toBe('Incantation')
    })

    it('adds, updates, and deletes relationship types', async () => {
        const newRel = await CodexConfigService.addRelationshipType({
            name: 'Wields',
            reverseName: 'Wielded By',
            defaultDirection: 'outbound',
            color: '#ec4899'
        })

        expect(newRel.name).toBe('Wields')

        await db.relationships.add({
            id: 'rel-1',
            novelId: 'novel-1',
            sourceId: 'char-1',
            targetId: 'sword-1',
            type: 'Wields',
            isBidirectional: false,
            notes: '',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Rename with applyToExisting: true
        const updated = await CodexConfigService.updateRelationshipType(newRel.id, { name: 'Attuned To' }, true)
        expect(updated.modifiedCount).toBe(1)

        const rel = await db.relationships.get('rel-1')
        expect(rel?.type).toBe('Attuned To')

        // Delete relationship type
        await CodexConfigService.deleteRelationshipType(newRel.id)
        const all = await CodexConfigService.getRelationshipTypes()
        expect(all.some(r => r.id === newRel.id)).toBe(false)
    })

    it('includes Pronouns and Status in Character defaults and Mentor Of, Enemy Of, Romantic Partner in relationship types', async () => {
        const categories = await CodexConfigService.getCategories()
        const charCat = categories.find(c => c.name === 'Character')
        expect(charCat).toBeDefined()
        expect(charCat?.defaultFields).toContain('Pronouns')
        expect(charCat?.defaultFields).toContain('Status')

        const relTypes = await CodexConfigService.getRelationshipTypes()
        expect(relTypes.some(r => r.name === 'Mentor Of' && r.reverseName === 'Mentored By')).toBe(true)
        expect(relTypes.some(r => r.name === 'Enemy Of' && r.defaultDirection === 'bidirectional')).toBe(true)
        expect(relTypes.some(r => r.name === 'Romantic Partner' && r.defaultDirection === 'bidirectional')).toBe(true)
    })

    it('backfills missing starter fields without overwriting existing values', async () => {
        const novelId = 'novel-test-backfill'
        await db.novels.add({
            id: novelId,
            title: 'Test Backfill Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Add character entry with only 'Full Name' field
        const entryId = 'char-entry-1'
        await db.bibleEntries.add({
            id: entryId,
            novelId,
            name: 'Sarah Connor',
            type: 'Character',
            tags: [],
            aliases: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.fieldValues.add({
            id: 'fv-existing',
            novelId,
            entryId,
            fieldKey: 'Full Name',
            value: 'Sarah Jeanette Connor',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // Run backfill for Character category
        const result = await CodexConfigService.backfillStarterFields(novelId, 'Character')
        expect(result.entriesUpdated).toBe(1)
        expect(result.fieldsAdded).toBeGreaterThanOrEqual(8) // Pronouns, Status, Age, Eye Color, etc.

        // Verify existing value was NOT overwritten
        const fnField = await db.fieldValues.where({ entryId, fieldKey: 'Full Name' }).first()
        expect(fnField?.value).toBe('Sarah Jeanette Connor')

        // Verify Pronouns was added with blank value
        const pronounField = await db.fieldValues.where({ entryId, fieldKey: 'Pronouns' }).first()
        expect(pronounField).toBeDefined()
        expect(pronounField?.value).toBe('')

        // Running backfill again adds 0 fields
        const rerun = await CodexConfigService.backfillStarterFields(novelId, 'Character')
        expect(rerun.entriesUpdated).toBe(0)
        expect(rerun.fieldsAdded).toBe(0)
    })

    it('returns consolidated known field keys', async () => {
        const keys = await CodexConfigService.getKnownFieldKeys()
        expect(keys).toContain('Pronouns')
        expect(keys).toContain('Status')
        expect(keys).toContain('Distinguishing Traits')
        expect(keys).toContain('Rules')
    })
})
