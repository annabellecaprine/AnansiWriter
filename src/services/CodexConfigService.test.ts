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
})
