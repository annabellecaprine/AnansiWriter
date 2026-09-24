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
    static async exportProject(projectId: string, filter?: ExportFilter): Promise<Blob> {
        const project = await db.projects.get(projectId)
        if (!project) throw new Error('Project not found')

        const zip = new JSZip()

        // 1. Manifest
        const manifest = {
            version: project.version,
            name: project.name,
            exportedAt: Date.now()
        }
        zip.file('manifest.json', JSON.stringify(manifest, null, 2))

        // 2. Base Narrative Hierarchy
        let series = await db.series.where({ projectId }).toArray()
        let books = await db.books.where({ projectId }).toArray()
        let acts = await db.acts.where({ projectId }).toArray()
        let chapters = await db.chapters.where({ projectId }).toArray()
        let scenes = await db.scenes.where({ projectId }).toArray()
        let sceneRevisions = await db.sceneRevisions.where({ projectId }).toArray()
        let occurrences = await db.occurrences.where({ projectId }).toArray()

        if (filter?.books && filter.books.length > 0) {
            books = books.filter(b => filter.books!.includes(b.id))
            acts = acts.filter(a => filter.books!.includes(a.bookId))
            chapters = chapters.filter(c => filter.books!.includes(c.bookId))
            scenes = scenes.filter(s => filter.books!.includes(s.bookId))
            series = series.filter(s => books.some(b => b.seriesId === s.id))
            sceneRevisions = sceneRevisions.filter(sr => scenes.some(s => s.id === sr.sceneId))
            occurrences = occurrences.filter(o => scenes.some(s => s.id === o.sceneId))
        } else if (filter?.includeBible === false) {
            occurrences = [] // Dropped by filter
        }

        // 3. Bible Closure Calculation
        const requiredEntryIds = new Set(occurrences.map(o => o.entryId))

        let bibleEntries = (filter?.includeBible !== false) ? await db.bibleEntries.where({ projectId }).toArray() : []
        let fieldValues = (filter?.includeBible !== false) ? await db.fieldValues.where({ projectId }).toArray() : []
        let relationships = (filter?.includeBible !== false) ? await db.relationships.where({ projectId }).toArray() : []

        if (filter?.books && filter.books.length > 0 && filter?.includeBible !== false) {
            // Only export entities genuinely referenced within this subset of books
            bibleEntries = bibleEntries.filter(b => requiredEntryIds.has(b.id))

            // Expand required entries to include anything explicitly related structurally to existing entries
            // (e.g. if character A relies on faction B, bring B too) - Level 1 closure
            const level1Rels = relationships.filter(r => requiredEntryIds.has(r.sourceId) || requiredEntryIds.has(r.targetId))
            level1Rels.forEach(r => { requiredEntryIds.add(r.sourceId); requiredEntryIds.add(r.targetId) })

            // Re-filter with the expanded closure map
            bibleEntries = (await db.bibleEntries.where({ projectId }).toArray()).filter(b => requiredEntryIds.has(b.id))
            fieldValues = fieldValues.filter(f => requiredEntryIds.has(f.entryId))
            relationships = relationships.filter(r => requiredEntryIds.has(r.sourceId) && requiredEntryIds.has(r.targetId)) // Must bound completely inside extracted network
        }

        // 4. Auxiliary Assets and Meta
        let assetLinks = (filter?.includeAssets !== false) ? await db.assetLinks.where({ projectId }).toArray() : []
        let assetsData = (filter?.includeAssets !== false) ? await db.assets.where({ projectId }).toArray() : []
        let prompts = (filter?.includePrompts !== false) ? await PromptService.getPrompts(projectId) : []
        let stagingSessions = (filter?.includePrompts !== false) ? await db.stagingSessions.where({ projectId }).toArray() : []

        const aiModels = await db.aiModels.where({ projectId }).toArray()
        const aiRequestHistory = await db.aiRequestHistory.where({ projectId }).toArray()
        const snapshots = await db.snapshots.where({ projectId }).toArray()

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

        // 4. Construct the unified database tree
        const databaseJson = {
            project, series, books, acts, chapters, scenes, sceneRevisions,
            bibleEntries, fieldValues, relationships,
            assets: assetsMeta, assetLinks,
            prompts, aiModels, stagingSessions, aiRequestHistory,
            occurrences, snapshots
        }

        zip.file('database.json', JSON.stringify(databaseJson))

        // 5. Build Final Binary
        const blob = await zip.generateAsync({ type: 'blob' })

        // Update Project export timestamp
        await db.projects.update(projectId, { lastExportedAt: Date.now() })

        return blob
    }
}
