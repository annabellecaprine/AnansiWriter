import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { ImportService } from './ImportService'
import { ExportService } from './ExportService'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'

describe('ImportService', () => {
    const novelId = uuidv4()
    const chapterId = uuidv4()
    const sceneId = uuidv4()

    beforeEach(async () => {
        // Clear all tables
        for (const table of db.tables) {
            await table.clear()
        }

        // Scaffold a minimal novel
        await db.novels.add({
            id: novelId,
            title: 'Import Test Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.chapters.add({
            id: chapterId,
            novelId,
            name: 'Chapter 1',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.scenes.add({
            id: sceneId,
            novelId,
            chapterId,
            name: 'Scene 1',
            content: { type: 'doc', content: [{ type: 'paragraph' }] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    it('should throw for an invalid archive (missing manifest)', async () => {
        const invalidBlob = new Blob(['not a zip'], { type: 'application/octet-stream' })
        const file = new File([invalidBlob], 'invalid.storyproject')

        await expect(ImportService.validateAndImportProject(file)).rejects.toThrow()
    })

    it('should detect collision when importing without importAsCopy', async () => {
        // Export the current project
        const blob = await ExportService.exportProject(novelId)

        // The project already exists in the DB, so importing without importAsCopy should collide
        const file = new File([blob], 'test.storyproject')

        // Now that the collision check properly hits db.novels, it should throw
        await expect(ImportService.validateAndImportProject(file)).rejects.toThrow('CollisionDetected')
    })

    it('should import as copy with new UUIDs and append (Copy) to title', async () => {
        const blob = await ExportService.exportProject(novelId)
        const file = new File([blob], 'test.storyproject')

        const newId = await ImportService.validateAndImportProject(file, { importAsCopy: true })

        expect(newId).toBeDefined()
        expect(newId).not.toBe(novelId)

        // The original novel should still exist
        const original = await db.novels.get(novelId)
        expect(original).toBeDefined()
        expect(original?.title).toBe('Import Test Novel')

        // The copy should exist with (Copy) appended
        const copy = await db.novels.get(newId)
        expect(copy).toBeDefined()
        expect(copy?.title).toBe('Import Test Novel (Copy)')
    })

    it('should peek project archive metadata and detect collision', async () => {
        const blob = await ExportService.exportProject(novelId)
        const file = new File([blob], 'test.storyproject')

        const peek = await ImportService.peekProjectArchive(file)
        expect(peek.isEncrypted).toBe(false)
        expect(peek.collision).toBe(true)
        expect(peek.manifest?.novel.title).toBe('Import Test Novel')
        expect(peek.counts?.chapters).toBe(1)
        expect(peek.counts?.scenes).toBe(1)
    })

    it('should overwrite existing novel when overwrite is true', async () => {
        const blob = await ExportService.exportProject(novelId)
        const file = new File([blob], 'test.storyproject')

        // Mutate original scene
        await db.scenes.update(sceneId, { name: 'Mutated Scene' })
        const mutated = await db.scenes.get(sceneId)
        expect(mutated?.name).toBe('Mutated Scene')

        // Import with overwrite
        const importedId = await ImportService.validateAndImportProject(file, { overwrite: true })
        expect(importedId).toBe(novelId)

        // Scene should be restored to 'Scene 1'
        const restored = await db.scenes.get(sceneId)
        expect(restored?.name).toBe('Scene 1')
    })
})
