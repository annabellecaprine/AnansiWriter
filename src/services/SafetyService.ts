import { ExportService } from './ExportService'
import { ImportService } from './ImportService'
import { db } from '../db/database'

export class SafetyService {
    /**
     * Performs a 100% accurate duplication of a project by routing it 
     * through the native binary compilation and re-import lifecycle.
     */
    static async duplicateProject(novelId: string): Promise<string> {
        const rawZipBlob = await ExportService.exportProject(novelId)
        const mockFile = new File([rawZipBlob], 'duplicate-in-memory.storyproject')
        return await ImportService.validateAndImportProject(mockFile, { importAsCopy: true })
    }

    /**
     * Serializes the current active state of a project and safely embeds it 
     * into the local IndexedDB Snapshots table, creating an implicit restore point 
     * prior to dangerous operations.
     */
    static async createSnapshot(novelId: string, reason: string): Promise<void> {
        const rawZipBlob = await ExportService.exportProject(novelId)

        await db.snapshots.add({
            id: crypto.randomUUID(),
            novelId,
            name: `Snapshot: ${reason}`,
            reason,
            data: rawZipBlob,
            createdAt: Date.now()
        })

        // Prune logic could go here to limit max snapshots per project (e.g. 5)
    }
}
