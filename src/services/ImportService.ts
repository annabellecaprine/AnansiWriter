import JSZip from 'jszip'
import { db } from '../db/database'
import { CryptoService } from './CryptoService'
import { LibraryService } from './LibraryService'

export interface ProjectArchiveMeta {
    isEncrypted: boolean;
    manifest?: {
        version: number;
        exportDate: string;
        novel: { id: string; title: string; author?: string };
        series: { id: string; title: string; description?: string } | null;
    };
    counts?: {
        acts: number;
        chapters: number;
        scenes: number;
        codexEntries: number;
        assets: number;
    };
    collision: boolean;
}

export class ImportService {
    /**
     * Inspects a .storyproject or .zip project archive without committing any data.
     * Useful for displaying previews, collision warnings, and password requests.
     */
    static async peekProjectArchive(file: File | Blob): Promise<ProjectArchiveMeta> {
        const isEncrypted = await CryptoService.isEncrypted(file)
        if (isEncrypted) {
            return { isEncrypted: true, collision: false }
        }

        const zip = await JSZip.loadAsync(file)
        const manifestFile = zip.file('manifest.json')
        const databaseFile = zip.file('database.json')

        if (!manifestFile || !databaseFile) {
            throw new Error('Invalid AnansiWriter archive: Missing manifest.json or database.json')
        }

        const manifest = JSON.parse(await manifestFile.async('text'))
        const dbJson = JSON.parse(await databaseFile.async('text'))

        const existing = await db.novels.get(dbJson.project?.id)

        return {
            isEncrypted: false,
            manifest,
            counts: {
                acts: dbJson.acts?.length || 0,
                chapters: dbJson.chapters?.length || 0,
                scenes: dbJson.scenes?.length || 0,
                codexEntries: dbJson.bibleEntries?.length || 0,
                assets: dbJson.assets?.length || 0
            },
            collision: !!existing
        }
    }

    /**
     * Imports a .storyproject archive transactionally.
     * Ensures structure validity and optionally performs full UUID deep-remapping.
     * Throws errors if validation fails (e.g., collision without remap instructions).
     */
    static async validateAndImportProject(file: File | Blob, options?: { importAsCopy?: boolean, password?: string, overwrite?: boolean }): Promise<string> {
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
        const existingBase = await db.novels.get(originalProjectId)

        if (existingBase) {
            if (options?.overwrite) {
                await LibraryService.deleteNovel(originalProjectId)
            } else if (!options?.importAsCopy) {
                throw new Error('CollisionDetected')
            }
        }

        // 4. Transform and Remap Entities
        let incomingProjectId = originalProjectId
        let idMap = new Map<string, string>()

        if (options?.importAsCopy) {
            incomingProjectId = crypto.randomUUID()
            idMap.set(originalProjectId, incomingProjectId)
            dbJson.project.id = incomingProjectId
            if (dbJson.project.title) {
                dbJson.project.title = `${dbJson.project.title} (Copy)`
            }
        }

        // A helper to remap UUIDs inside an array of records
        const processRecords = (records: any[] = [], referenceKeys: string[] = []) => {
            return records.map(record => {
                if (options?.importAsCopy) {
                    let newId = idMap.get(record.id)
                    if (!newId) {
                        newId = crypto.randomUUID()
                        idMap.set(record.id, newId)
                    }
                    record.id = newId

                    if (record.id === incomingProjectId && record.title) {
                        record.title = `${record.title} (Copy)`
                    }

                    // Re-wire parent/project linkages
                    for (const key of referenceKeys) {
                        if (record[key] && idMap.has(record[key])) {
                            record[key] = idMap.get(record[key])
                        } else if (key === 'novelId' && !record.seriesId) {
                            // Failsafe bind to project root only if not scoped to a series
                            record.novelId = incomingProjectId
                        }
                    }
                }
                return record
            })
        }

        // We process synchronously from top-level down to ensure ID lookups are populated for parent relationships
        const series = processRecords(dbJson.series, [])
        const books = processRecords(dbJson.books, ['novelId', 'seriesId'])
        const acts = processRecords(dbJson.acts, ['novelId', 'seriesId'])
        const chapters = processRecords(dbJson.chapters, ['novelId', 'seriesId', 'actId'])
        const scenes = processRecords(dbJson.scenes, ['novelId', 'chapterId'])
        const sceneRevisions = processRecords(dbJson.sceneRevisions, ['novelId', 'sceneId'])

        const bibleEntries = processRecords(dbJson.bibleEntries, ['novelId', 'seriesId'])
        const fieldValues = processRecords(dbJson.fieldValues, ['novelId', 'entryId', 'seriesId'])
        const relationships = processRecords(dbJson.relationships, ['novelId', 'sourceId', 'targetId', 'seriesId'])

        // For assets, we will rebuild the blob structure
        const processedAssetsMeta = processRecords(dbJson.assets, ['novelId', 'seriesId'])
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

        const assetLinks = processRecords(dbJson.assetLinks, ['novelId', 'seriesId', 'assetId', 'targetId'])
        const prompts = processRecords(dbJson.prompts, ['novelId', 'seriesId'])
        const aiModels = processRecords(dbJson.aiModels, ['novelId', 'seriesId'])
        const stagingSessions = processRecords(dbJson.stagingSessions, ['novelId', 'seriesId'])
        const aiRequestHistory = processRecords(dbJson.aiRequestHistory, ['novelId', 'seriesId', 'sessionId'])
        const occurrences = processRecords(dbJson.occurrences, ['novelId', 'sceneId', 'targetId'])
        const snapshots = processRecords(dbJson.snapshots, ['novelId', 'seriesId'])

        // 5. Transactional Commit
        await db.transaction('rw', db.tables, async () => {
            if (series.length) await db.series.bulkPut(series)
            if (books.length) await db.novels.bulkPut(books)
            if (acts.length) await db.acts.bulkPut(acts)
            if (chapters.length) await db.chapters.bulkPut(chapters)
            if (scenes.length) await db.scenes.bulkPut(scenes)
            if (sceneRevisions.length) await db.sceneRevisions.bulkPut(sceneRevisions)
            if (bibleEntries.length) await db.bibleEntries.bulkPut(bibleEntries)
            if (fieldValues.length) await db.fieldValues.bulkPut(fieldValues)
            if (relationships.length) await db.relationships.bulkPut(relationships)
            if (assetsToInsert.length) await db.assets.bulkPut(assetsToInsert)
            if (assetLinks.length) await db.assetLinks.bulkPut(assetLinks)
            if (prompts.length) await db.prompts.bulkPut(prompts)
            if (aiModels.length) await db.aiModels.bulkPut(aiModels)
            if (stagingSessions.length) await db.stagingSessions.bulkPut(stagingSessions)
            if (aiRequestHistory.length) await db.aiRequestHistory.bulkPut(aiRequestHistory)
            if (occurrences.length) await db.occurrences.bulkPut(occurrences)
            if (snapshots.length) await db.snapshots.bulkPut(snapshots)
        })

        return incomingProjectId
    }
}
