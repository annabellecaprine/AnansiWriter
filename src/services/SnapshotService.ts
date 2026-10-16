import { db } from '../db/database'
import type { Snapshot } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'

export class SnapshotService {
    static async createManualSnapshot(novelId: string, name: string, reason: string = 'manual'): Promise<Snapshot> {
        // Collect full project data snapshot based on activeNovelId
        const novel = await db.novels.get(novelId)
        if (!novel) throw new Error('Novel not found for snapshotting.')

        // We'll snapshot the primary Novel (target of activeNovelId)
        const books = [novel]

        // We'll also lazily snapshot its parent Series if it exists natively
        const series = novel.seriesId ? await db.series.where('id').equals(novel.seriesId).toArray() : []

        const acts = await db.acts.where('novelId').equals(novelId).toArray()
        const chapters = await db.chapters.where('novelId').equals(novelId).toArray()
        const scenes = await db.scenes.where('novelId').equals(novelId).toArray()
        const bibleEntries = await db.bibleEntries.where('novelId').equals(novelId).toArray()
        const fieldValues = await db.fieldValues.where('novelId').equals(novelId).toArray()
        const relationships = await db.relationships.where('novelId').equals(novelId).toArray()
        const assets = await db.assets.where('novelId').equals(novelId).toArray()
        // Store asset metadata without blobs to avoid consuming IndexedDB quota.
        // Asset binaries must be restored from a full .storyproject export if needed.
        const assetsMeta = assets.map(({ blob: _, ...meta }) => meta)

        const snapshotData = {
            project: novel, // Store the root target reference securely for restore extraction
            series,
            books,
            acts,
            chapters,
            scenes,
            bibleEntries,
            fieldValues,
            relationships,
            assetsMeta,
            assetsCount: assets.length
        }

        const snapshot: Snapshot = {
            id: uuidv4(),
            novelId,
            name: name || `Backup ${new Date().toLocaleDateString()}`,
            reason,
            data: snapshotData,
            createdAt: Date.now()
        }

        await db.snapshots.put(snapshot)
        return snapshot
    }

    static async getSnapshots(novelId: string): Promise<Snapshot[]> {
        return await db.snapshots
            .where('novelId')
            .equals(novelId)
            .reverse()
            .sortBy('createdAt')
    }

    static async deleteSnapshot(id: string): Promise<void> {
        await db.snapshots.delete(id)
    }

    static async restoreSnapshot(snapshotId: string): Promise<void> {
        const snapshot = await db.snapshots.get(snapshotId)
        if (!snapshot || !snapshot.data) {
            throw new Error('Snapshot not found or contains no data.')
        }

        const data: any = snapshot.data
        if (!data.project || !data.project.id) {
            throw new Error('Invalid snapshot structure.')
        }

        const novelId = data.project.id

        // Atomic update of project tables
        await db.transaction('rw', [
            db.series,
            db.novels,
            db.acts,
            db.chapters,
            db.scenes,
            db.bibleEntries,
            db.fieldValues,
            db.relationships
        ], async () => {
            // Clear existing project items using correct primary indices securely
            // Series isn't strictly cleared by novelId because multiple novels share it, we overwrite in put later if needed
            await db.novels.where('id').equals(novelId).delete()
            await db.acts.where('novelId').equals(novelId).delete()
            await db.chapters.where('novelId').equals(novelId).delete()
            await db.scenes.where('novelId').equals(novelId).delete()
            await db.bibleEntries.where('novelId').equals(novelId).delete()
            await db.fieldValues.where('novelId').equals(novelId).delete()
            await db.relationships.where('novelId').equals(novelId).delete()

            // Restore from snapshot data
            if (data.series) await db.series.bulkPut(data.series)
            if (data.books) await db.novels.bulkPut(data.books)
            if (data.acts) await db.acts.bulkPut(data.acts)
            if (data.chapters) await db.chapters.bulkPut(data.chapters)
            if (data.scenes) await db.scenes.bulkPut(data.scenes)
            if (data.bibleEntries) await db.bibleEntries.bulkPut(data.bibleEntries)
            if (data.fieldValues) await db.fieldValues.bulkPut(data.fieldValues)
            if (data.relationships) await db.relationships.bulkPut(data.relationships)

            // Note: Asset binaries are NOT restored from snapshots (excluded for storage efficiency).
            // Use a full .storyproject backup to restore assets.
            if (data.assetsCount > 0) {
                console.warn(`Snapshot contained ${data.assetsCount} asset(s) whose binary data was not preserved. Use a .storyproject export for full asset recovery.`)
            }
        })
    }
}
