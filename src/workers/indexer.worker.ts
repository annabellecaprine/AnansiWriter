import { db } from '../db/database'

function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
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

            const occurrencesToInsert = []

            for (const scene of scenes) {
                if (!scene.content) continue

                // Deep extraction of ProseMirror JSON model bounds
                const rawText = extractTextFromJson(scene.content)

                for (const entity of searchEntities) {
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
                                confidence: 1.0,
                                createdAt: Date.now()
                            })
                        }
                    }
                }
            }

            if (occurrencesToInsert.length > 0) {
                await db.occurrences.bulkAdd(occurrencesToInsert)
            }

            self.postMessage({ status: 'DONE', count: occurrencesToInsert.length })
        } catch (error: any) {
            self.postMessage({ status: 'ERROR', error: error.message })
        }
    }
}
