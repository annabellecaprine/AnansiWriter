import { db } from '../db/database'
import type { Snapshot } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'

export class SnapshotService {
    static async createManualSnapshot(novelId: string, name: string, reason: string = 'manual'): Promise<Snapshot> {
        // Collect full project data snapshot
        const project = await db.series.get(novelId)
        const series = await db.series.where('novelId').equals(novelId).toArray()
        const books = await db.novels.where('novelId').equals(novelId).toArray()
        const acts = await db.acts.where('novelId').equals(novelId).toArray()
        const chapters = await db.chapters.where('novelId').equals(novelId).toArray()
        const scenes = await db.scenes.where('novelId').equals(novelId).toArray()
        const bibleEntries = await db.bibleEntries.where('novelId').equals(novelId).toArray()
        const fieldValues = await db.fieldValues.where('novelId').equals(novelId).toArray()
        const relationships = await db.relationships.where('novelId').equals(novelId).toArray()
        const assets = await db.assets.where('novelId').equals(novelId).toArray()

        const snapshotData = {
            project,
            series,
            books,
            acts,
            chapters,
            scenes,
            bibleEntries,
            fieldValues,
            relationships,
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
            db.series,
            db.novels,
            db.acts,
            db.chapters,
            db.scenes,
            db.bibleEntries,
            db.fieldValues,
            db.relationships
        ], async () => {
            // Clear existing project items
            await db.series.where('novelId').equals(novelId).delete()
            await db.novels.where('novelId').equals(novelId).delete()
            await db.acts.where('novelId').equals(novelId).delete()
            await db.chapters.where('novelId').equals(novelId).delete()
            await db.scenes.where('novelId').equals(novelId).delete()
            await db.bibleEntries.where('novelId').equals(novelId).delete()
            await db.fieldValues.where('novelId').equals(novelId).delete()
            await db.relationships.where('novelId').equals(novelId).delete()

            // Restore from snapshot data
            if (data.project) await db.series.put(data.project)
            if (data.series) await db.series.bulkPut(data.series)
            if (data.books) await db.novels.bulkPut(data.books)
            if (data.acts) await db.acts.bulkPut(data.acts)
            if (data.chapters) await db.chapters.bulkPut(data.chapters)
            if (data.scenes) await db.scenes.bulkPut(data.scenes)
            if (data.bibleEntries) await db.bibleEntries.bulkPut(data.bibleEntries)
            if (data.fieldValues) await db.fieldValues.bulkPut(data.fieldValues)
            if (data.relationships) await db.relationships.bulkPut(data.relationships)
        })
    }
}
