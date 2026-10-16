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

    it('should import as copy with new UUIDs', async () => {
        const blob = await ExportService.exportProject(novelId)
        const file = new File([blob], 'test.storyproject')

        const newId = await ImportService.validateAndImportProject(file, { importAsCopy: true })

        expect(newId).toBeDefined()
        expect(newId).not.toBe(novelId)

        // The original novel should still exist
        const original = await db.novels.get(novelId)
        expect(original).toBeDefined()
    })
})
