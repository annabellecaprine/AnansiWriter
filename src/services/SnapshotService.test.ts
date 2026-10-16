import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { SnapshotService } from './SnapshotService'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'

describe('SnapshotService', () => {
    const novelId = uuidv4()

    beforeEach(async () => {
        await db.novels.clear()
        await db.chapters.clear()
        await db.scenes.clear()
        await db.acts.clear()
        await db.bibleEntries.clear()
        await db.fieldValues.clear()
        await db.relationships.clear()
        await db.assets.clear()
        await db.snapshots.clear()
        await db.series.clear()

        await db.novels.add({
            id: novelId,
            title: 'Snapshot Test Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        await db.chapters.add({
            id: uuidv4(),
            novelId,
            name: 'Chapter 1',
            sortOrder: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    it('should create a manual snapshot with correct structure', async () => {
        const snapshot = await SnapshotService.createManualSnapshot(novelId, 'Test Snapshot', 'manual')

        expect(snapshot).toBeDefined()
        expect(snapshot.novelId).toBe(novelId)
        expect(snapshot.name).toBe('Test Snapshot')
        expect(snapshot.reason).toBe('manual')
        expect(snapshot.data).toBeDefined()

        const data: any = snapshot.data
        expect(data.project.id).toBe(novelId)
        expect(data.chapters).toHaveLength(1)
    })

    it('should return snapshots in reverse-chronological order', async () => {
        await SnapshotService.createManualSnapshot(novelId, 'First', 'manual')
        // Small delay to ensure different timestamps
        await new Promise(r => setTimeout(r, 10))
        await SnapshotService.createManualSnapshot(novelId, 'Second', 'manual')

        const snapshots = await SnapshotService.getSnapshots(novelId)
        expect(snapshots).toHaveLength(2)
        expect(snapshots[0].name).toBe('Second')
        expect(snapshots[1].name).toBe('First')
    })

    it('should delete a snapshot', async () => {
        const snapshot = await SnapshotService.createManualSnapshot(novelId, 'Delete Me', 'manual')
        await SnapshotService.deleteSnapshot(snapshot.id)

        const remaining = await SnapshotService.getSnapshots(novelId)
        expect(remaining).toHaveLength(0)
    })

    it('should restore novel data from a snapshot', async () => {
        // Take a snapshot with the original title
        await SnapshotService.createManualSnapshot(novelId, 'Before Rename', 'manual')

        // Modify the novel title
        await db.novels.update(novelId, { title: 'MODIFIED TITLE', updatedAt: Date.now() })
        const modified = await db.novels.get(novelId)
        expect(modified!.title).toBe('MODIFIED TITLE')

        // Restore from the snapshot
        const snapshots = await SnapshotService.getSnapshots(novelId)
        await SnapshotService.restoreSnapshot(snapshots[0].id)

        // Verify the original title is restored
        const restored = await db.novels.get(novelId)
        expect(restored!.title).toBe('Snapshot Test Novel')
    })

    it('should throw when novel not found for snapshotting', async () => {
        await expect(SnapshotService.createManualSnapshot('non-existent', 'Fail', 'manual')).rejects.toThrow('Novel not found')
    })
})
