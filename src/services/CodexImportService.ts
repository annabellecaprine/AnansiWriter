import JSZip from 'jszip'
import { db } from '../db/database'
import type { BibleEntry, FieldValue, Relationship } from '../db/schema'
import { CodexConfigService, type CodexCategoryDefinition, type RelationshipTypeDefinition, normalizeCategoryName } from './CodexConfigService'
import { BibleService } from './BibleService'

export interface ParsedCodexEntry {
    id: string;
    name: string;
    type: string;
    aliases: string[];
    tags: string[];
    keywords: string[];
    alwaysIncludeInContext?: boolean;
    excludeFromContext?: boolean;
    doNotTrack?: boolean;
    description: string;
    researchNotes?: string;
    fields: Array<{ fieldKey: string; value: string }>;
    relationships: Array<{ type: string; targetName: string; notes?: string }>;
}

export interface CodexImportPackage {
    entries: ParsedCodexEntry[];
    categories?: CodexCategoryDefinition[];
    relationshipTypes?: RelationshipTypeDefinition[];
    warnings: string[];
    entryCountsByType: Record<string, number>;
}

export interface CodexImportOptions {
    targetNovelId: string;
    scope?: 'project' | 'series';
    overwriteExisting?: boolean;
}

export interface CodexImportResult {
    importedCount: number;
    updatedCount: number;
    categoriesImported: number;
    relationshipTypesImported: number;
    relationshipsCreated: number;
}

export class CodexImportService {
    /**
     * Inspects a zip file to determine if it represents an AnansiWriter Codex Export.
     */
    static async isCodexArchive(file: File | Blob): Promise<boolean> {
        try {
            const zip = await JSZip.loadAsync(file)

            // Direct signature files
            if (zip.file('codex-definitions.json') || zip.file('codex-index.md')) {
                return true
            }

            // Check for entry markdown files
            const files = Object.keys(zip.files)
            const hasEntryMd = files.some(name => (name === 'entry.md' || name.endsWith('/entry.md')) && !zip.files[name].dir)
            if (hasEntryMd) return true

            return false
        } catch {
            return false
        }
    }

    /**
     * Parses all entries, fields, relationships, and schema definitions from a codex export zip.
     */
    static async parseCodexArchive(file: File | Blob): Promise<CodexImportPackage> {
        const zip = await JSZip.loadAsync(file)

        const pkg: CodexImportPackage = {
            entries: [],
            warnings: [],
            entryCountsByType: {}
        }

        // 1. Parse codex-definitions.json if present
        const defsFile = zip.file('codex-definitions.json')
        if (defsFile) {
            try {
                const defsRaw = await defsFile.async('string')
                const defsJson = JSON.parse(defsRaw)
                if (Array.isArray(defsJson.categories)) {
                    pkg.categories = defsJson.categories
                }
                if (Array.isArray(defsJson.relationshipTypes)) {
                    pkg.relationshipTypes = defsJson.relationshipTypes
                }
            } catch (err: any) {
                pkg.warnings.push(`Failed to parse codex-definitions.json: ${err.message}`)
            }
        }

        // 2. Identify all candidate markdown files
        // BibleExporter uses: `<slug>/entry.md`
        const entryFiles: { path: string; file: JSZip.JSZipObject }[] = []
        zip.forEach((relativePath, fileObj) => {
            if (fileObj.dir) return
            const lower = relativePath.toLowerCase()
            if (lower === 'codex-index.md' || lower === 'novel.md') return

            if (lower === 'entry.md' || lower.endsWith('/entry.md') || lower.endsWith('.md')) {
                entryFiles.push({ path: relativePath, file: fileObj })
            }
        })

        if (entryFiles.length === 0) {
            pkg.warnings.push('No entry markdown files found in archive.')
            return pkg
        }

        // 3. Parse each entry file
        for (const { path, file } of entryFiles) {
            try {
                const text = await file.async('string')
                const parsed = this.parseEntryMarkdown(text, path)
                if (parsed) {
                    pkg.entries.push(parsed)
                    const normType = parsed.type || 'Lore'
                    pkg.entryCountsByType[normType] = (pkg.entryCountsByType[normType] || 0) + 1
                }
            } catch (err: any) {
                pkg.warnings.push(`Error parsing ${path}: ${err.message}`)
            }
        }

        return pkg
    }

