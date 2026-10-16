import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { ExportService } from './ExportService'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import JSZip from 'jszip'

describe('ExportService', () => {
    const novelId = uuidv4()
    const chapterId = uuidv4()
    const sceneId = uuidv4()

    beforeEach(async () => {
        // Clear all relevant tables
        await db.novels.clear()
        await db.chapters.clear()
        await db.scenes.clear()
        await db.acts.clear()
        await db.sceneRevisions.clear()
        await db.bibleEntries.clear()
        await db.fieldValues.clear()
        await db.relationships.clear()
        await db.assets.clear()
        await db.assetLinks.clear()
        await db.prompts.clear()
        await db.promptCategories.clear()
        await db.aiModels.clear()
        await db.stagingSessions.clear()
        await db.aiRequestHistory.clear()
        await db.occurrences.clear()
        await db.snapshots.clear()

        // Scaffold a minimal novel with a chapter and scene
        await db.novels.add({
            id: novelId,
            title: 'Export Test Novel',
            author: 'Test Author',
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
            content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] },
            status: 'Draft',
            wordCount: 2,
            notes: '',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    it('should produce a valid ZIP blob with manifest.json and database.json', async () => {
        const blob = await ExportService.exportProject(novelId)
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.size).toBeGreaterThan(0)

        // Parse the ZIP
        const zip = await JSZip.loadAsync(blob)
        expect(zip.file('manifest.json')).not.toBeNull()
        expect(zip.file('database.json')).not.toBeNull()
    })

    it('should have a valid manifest structure', async () => {
        const blob = await ExportService.exportProject(novelId)
        const zip = await JSZip.loadAsync(blob)

        const manifestText = await zip.file('manifest.json')!.async('text')
        const manifest = JSON.parse(manifestText)

        expect(manifest.version).toBe(1)
        expect(manifest.exportDate).toBeDefined()
        expect(manifest.novel.id).toBe(novelId)
        expect(manifest.novel.title).toBe('Export Test Novel')
    })

    it('should include novel, chapters, and scenes in database.json', async () => {
        const blob = await ExportService.exportProject(novelId)
        const zip = await JSZip.loadAsync(blob)

        const dbText = await zip.file('database.json')!.async('text')
        const dbJson = JSON.parse(dbText)

        expect(dbJson.project.id).toBe(novelId)
        expect(dbJson.chapters).toHaveLength(1)
        expect(dbJson.scenes).toHaveLength(1)
        expect(dbJson.scenes[0].name).toBe('Scene 1')
    })

    it('should throw for non-existent novel', async () => {
        await expect(ExportService.exportProject('non-existent-id')).rejects.toThrow('Novel not found')
    })
})
