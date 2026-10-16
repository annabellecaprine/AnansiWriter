import { db } from '../db/database'
import { extractTextFromJson, extractExplicitLinks } from '../services/textUtils'

self.onmessage = async (e: MessageEvent) => {
    const { action, novelId } = e.data

    if (action === 'INDEX_PROJECT') {
        try {
            const scenes = await db.scenes.where({ novelId }).toArray()
            const entries = await db.bibleEntries.where({ novelId }).toArray()

            // Map entries to searchable terms (name + aliases)
            const searchEntities: { id: string, terms: string[] }[] = []
            for (const entry of entries) {
                const terms = [entry.name, ...(entry.aliases || [])].filter(Boolean)
                if (terms.length > 0) {
                    searchEntities.push({ id: entry.id, terms })
                }
            }

            // Flush old occurrences natively
            const oldOccurrences = await db.occurrences.where('novelId').equals(novelId).primaryKeys()
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
                        novelId,
                        entryId: link.id,
                        sceneId: scene.id,
                        keywordOrAlias: link.name,
                        isConfirmed: true,
                        isDismissed: false,
                        confidence: 1.0,
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
                            occurrencesToInsert.push({
                                id: crypto.randomUUID(),
                                novelId,
                                entryId: entity.id,
                                sceneId: scene.id,
                                keywordOrAlias: term,
                                isConfirmed: false,
                                isDismissed: false,
                                confidence: 0.8,
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