    /**
     * Parses a single entry markdown file containing YAML frontmatter and section headings.
     */
    static parseEntryMarkdown(text: string, filePath: string): ParsedCodexEntry | null {
        const { fm, body } = this.parseFrontmatter(text)

        // If no frontmatter and not named entry.md, skip
        if (!fm.name && !fm.type && !filePath.toLowerCase().endsWith('entry.md')) {
            return null
        }

        // Fallback name from path
        let name = fm.name
        if (!name) {
            const parts = filePath.split('/')
            const dir = parts.length > 1 ? parts[parts.length - 2] : parts[0]
            name = dir.replace(/-[a-f0-9]{8}$/i, '').replace(/[-_]/g, ' ') || 'Untitled Entry'
        }

        const type = fm.type || 'Lore'
        const id = fm.id || crypto.randomUUID()
        const aliases = Array.isArray(fm.aliases) ? fm.aliases : []
        const tags = Array.isArray(fm.tags) ? fm.tags : []
        const keywords = Array.isArray(fm.keywords) ? fm.keywords : []

        const { description, researchNotes, fields, relationships } = this.parseSections(body)

        return {
            id,
            name,
            type,
            aliases,
            tags,
            keywords,
            alwaysIncludeInContext: fm.alwaysIncludeInContext === true,
            excludeFromContext: fm.excludeFromContext === true,
            doNotTrack: fm.doNotTrack === true,
            description,
            researchNotes,
            fields,
            relationships
        }
    }

    /**
     * Parses YAML frontmatter delimiter (---)
     */
    static parseFrontmatter(text: string): { fm: Record<string, any>; body: string } {
        const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
        if (!match) return { fm: {}, body: text }

        const rawFm = match[1]
        const body = match[2]
        const fm: Record<string, any> = {}

        const lines = rawFm.split(/\r?\n/)
        let currentKey: string | null = null
        let currentArray: string[] | null = null

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue

            // Array item
            if (trimmed.startsWith('- ') && currentKey && currentArray) {
                let itemVal = trimmed.slice(2).trim()
                if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
                    itemVal = itemVal.slice(1, -1)
                }
                currentArray.push(itemVal)
                continue
            }

