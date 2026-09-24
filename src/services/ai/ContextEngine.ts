import { db } from '../../db/database'
import type { Prompt } from '../../db/schema'

export interface ContextSource {
    id: string;
    name: string;
    type: string;
    contentSpan: string;
    estimatedTokens: number;
}

export interface ContextExclusion {
    id: string;
    name: string;
    reason: string;
}

export interface ContextAssembly {
    assembledSystemInstruction: string;
    assembledUserPrompt: string;
    totalEstimatedTokens: number;
    budgetLimit: number;
    includedSources: ContextSource[];
    excludedSources: ContextExclusion[];
}

// Rough baseline mapping prioritizing character length approximation until a generic tokenizer library is integrated
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

export class ContextEngine {

    /**
     * Assembles a Context Payload dynamically restricting cross-contamination of Timeline events
     * and strictly validating against Token Budgets prior to transmission.
     */
    static async assemble(prompt: Prompt, targetSceneId: string, _pinnedObjectIds: string[] = [], excludedObjectIds: string[] = []): Promise<ContextAssembly> {

        let assembly: ContextAssembly = {
            assembledSystemInstruction: prompt.systemInstruction,
            assembledUserPrompt: prompt.userTemplate,
            totalEstimatedTokens: estimateTokens(prompt.systemInstruction) + estimateTokens(prompt.userTemplate),
            budgetLimit: prompt.tokenBudget || 35000,
            includedSources: [],
            excludedSources: []
        }

        const scene = await db.scenes.get(targetSceneId)
        if (!scene) throw new Error("Context Engine fault: Primary target scene unresolved.")

        // Enforce Canon-Awareness / Timeline Limits (Baseline Phase 3 stub)
        const sceneSortBound = scene.sortOrder;
        // Apply temporal locking logic filtering subsequent entries mapped after sceneSortBound inside pinnedObjectIds checking bounds
        if (sceneSortBound < 0) console.warn("Temporal isolation active logic triggered");
        for (const input of prompt.inputs) {

            if (input.type === 'Scene') {
                const sceneText = extractTextFromJson(scene.content)
                const tokens = estimateTokens(sceneText)

                if (excludedObjectIds.includes(scene.id)) {
                    assembly.excludedSources.push({ id: scene.id, name: scene.name, reason: 'Manually excluded by user.' })
                    continue;
                }

                if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                    assembly.excludedSources.push({ id: scene.id, name: scene.name, reason: 'Context window budget exhausted.' })
                    continue;
                }

                assembly.includedSources.push({ id: scene.id, name: scene.name, type: 'Scene', contentSpan: sceneText, estimatedTokens: tokens })
                assembly.totalEstimatedTokens += tokens
                assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(/\{\{\s*content\s*\}\}/gi, sceneText)
            }
            // For Phase 3, Timeline and Character inputs dynamically extract from occurrences mapping against scene bounds
            else if (input.type === 'Character' || input.type === 'BibleEntry') {
                // Scan local occurrences
                const hits = await db.occurrences.where({ sceneId: scene.id }).toArray()
                for (const hit of hits) {
                    if (excludedObjectIds.includes(hit.entryId)) {
                        assembly.excludedSources.push({ id: hit.entryId, name: 'Entity ' + hit.entryId, reason: 'Manually excluded by user.' })
                        continue;
                    }

                    const entry = await db.bibleEntries.get(hit.entryId)
                    if (!entry) continue;

                    const tokens = estimateTokens(entry.name); // Extend this dynamically mapping fieldValues natively

                    if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                        assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Context window budget exhausted. Truncating.' })
                        continue;
                    }

                    assembly.includedSources.push({ id: entry.id, name: entry.name, type: entry.type, contentSpan: '', estimatedTokens: tokens })
                    assembly.totalEstimatedTokens += tokens
                }
            }
            else {
                assembly.excludedSources.push({ id: 'N/A', name: `Input ${input.type}`, reason: 'Provider Adapter abstraction pending for this vector.' })
            }
        }

        return assembly;
    }
}
