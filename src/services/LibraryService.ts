import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Series, Novel, Chapter, Scene } from '../db/schema'

/**
 * Handles Library lifecycle: creating Series and Novels intuitively.
 */
export class LibraryService {
    /**
     * Scaffolds an entirely Standalone Novel natively without dummy series structures.
     */
    static async createStandaloneNovel(title: string, author?: string): Promise<string> {
        const novelId = uuidv4()
        const now = Date.now()

        const novel: Novel = {
            id: novelId,
            seriesId: undefined, // Explicit null mapping
            title,
            author,
            createdAt: now,
            updatedAt: now,
        }

        const chapter: Chapter = {
            id: uuidv4(),
            novelId,
            name: 'Chapter 1',
            sortOrder: 1,
            createdAt: now,
            updatedAt: now,
        }

        const scene: Scene = {
            id: uuidv4(),
            novelId,
            chapterId: chapter.id,
            name: 'Scene 1',
            content: { type: 'doc', content: [{ type: 'paragraph' }] },
            status: 'Draft',
            wordCount: 0,
            notes: '',
            sortOrder: 1,
            createdAt: now,
            updatedAt: now,
        }

        await db.transaction('rw', [db.novels, db.chapters, db.scenes], async () => {
            await db.novels.add(novel)
            await db.chapters.add(chapter)
            await db.scenes.add(scene)
        })

        return novelId
    }

    /**
     * Creates an empty namespace Series Container.
     */
    static async createSeries(title: string, description?: string): Promise<string> {
        const id = uuidv4()
        const now = Date.now()

        await db.series.add({
            id,
            title,
            description,
            createdAt: now,
            updatedAt: now
        })
        return id
    }

    /**
     * Creates a Novel structured into an existing Series pipeline.
     */
    static async createNovelInSeries(seriesId: string, title: string, author?: string): Promise<string> {
        const novelId = uuidv4()
        const now = Date.now()

        // auto-grab last index
        const currentSeriesNovels = await db.novels.where({ seriesId }).toArray()

        const novel: Novel = {
            id: novelId,
            seriesId,
            seriesIndex: currentSeriesNovels.length + 1,
            title,
            author,
            createdAt: now,
            updatedAt: now,
        }

        const chapter: Chapter = {
            id: uuidv4(),
            novelId,
            name: 'Chapter 1',
            sortOrder: 1,
            createdAt: now,
            updatedAt: now,
        }

        await db.transaction('rw', [db.novels, db.chapters], async () => {
            await db.novels.add(novel)
            await db.chapters.add(chapter)
        })

        return novelId
    }

    /**
     * Completely wipe a Novel and all its cascade dependencies natively inside Dexie.
     */
    static async deleteNovel(id: string) {
        try {
            await db.transaction('rw', [
                db.novels, db.acts, db.chapters, db.scenes,
                db.sceneRevisions, db.bibleEntries, db.fieldValues,
                db.relationships, db.assets, db.assetLinks,
                db.prompts, db.aiModels, db.stagingSessions,
                db.aiRequestHistory, db.occurrences, db.snapshots,
                db.aiChatThreads
            ], async () => {
                await db.novels.delete(id)
                await db.acts.where('novelId').equals(id).delete()
                await db.chapters.where('novelId').equals(id).delete()
                await db.scenes.where('novelId').equals(id).delete()
                await db.sceneRevisions.filter(x => x.novelId === id).delete()
                await db.bibleEntries.where('novelId').equals(id).delete()
                await db.fieldValues.filter(x => x.novelId === id).delete()
                await db.relationships.filter(x => x.novelId === id).delete()
                await db.assets.filter(x => x.novelId === id).delete()
                await db.assetLinks.filter(x => x.novelId === id).delete()
                await db.prompts.filter(x => x.novelId === id).delete()
                await db.aiModels.filter(x => x.novelId === id).delete()
                await db.stagingSessions.filter(x => x.novelId === id).delete()
                await db.aiRequestHistory.filter(x => x.novelId === id).delete()
                await db.occurrences.filter(x => x.novelId === id).delete()
                await db.snapshots.filter(x => x.novelId === id).delete()
                await db.aiChatThreads.filter(x => x.novelId === id).delete()
            })
        } catch (e: any) {
            console.error('Cascade Delete Failed', e)
            alert(`Cascade Deletion Error: ${e.message || e}`)
            throw e
        }
    }

    /**
     * Rename a Series Container natively.
     */
    static async renameSeries(id: string, newTitle: string) {
        await db.series.update(id, { title: newTitle, updatedAt: Date.now() })
    }

    /**
     * Rename a Novel natively.
     */
    static async renameNovel(id: string, newTitle: string) {
        await db.novels.update(id, { title: newTitle, updatedAt: Date.now() })
    }

    /**
     * Relocate a novel explicitly to a new series (or undefined to push it to Standalone).
     */
    static async transferNovel(novelId: string, newSeriesId: string | undefined) {
        const novel = await db.novels.get(novelId)
        if (!novel) return

        let newIndex = 0
        if (newSeriesId) {
            const temp = await db.novels.where({ seriesId: newSeriesId }).sortBy('seriesIndex')
            newIndex = temp.length + 1
        }

        await db.novels.update(novelId, { seriesId: newSeriesId, seriesIndex: newIndex, updatedAt: Date.now() })
    }

    /**
     * Recommit Sortable index updates inside a Series container natively.
     */
    static async reorderSeriesNovels(novels: { id: string, seriesIndex: number }[]) {
        const now = Date.now()
        await db.transaction('rw', db.novels, async () => {
            for (const n of novels) {
                await db.novels.update(n.id, { seriesIndex: n.seriesIndex, updatedAt: now })
            }
        })
    }

    /**
     * Retrieves library aggregates efficiently
     */
    static async getLibraryContents(): Promise<{ series: Series[], standalones: Novel[] }> {
        const [series, allNovels] = await Promise.all([
            db.series.toArray(),
            db.novels.toArray()
        ])

        // Catch explicitly both undefined and the legacy buggy 'standalone' explicit string maps so ghost imports become visible and deletable
        const standalones = allNovels.filter(n => !n.seriesId || n.seriesId === 'standalone')

        return {
            series: series.sort((a, b) => b.updatedAt - a.updatedAt),
            standalones: standalones.sort((a, b) => b.updatedAt - a.updatedAt)
        }
    }
}