            // Key-value pair
            const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
            if (kvMatch) {
                currentKey = kvMatch[1]
                let val = kvMatch[2].trim()

                if (val === '') {
                    currentArray = []
                    fm[currentKey] = currentArray
                } else if (val === 'true') {
                    fm[currentKey] = true
                    currentArray = null
                } else if (val === 'false') {
                    fm[currentKey] = false
                    currentArray = null
                } else {
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1)
                    }
                    fm[currentKey] = val
                    currentArray = null
                }
            }
        }

        return { fm, body }
    }

    /**
     * Parses markdown sections: ## Description, ## Research Notes, ## Attributes, ## Relationships
     */
    static parseSections(body: string): {
        description: string;
        researchNotes: string;
        fields: Array<{ fieldKey: string; value: string }>;
        relationships: Array<{ type: string; targetName: string; notes?: string }>;
    } {
        let description = ''
        let researchNotes = ''
        const fields: Array<{ fieldKey: string; value: string }> = []
        const relationships: Array<{ type: string; targetName: string; notes?: string }> = []

        const sections = body.split(/^##\s+/m)

        for (const section of sections) {
            const trimmed = section.trim()
            if (!trimmed) continue

            const firstLineEnd = trimmed.indexOf('\n')
            const heading = (firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd)).trim().toLowerCase()
            const content = (firstLineEnd === -1 ? '' : trimmed.slice(firstLineEnd)).trim()

            if (heading === 'description') {
                description = content
            } else if (heading === 'research notes' || heading === 'notes') {
                researchNotes = content
            } else if (heading === 'attributes' || heading === 'fields') {
                // Parse attributes
                const lines = content.split(/\r?\n/)
                let currentFieldKey: string | null = null
                let currentFieldLines: string[] = []

                const flushField = () => {
                    if (currentFieldKey) {
                        fields.push({
                            fieldKey: currentFieldKey,
                            value: currentFieldLines.join('\n').trim()
                        })
                    }
                    currentFieldKey = null
                    currentFieldLines = []
                }

                for (const line of lines) {
                    const attrMatch = line.match(/^- \*\*([^*]+)\*\*:(.*)$/)
                    if (attrMatch) {
                        flushField()
                        currentFieldKey = attrMatch[1].trim()
                        const directVal = attrMatch[2].trim()
                        if (directVal) {
                            currentFieldLines.push(directVal)
                        }
                    } else if (currentFieldKey && (line.startsWith('    ') || line.startsWith('\t') || line.trim() === '')) {
                        currentFieldLines.push(line.replace(/^( {4}|\t)/, ''))
                    } else {
                        flushField()
                    }
                }
                flushField()
            } else if (heading === 'relationships') {
                // Parse relationships: - **Type**: [[TargetName]] — Notes
                const lines = content.split(/\r?\n/)
                for (const line of lines) {
                    const relMatch = line.match(/^- \*\*([^*]+)\*\*:\s*\[\[([^\]]+)\]\](?:\s*—\s*(.*))?$/)
                    if (relMatch) {
                        relationships.push({
                            type: relMatch[1].trim(),
                            targetName: relMatch[2].trim(),
                            notes: relMatch[3]?.trim() || undefined
                        })
                    }
                }
            }
        }

        return { description, researchNotes, fields, relationships }
    }

    /**
     * Imports the parsed codex package into a target novel and/or series.
     */
    static async importCodexPackage(pkg: CodexImportPackage, options: CodexImportOptions): Promise<CodexImportResult> {
        const { targetNovelId, scope = 'project', overwriteExisting = false } = options
        const now = Date.now()

        const novel = await db.novels.get(targetNovelId)
        if (!novel) throw new Error(`Target novel not found: ${targetNovelId}`)

        const seriesId = novel.seriesId

        let categoriesImported = 0
        let relationshipTypesImported = 0
        let importedCount = 0
        let updatedCount = 0
        let relationshipsCreated = 0

        // 1. Merge Schema Definitions (Categories & Relationship Types)
        if (pkg.categories && pkg.categories.length > 0) {
            const existingCategories = await CodexConfigService.getCategories()
            const existingNames = new Set(existingCategories.map(c => c.name.toLowerCase()))

            const newCats: CodexCategoryDefinition[] = []
            for (const cat of pkg.categories) {
                if (!existingNames.has(cat.name.toLowerCase())) {
                    newCats.push({
                        ...cat,
                        id: cat.id || `cat-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        isBuiltIn: false
                    })
                    existingNames.add(cat.name.toLowerCase())
                    categoriesImported++
                }
            }

            if (newCats.length > 0) {
                await CodexConfigService.saveCategories([...existingCategories, ...newCats])
            }
        }

        if (pkg.relationshipTypes && pkg.relationshipTypes.length > 0) {
            const existingTypes = await CodexConfigService.getRelationshipTypes()
            const existingNames = new Set(existingTypes.map(t => t.name.toLowerCase()))

            const newTypes: RelationshipTypeDefinition[] = []
            for (const relType of pkg.relationshipTypes) {
                if (!existingNames.has(relType.name.toLowerCase())) {
                    newTypes.push({
                        ...relType,
                        id: relType.id || `rel-${relType.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        isBuiltIn: false
                    })
                    existingNames.add(relType.name.toLowerCase())
                    relationshipTypesImported++
                }
            }

            if (newTypes.length > 0) {
                await CodexConfigService.saveRelationshipTypes([...existingTypes, ...newTypes])
            }
        }

        // 2. Fetch existing entries to detect collisions & map names for relationships
        const existingEntries = await BibleService.listActiveEntries(targetNovelId)
        const nameToEntryMap = new Map<string, BibleEntry>()
        const idToEntryMap = new Map<string, BibleEntry>()

        existingEntries.forEach(e => {
            nameToEntryMap.set(e.name.toLowerCase(), e)
            idToEntryMap.set(e.id, e)
        })

        // Map for resolving relationships: entityName -> finalEntryId
        const nameToIdMap = new Map<string, string>()
        existingEntries.forEach(e => nameToIdMap.set(e.name.toLowerCase(), e.id))

        // 3. Process each entry
        for (const entry of pkg.entries) {
            const existingByName = nameToEntryMap.get(entry.name.toLowerCase())
            const existingById = idToEntryMap.get(entry.id)
            const matchedExisting = existingByName || existingById

            let finalEntryId = entry.id

            if (matchedExisting && overwriteExisting) {
                // Overwrite existing entry
                finalEntryId = matchedExisting.id
                await db.bibleEntries.update(finalEntryId, {
                    name: entry.name,
                    type: entry.type,
                    tags: Array.from(new Set([...(matchedExisting.tags || []), ...(entry.tags || [])])),
                    aliases: Array.from(new Set([...(matchedExisting.aliases || []), ...(entry.aliases || [])])),
                    keywords: Array.from(new Set([...(matchedExisting.keywords || []), ...(entry.keywords || [])])),
                    description: entry.description || matchedExisting.description || '',
                    researchNotes: entry.researchNotes || matchedExisting.researchNotes || '',
                    alwaysIncludeInContext: entry.alwaysIncludeInContext ?? matchedExisting.alwaysIncludeInContext,
                    excludeFromContext: entry.excludeFromContext ?? matchedExisting.excludeFromContext,
                    doNotTrack: entry.doNotTrack ?? matchedExisting.doNotTrack,
                    updatedAt: now
                })

                // Replace / merge field values
                for (const field of entry.fields) {
                    const existingField = await db.fieldValues
                        .where('entryId').equals(finalEntryId)
                        .filter(f => f.fieldKey.toLowerCase() === field.fieldKey.toLowerCase())
                        .first()

                    if (existingField) {
                        await db.fieldValues.update(existingField.id, {
                            value: field.value,
                            updatedAt: now
                        })
                    } else {
                        await db.fieldValues.add({
                            id: crypto.randomUUID(),
                            novelId: scope === 'series' ? undefined : targetNovelId,
                            seriesId: scope === 'series' ? seriesId : undefined,
                            entryId: finalEntryId,
                            fieldKey: field.fieldKey,
                            value: field.value,
                            state: 'Canon',
                            validFrom: null,
                            validUntil: null,
                            provenance: [],
                            createdAt: now,
                            updatedAt: now
                        })
                    }
                }

                updatedCount++
            } else {
                // Insert as new entry
                // If ID is already taken anywhere in the database, generate a fresh UUID
                const existsInDb = await db.bibleEntries.get(finalEntryId)
                if (existsInDb) {
                    finalEntryId = crypto.randomUUID()
                }

                const newEntry: BibleEntry = {
                    id: finalEntryId,
                    novelId: scope === 'series' ? undefined : targetNovelId,
                    seriesId: scope === 'series' ? seriesId : undefined,
                    name: entry.name,
                    type: entry.type,
                    tags: entry.tags || [],
                    aliases: entry.aliases || [],
                    keywords: entry.keywords || [],
                    description: entry.description || '',
                    researchNotes: entry.researchNotes || '',
                    alwaysIncludeInContext: !!entry.alwaysIncludeInContext,
                    excludeFromContext: !!entry.excludeFromContext,
                    doNotTrack: !!entry.doNotTrack,
                    createdAt: now,
                    updatedAt: now
                }

                await db.bibleEntries.add(newEntry)

                // Add fields
                for (const field of entry.fields) {
                    await db.fieldValues.add({
                        id: crypto.randomUUID(),
                        novelId: scope === 'series' ? undefined : targetNovelId,
                        seriesId: scope === 'series' ? seriesId : undefined,
                        entryId: finalEntryId,
                        fieldKey: field.fieldKey,
                        value: field.value,
                        state: 'Canon',
                        validFrom: null,
                        validUntil: null,
                        provenance: [],
                        createdAt: now,
                        updatedAt: now
                    })
                }

                importedCount++
            }

            nameToIdMap.set(entry.name.toLowerCase(), finalEntryId)
        }

        // 4. Wire Relationships
        for (const entry of pkg.entries) {
            const sourceId = nameToIdMap.get(entry.name.toLowerCase())
            if (!sourceId) continue

            for (const rel of entry.relationships) {
                const targetId = nameToIdMap.get(rel.targetName.toLowerCase())
                if (!targetId || sourceId === targetId) continue

                // Check for duplicate relationship
                const existingRel = await db.relationships
                    .where({ sourceId })
                    .filter(r => r.targetId === targetId && r.type.toLowerCase() === rel.type.toLowerCase())
                    .first()

                if (!existingRel) {
                    await db.relationships.add({
                        id: crypto.randomUUID(),
                        novelId: scope === 'series' ? undefined : targetNovelId,
                        seriesId: scope === 'series' ? seriesId : undefined,
                        sourceId,
                        targetId,
                        type: rel.type,
                        isBidirectional: false,
                        notes: rel.notes || '',
                        state: 'Canon',
                        validFrom: null,
                        validUntil: null,
                        provenance: [],
                        createdAt: now,
                        updatedAt: now
                    })
                    relationshipsCreated++
                }
            }
        }

        return {
            importedCount,
            updatedCount,
            categoriesImported,
            relationshipTypesImported,
            relationshipsCreated
        }
    }
}
