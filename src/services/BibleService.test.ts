import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { BibleService } from './BibleService'

describe('BibleService Regression & Persistence', () => {
    const novelId = 'test-codex-novel'

    beforeEach(async () => {
        await db.bibleEntries.clear()
        await db.fieldValues.clear()
        await db.relationships.clear()
        await db.novels.clear()

        await db.novels.add({
            id: novelId,
            title: 'Test Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    it('creates an entry and preserves description, aliases, tags, and keywords', async () => {
        const entryId = await BibleService.createEntry(novelId, 'Alden Vane', 'Character')
        await BibleService.updateEntry(novelId, entryId, {
            description: 'A master alchemist of the high court.',
            aliases: ['The Gilded Hand', 'Al'],
            tags: ['Court', 'Alchemist'],
            keywords: ['transmutation', 'gold', 'relic']
        })

        const reloaded = await BibleService.getEntry(entryId)
        expect(reloaded).toBeDefined()
        expect(reloaded?.name).toBe('Alden Vane')
        expect(reloaded?.type).toBe('Character')
        expect(reloaded?.description).toBe('A master alchemist of the high court.')
        expect(reloaded?.aliases).toEqual(['The Gilded Hand', 'Al'])
        expect(reloaded?.tags).toEqual(['Court', 'Alchemist'])
        expect(reloaded?.keywords).toEqual(['transmutation', 'gold', 'relic'])
    })

    it('updates entry metadata on blur/edit and preserves updates upon reload', async () => {
        const entryId = await BibleService.createEntry(novelId, 'Seraphina', 'Character')

        await BibleService.updateEntry(novelId, entryId, {
            description: 'Updated master archivist description.',
            aliases: ['The Archivist', 'Sera'],
            tags: ['Archive', 'Scholar'],
            keywords: ['library', 'scrolls']
        })

        const reloaded = await BibleService.getEntry(entryId)
        expect(reloaded?.description).toBe('Updated master archivist description.')
        expect(reloaded?.aliases).toEqual(['The Archivist', 'Sera'])
        expect(reloaded?.tags).toEqual(['Archive', 'Scholar'])
        expect(reloaded?.keywords).toEqual(['library', 'scrolls'])
    })

    it('persists field values, state changes, and reloads with getEntryWithFields', async () => {
        const entryId = await BibleService.createEntry(novelId, 'Castle Blackthorn', 'Location')

        // Add fields
        const field1Id = await BibleService.addFieldValue(novelId, entryId, 'Primary Defense', 'Iron Gates', 'Canon')
        const field2Id = await BibleService.addFieldValue(novelId, entryId, 'Secret Tunnel', 'Under cellar', 'Planned')

        let withFields = await BibleService.getEntryWithFields(novelId, entryId)
        expect(withFields?.fields.length).toBe(2)
        const f1 = withFields?.fields.find(f => f.id === field1Id)
        const f2 = withFields?.fields.find(f => f.id === field2Id)
        expect(f1?.value).toBe('Iron Gates')
        expect(f1?.state).toBe('Canon')
        expect(f2?.value).toBe('Under cellar')
        expect(f2?.state).toBe('Planned')

        // Update field value and state
        await BibleService.updateFieldValue(novelId, field2Id, {
            value: 'Flooded sea cave',
            state: 'Drafted'
        })

        withFields = await BibleService.getEntryWithFields(novelId, entryId)
        const updatedF2 = withFields?.fields.find(f => f.id === field2Id)
        expect(updatedF2?.value).toBe('Flooded sea cave')
        expect(updatedF2?.state).toBe('Drafted')

        // Delete field
        await BibleService.deleteFieldValue(novelId, field1Id)
        withFields = await BibleService.getEntryWithFields(novelId, entryId)
        expect(withFields?.fields.length).toBe(1)
        expect(withFields?.fields[0].id).toBe(field2Id)
    })

    it('supports moving an entry to trash and restores or isolates it from active listings', async () => {
        const entryId = await BibleService.createEntry(novelId, 'Ephemeral NPC', 'Character')

        let active = await BibleService.listActiveEntries(novelId)
        expect(active.some(e => e.id === entryId)).toBe(true)

        // Move to trash
        await BibleService.moveToTrash(novelId, entryId)
        active = await BibleService.listActiveEntries(novelId)
        expect(active.some(e => e.id === entryId)).toBe(false)

        const trashed = await BibleService.listTrashedEntries(novelId)
        expect(trashed.some(e => e.id === entryId)).toBe(true)

        // Restore
        await BibleService.restoreFromTrash(novelId, entryId)
        active = await BibleService.listActiveEntries(novelId)
        expect(active.some(e => e.id === entryId)).toBe(true)
    })

    it('creates a series-scoped entry on a standalone novel, provisions series, and lists it upon reload', async () => {
        // Novel starts without a seriesId
        const standaloneNovel = await db.novels.get(novelId)
        expect(standaloneNovel?.seriesId).toBeUndefined()

        // Create series-scoped entry
        const entryId = await BibleService.createEntry(novelId, 'The Hermetic Order', 'Organization', 'series')
        expect(entryId).toBeDefined()

        // Verify novel was linked to an auto-provisioned series
        const updatedNovel = await db.novels.get(novelId)
        expect(updatedNovel?.seriesId).toBeDefined()

        const createdEntry = await BibleService.getEntry(entryId)
        expect(createdEntry?.seriesId).toBe(updatedNovel?.seriesId)
        expect(createdEntry?.novelId).toBeUndefined()

        // Crucial bug test: entry must appear in listActiveEntries upon reload
        const activeList = await BibleService.listActiveEntries(novelId)
        expect(activeList.some(e => e.id === entryId)).toBe(true)
    })

    it('heals orphaned entries missing both novelId and seriesId', async () => {
        // Insert an orphaned entry (like an old corrupted state)
        const orphanId = 'orphaned-entry-1'
        await db.bibleEntries.add({
            id: orphanId,
            novelId: undefined,
            seriesId: undefined,
            name: 'The Hungering One',
            type: 'Creature',
            tags: [],
            aliases: [],
            keywords: [],
            description: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        // listActiveEntries should heal it and attach it to the novel series
        const activeList = await BibleService.listActiveEntries(novelId)
        expect(activeList.some(e => e.id === orphanId)).toBe(true)

        const healed = await BibleService.getEntry(orphanId)
        expect(healed?.seriesId).toBeDefined()
    })

    it('creates Story Guide entries using template with canonical setting-neutral fields', async () => {
        const entryId = await BibleService.createEntryUsingTemplate(novelId, 'State of the World', 'Story Guide')
        const withFields = await BibleService.getEntryWithFields(novelId, entryId)

        expect(withFields?.name).toBe('State of the World')
        expect(withFields?.type).toBe('Story Guide')
        const fieldLabels = withFields?.fields.map(f => f.fieldKey)
        expect(fieldLabels).toContain('State of the World')
        expect(fieldLabels).toContain('Central Conflict')
        expect(fieldLabels).toContain('Current Era / Setting')
        expect(fieldLabels).toContain('Key Factions')
        expect(fieldLabels).toContain('Themes')
    })
})
