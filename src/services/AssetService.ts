import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'

export class AssetService {
    /**
     * Ingests a raw file as a binary Blob and optionally links it to a specific target (like a Bible Entry or Scene)
     */
    static async uploadAsset(novelId: string, file: File, targetId?: string): Promise<string> {
        const id = uuidv4()

        await db.assets.add({
            id,
            novelId,
            name: file.name,
            mimeType: file.type,
            blob: file, // For Phase 2 we just directly store the File blob natively
            sizeBytes: file.size,
            createdAt: Date.now()
        })

        if (targetId) {
            await db.assetLinks.add({
                id: uuidv4(),
                novelId,
                assetId: id,
                targetId,
                targetType: 'BibleEntry',
                role: 'reference'
            })
        }

        return id
    }

    /**
     * Resolves all binary assets linked to a given entity.
     * Maps through AssetLinks to find native Blobs.
     */
    static async getLinkedAssets(novelId: string, targetId: string) {
        const links = await db.assetLinks.where({ novelId, targetId }).toArray()
        const assetIds = links.map(l => l.assetId)

        if (assetIds.length === 0) return []

        return await db.assets.where('id').anyOf(assetIds).toArray()
    }
}
