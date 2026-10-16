import JSZip from 'jszip'
import { db } from '../db/database'
import { PromptService } from './PromptService'

export interface ExportFilter {
    books?: string[]; // IDs of books to include (will include child chapters & scenes)
    includeBible?: boolean;
    includeAssets?: boolean;
    includePrompts?: boolean;
}

export class ExportService {
    /**
     * Generates a binary .storyproject ZIP.
     * Optionally filters to selective books, bible, assets, etc.
     */
    static async exportProject(novelId: string, filter?: ExportFilter): Promise<Blob> {
        const novel = await db.novels.get(novelId)
        if (!novel) throw new Error('Novel not found')

        const series = novel.seriesId ? await db.series.get(novel.seriesId) : null

        const zip = new JSZip()

        // 1. Manifest
        const manifest = {
            version: 1, // Standard manifest format version
            exportDate: new Date().toISOString(),
            novel: {
                id: novel.id,
                title: novel.title || 'Untitled Novel',
                author: novel.author,
            },
            series: series ? {
                id: series.id,
                title: series.title,
                description: series.description,
            } : null
        }
        zip.file('manifest.json', JSON.stringify(manifest, null, 2))

        // 2. Base Narrative Hierarchy
        let seriesRecords = series ? [series] : []
        let books = [novel]
        let acts = await db.acts.where({ novelId }).toArray()
        let chapters = await db.chapters.where({ novelId }).toArray()
        let scenes = await db.scenes.where({ novelId }).toArray()
        let sceneRevisions = await db.sceneRevisions.where({ novelId }).toArray()
        let occurrences = await db.occurrences.where({ novelId }).toArray()

        if (filter?.books && filter.books.length > 0) {
            books = books.filter(b => filter.books!.includes(b.id))
            acts = acts.filter(a => filter.books!.includes(a.novelId))
            chapters = chapters.filter(c => acts.some(a => a.id === c.actId))
            scenes = scenes.filter(s => chapters.some(c => c.id === s.chapterId))
            sceneRevisions = sceneRevisions.filter(sr => scenes.some(s => s.id === sr.sceneId))
            occurrences = occurrences.filter(o => scenes.some(s => s.id === o.sceneId))
        } else if (filter?.includeBible === false) {
            occurrences = [] // Dropped by filter
        }

        // 3. Bible Closure Calculation
        // 3. Bible Closure Calculation
        let bibleEntries: any[] = []
        let fieldValues: any[] = []
        let relationships: any[] = []

        if (filter?.includeBible !== false) {
            const nBible = await db.bibleEntries.where({ novelId }).toArray()
            const nFields = await db.fieldValues.where({ novelId }).toArray()
            const nRels = await db.relationships.where({ novelId }).toArray()

            let sBible: any[] = [], sFields: any[] = [], sRels: any[] = []

            if (series) {
                sBible = await db.bibleEntries.where({ seriesId: series.id }).toArray()
                sFields = await db.fieldValues.where({ seriesId: series.id }).toArray()
                sRels = await db.relationships.where({ seriesId: series.id }).toArray()
            }

            bibleEntries = Array.from(new Map([...nBible, ...sBible].map(e => [e.id, e])).values())
            fieldValues = Array.from(new Map([...nFields, ...sFields].map(e => [e.id, e])).values())
            relationships = Array.from(new Map([...nRels, ...sRels].map(e => [e.id, e])).values())
        }

        const requiredEntryIds = new Set(occurrences.map(o => o.entryId))

        if (filter?.books && filter.books.length > 0 && filter?.includeBible !== false) {
            // Only export entities genuinely referenced within this subset of books
            bibleEntries = bibleEntries.filter(b => requiredEntryIds.has(b.id))

            // Expand required entries to include anything explicitly related structurally to existing entries
            const level1Rels = relationships.filter(r => requiredEntryIds.has(r.sourceId) || requiredEntryIds.has(r.targetId))
            level1Rels.forEach(r => { requiredEntryIds.add(r.sourceId); requiredEntryIds.add(r.targetId) })

            // Re-filter with the expanded closure map on the deduplicated arrays
            bibleEntries = bibleEntries.filter(b => requiredEntryIds.has(b.id))
            fieldValues = fieldValues.filter(f => requiredEntryIds.has(f.entryId))
            relationships = relationships.filter(r => requiredEntryIds.has(r.sourceId) && requiredEntryIds.has(r.targetId))
        }

        // 4. Auxiliary Assets and Meta
        let assetLinks = (filter?.includeAssets !== false) ? await db.assetLinks.where({ novelId }).toArray() : []
        let assetsData = (filter?.includeAssets !== false) ? await db.assets.where({ novelId }).toArray() : []
        let prompts = (filter?.includePrompts !== false) ? await db.prompts.where('novelId').equals(novelId).toArray() : []
        let stagingSessions = (filter?.includePrompts !== false) ? await db.stagingSessions.where({ novelId }).toArray() : []

        const aiModels = await db.aiModels.where({ novelId }).toArray()
        const aiRequestHistory = await db.aiRequestHistory.where({ novelId }).toArray()
        const snapshots = await db.snapshots.where({ novelId }).toArray()

        if (filter?.books && filter.books.length > 0) {
            assetLinks = assetLinks.filter(al => requiredEntryIds.has(al.targetId) || scenes.some(s => s.id === al.targetId))
            const activeAssetIds = new Set(assetLinks.map(al => al.assetId))
            assetsData = assetsData.filter(a => activeAssetIds.has(a.id))
        }

        // 5. Process Assets into binary wrapper bounds
        const assetsFolder = zip.folder('assets')
        const assetsMeta = []

        for (const asset of assetsData) {
            const extension = asset.mimeType.split('/')[1] || 'bin'
            assetsFolder!.file(`${asset.id}.${extension}`, asset.blob)
            const { blob: _, ...metaOnly } = asset
            assetsMeta.push(metaOnly)
        }

        // 6. Construct the unified database tree
        const databaseJson = {
            project: novel,
            series: seriesRecords,
            books, acts, chapters, scenes, sceneRevisions,
            bibleEntries, fieldValues, relationships,
            assets: assetsMeta, assetLinks,
            prompts, aiModels, stagingSessions, aiRequestHistory,
            occurrences, snapshots
        }

        zip.file('database.json', JSON.stringify(databaseJson))

        // 7. Build Final Binary
        const blob = await zip.generateAsync({ type: 'blob' })

        return blob
    }
}
