import { db } from '../db/database'
import type { Scene } from '../db/schema'

export class ArchiveService {
    /**
     * Archive a scene (remove from active manuscript, keep in DB)
     */
    static async archiveScene(sceneId: string): Promise<void> {
        await db.scenes.update(sceneId, { isArchived: true, archivedAt: Date.now(), updatedAt: Date.now() })
    }

    /**
     * Restore an archived scene back into the active manuscript
     */
    static async restoreScene(sceneId: string): Promise<void> {
        await db.scenes.update(sceneId, { isArchived: false, archivedAt: undefined, updatedAt: Date.now() })
    }

    /**
     * Soft-delete (trash) a scene
     */
    static async trashScene(sceneId: string): Promise<void> {
        await db.scenes.update(sceneId, { isTrashed: true, trashedAt: Date.now(), updatedAt: Date.now() })
    }

    /**
     * Restore from trash
     */
    static async restoreFromTrash(sceneId: string): Promise<void> {
        await db.scenes.update(sceneId, { isTrashed: false, trashedAt: undefined, updatedAt: Date.now() })
    }

    /**
     * Get all archived scenes for a novel
     */
    static async getArchivedScenes(novelId: string): Promise<Scene[]> {
        return db.scenes.where({ novelId, isArchived: true }).sortBy('archivedAt')
    }

    /**
     * Duplicate a scene with a "(Copy)" suffix
     */
    static async duplicateScene(sceneId: string): Promise<string> {
        const scene = await db.scenes.get(sceneId)
        if (!scene) throw new Error('Scene not found')

        const newId = crypto.randomUUID()
        const now = Date.now()
        const siblings = await db.scenes.where({ chapterId: scene.chapterId }).toArray()

        await db.scenes.add({
            ...scene,
            id: newId,
            name: `${scene.name} (Copy)`,
            sortOrder: siblings.length + 1,
            isArchived: false,
            isTrashed: false,
            createdAt: now,
            updatedAt: now,
        })

        return newId
    }
}
