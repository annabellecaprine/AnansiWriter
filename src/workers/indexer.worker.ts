import { db } from '../db/database'

function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

function extractExplicitLinks(node: any, result: { id: string, name: string }[]) {
    if (!node) return
    if (node.type === 'internalLink' && node.attrs?.id) {
        result.push({ id: node.attrs.id, name: node.attrs.name || 'Explicit Link' })
    }
    if (Array.isArray(node)) {
        node.forEach(n => extractExplicitLinks(n, result))
    }
    if (node.content) {
        extractExplicitLinks(node.content, result)
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { action, projectId } = e.data

    if (action === 'INDEX_PROJECT') {
        try {
            const scenes = await db.scenes.where({ projectId }).toArray()
            const entries = await db.bibleEntries.where({ projectId }).toArray()

            // Map entries to searchable terms (name + aliases)
            const searchEntities: { id: string, terms: string[] }[] = []
            for (const entry of entries) {
                const terms = [entry.name, ...(entry.aliases || [])].filter(Boolean)
                if (terms.length > 0) {
                    searchEntities.push({ id: entry.id, terms })
                }
            }

            // Flush old occurrences natively
            const oldOccurrences = await db.occurrences.where({ projectId }).primaryKeys()
            if (oldOccurrences.length > 0) {
                await db.occurrences.bulkDelete(oldOccurrences as string[])
            }

            const occurrencesToInsert: any[] = []
            let explicitCount = 0
            let heuristicCount = 0

            for (const scene of scenes) {
                if (!scene.content) continue

                // 1. Extract explicit internal links
                const explicitLinks: { id: string, name: string }[] = []
                extractExplicitLinks(scene.content, explicitLinks)

                const seenExplicitIds = new Set<string>()

                for (const link of explicitLinks) {
                    occurrencesToInsert.push({
                        id: crypto.randomUUID(),
                        projectId,
                        entryId: link.id,
                        sceneId: scene.id,
                        textPreview: `Explicit Reference: ${link.name}`,
                        keywordOrAlias: link.name,
                        isConfirmed: true,
                        isDismissed: false,
                        confidence: 1.0,
                        createdAt: Date.now()
                    })
                    explicitCount++
                    seenExplicitIds.add(link.id)
                }

                // 2. Extract heuristic matches
                const rawText = extractTextFromJson(scene.content)
                for (const entity of searchEntities) {
                    // Skip heuristics if this entity already explicitly addressed in this scene
                    if (seenExplicitIds.has(entity.id)) continue

                    for (const term of entity.terms) {
                        if (term.length < 3) continue // prevent trivial bindings

                        const regex = new RegExp(`\\b${term}\\b`, 'gi')
                        let match

                        while ((match = regex.exec(rawText)) !== null) {
                            const snippetStart = Math.max(0, match.index - 40)
                            const snippetEnd = Math.min(rawText.length, match.index + term.length + 40)

                            occurrencesToInsert.push({
                                id: crypto.randomUUID(),
                                projectId,
                                entryId: entity.id,
                                sceneId: scene.id,
                                textPreview: rawText.substring(snippetStart, snippetEnd).trim(),
                                keywordOrAlias: term,
                                isConfirmed: false,
                                isDismissed: false,
                                confidence: 0.8,
                                createdAt: Date.now()
                            })
                            heuristicCount++
                        }
                    }
                }
            }

            if (occurrencesToInsert.length > 0) {
                await db.occurrences.bulkAdd(occurrencesToInsert)
            }

            self.postMessage({ status: 'DONE', count: occurrencesToInsert.length, explicitCount, heuristicCount })
        } catch (error: any) {
            self.postMessage({ status: 'ERROR', error: error.message })
        }
    }
}
