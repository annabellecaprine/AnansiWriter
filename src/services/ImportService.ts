import JSZip from 'jszip'
import { db } from '../db/database'
import { CryptoService } from './CryptoService'

export class ImportService {
    /**
     * Imports a .storyproject archive transactionally.
     * Ensures structure validity and optionally performs full UUID deep-remapping.
     * Throws errors if validation fails (e.g., collision without remap instructions).
     */
    static async validateAndImportProject(file: File | Blob, options?: { importAsCopy?: boolean, password?: string }): Promise<string> {
        let processFile = file

        if (await CryptoService.isEncrypted(file)) {
            if (!options?.password) {
                throw new Error('ENCRYPTED_ARCHIVE')
            }
            processFile = await CryptoService.decryptBlob(file, options.password)
        }

        const zip = await JSZip.loadAsync(processFile)

        // 1. Validate Core Geometry
        const manifestFile = zip.file('manifest.json')
        const databaseFile = zip.file('database.json')
        if (!manifestFile || !databaseFile) {
            throw new Error('Invalid archive: Missing manifest.json or database.json')
        }

        const manifest = JSON.parse(await manifestFile.async('text'))
        // Refuse version regressions/future states if needed
        if (!manifest.version || manifest.version > 1) {
            throw new Error(`Unsupported schema version: ${manifest.version}`)
        }

        const dbJson = JSON.parse(await databaseFile.async('text'))
        if (!dbJson.project || !dbJson.project.id) {
            throw new Error('Invalid archive: Corrupted project root entity')
        }

        // 2. Asset Integrity Check
        const assetsFolder = zip.folder('assets')
        if (dbJson.assets && dbJson.assets.length > 0) {
            if (!assetsFolder) throw new Error('Invalid archive: Missing assets directory')

            const zipAssetPaths = Object.keys(assetsFolder.files).filter(p => !assetsFolder.files[p].dir)
            const assetCountMatch = zipAssetPaths.length === dbJson.assets.length
            if (!assetCountMatch) {
                // In strict mode, we'd halt. We'll warn or just log for now to be slightly resilient
                console.warn(`Asset map inconsistency. JSON maps ${dbJson.assets.length}, ZIP holds ${zipAssetPaths.length}`)
            }
        }

        // 3. Collision Detection
        const originalProjectId = dbJson.project.id
        const existingBase = await db.projects.get(originalProjectId)

        if (existingBase && !options?.importAsCopy) {
            throw new Error('CollisionDetected')
        }

        // 4. Transform and Remap Entities
        let incomingProjectId = originalProjectId
        let idMap = new Map<string, string>()

        if (options?.importAsCopy) {
            incomingProjectId = crypto.randomUUID()
            idMap.set(originalProjectId, incomingProjectId)
            dbJson.project.id = incomingProjectId
            dbJson.project.name = `${dbJson.project.name} (Copy)`
        }

        // A helper to remap UUIDs inside an array of records
        const processRecords = (records: any[] = [], referenceKeys: string[] = []) => {
            return records.map(record => {
                if (options?.importAsCopy) {
                    const newId = crypto.randomUUID()
                    idMap.set(record.id, newId)
                    record.id = newId

                    // Re-wire parent/project linkages
                    for (const key of referenceKeys) {
                        if (record[key] && idMap.has(record[key])) {
                            record[key] = idMap.get(record[key])
                        } else if (key === 'projectId') {
                            // Failsafe bind to project root
                            record.projectId = incomingProjectId
                        }
                    }
                }
                return record
            })
        }

        // We process synchronously from top-level down to ensure ID lookups are populated for parent relationships
        const series = processRecords(dbJson.series, ['projectId'])
        const books = processRecords(dbJson.books, ['projectId', 'seriesId'])
        const acts = processRecords(dbJson.acts, ['projectId', 'bookId'])
        const chapters = processRecords(dbJson.chapters, ['projectId', 'bookId', 'actId'])
        const scenes = processRecords(dbJson.scenes, ['projectId', 'chapterId'])
        const sceneRevisions = processRecords(dbJson.sceneRevisions, ['projectId', 'sceneId'])

        const bibleEntries = processRecords(dbJson.bibleEntries, ['projectId'])
        const fieldValues = processRecords(dbJson.fieldValues, ['projectId', 'entryId'])
        const relationships = processRecords(dbJson.relationships, ['projectId', 'sourceId', 'targetId'])

        // For assets, we will rebuild the blob structure
        const processedAssetsMeta = processRecords(dbJson.assets, ['projectId'])
        const assetsToInsert: any[] = []

        if (assetsFolder && processedAssetsMeta.length > 0) {
            for (const meta of processedAssetsMeta) {
                // Attempt to locate binary in zip using the original ID (since the zip holds original IDs)
                // Assuming old ID map lookup or fallback to new ID if not renaming
                const originalAssetId = options?.importAsCopy ? [...idMap.entries()].find(([, v]) => v === meta.id)?.[0] || meta.id : meta.id
                const extension = meta.mimeType.split('/')[1] || 'bin'
                const binaryFile = assetsFolder.file(`${originalAssetId}.${extension}`)

                if (binaryFile) {
                    const blobData = await binaryFile.async('blob')
                    assetsToInsert.push({ ...meta, blob: blobData })
                }
            }
        }

        const assetLinks = processRecords(dbJson.assetLinks, ['projectId', 'assetId', 'targetId'])
        const prompts = processRecords(dbJson.prompts, ['projectId'])
        const aiModels = processRecords(dbJson.aiModels, ['projectId'])
        const stagingSessions = processRecords(dbJson.stagingSessions, ['projectId'])
        const aiRequestHistory = processRecords(dbJson.aiRequestHistory, ['projectId', 'sessionId'])
        const occurrences = processRecords(dbJson.occurrences, ['projectId', 'sceneId', 'targetId'])
        const snapshots = processRecords(dbJson.snapshots, ['projectId'])

        // 5. Transactional Commit
        await db.transaction('rw', db.tables, async () => {
            await db.projects.add(dbJson.project)
            if (series.length) await db.series.bulkAdd(series)
            if (books.length) await db.books.bulkAdd(books)
            if (acts.length) await db.acts.bulkAdd(acts)
            if (chapters.length) await db.chapters.bulkAdd(chapters)
            if (scenes.length) await db.scenes.bulkAdd(scenes)
            if (sceneRevisions.length) await db.sceneRevisions.bulkAdd(sceneRevisions)
            if (bibleEntries.length) await db.bibleEntries.bulkAdd(bibleEntries)
            if (fieldValues.length) await db.fieldValues.bulkAdd(fieldValues)
            if (relationships.length) await db.relationships.bulkAdd(relationships)
            if (assetsToInsert.length) await db.assets.bulkAdd(assetsToInsert)
            if (assetLinks.length) await db.assetLinks.bulkAdd(assetLinks)
            if (prompts.length) await db.prompts.bulkAdd(prompts)
            if (aiModels.length) await db.aiModels.bulkAdd(aiModels)
            if (stagingSessions.length) await db.stagingSessions.bulkAdd(stagingSessions)
            if (aiRequestHistory.length) await db.aiRequestHistory.bulkAdd(aiRequestHistory)
            if (occurrences.length) await db.occurrences.bulkAdd(occurrences)
            if (snapshots.length) await db.snapshots.bulkAdd(snapshots)
        })

        return incomingProjectId
    }
}
