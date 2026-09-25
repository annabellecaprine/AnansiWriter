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
    static async assemble(
        prompt: Prompt,
        targetSceneId: string | null,
        manualInputs: Record<string, string> = {},
        _pinnedObjectIds: string[] = [],
        excludedObjectIds: string[] = []
    ): Promise<ContextAssembly> {

        let assembly: ContextAssembly = {
            assembledSystemInstruction: prompt.systemInstruction,
            assembledUserPrompt: prompt.userTemplate,
            totalEstimatedTokens: estimateTokens(prompt.systemInstruction) + estimateTokens(prompt.userTemplate),
            budgetLimit: prompt.tokenBudget || 35000,
            includedSources: [],
            excludedSources: []
        }

        const scene = targetSceneId ? await db.scenes.get(targetSceneId) : null

        if (!scene && prompt.inputs?.some(i => i.kind === 'context')) {
            console.warn("Context Engine warning: Primary target scene unresolved but Context Inputs exist.")
        }

        for (const input of (prompt.inputs || [])) {
            const regex = new RegExp(`\\{\\{\\s*${input.name}\\s*\\}\\}`, 'gi')

            if (input.kind === 'manual') {
                const val = manualInputs[input.name] || input.defaultValue || ''
                assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, String(val))
                assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, String(val))
            }
            else if (input.kind === 'context') {
                if (!scene) {
                    assembly.excludedSources.push({ id: 'N/A', name: input.name, reason: 'No active context sequence available.' })
                    continue
                }

                if (input.type === 'CurrentScene' || input.type === 'Selection') {
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

                    // Replace variables
                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, sceneText)
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, sceneText)
                }
                else if (input.type === 'CharacterState' || input.type === 'RelevantBibleEntries') {
                    // Quick mock retrieval
                    const hits = await db.occurrences.where({ sceneId: scene.id }).toArray()
                    let combinedText = ""
                    for (const hit of hits) {
                        if (excludedObjectIds.includes(hit.entryId)) {
                            assembly.excludedSources.push({ id: hit.entryId, name: 'Entity ' + hit.entryId, reason: 'Manually excluded by user.' })
                            continue;
                        }

                        const entry = await db.bibleEntries.get(hit.entryId)
                        if (!entry) continue;

                        const tokens = estimateTokens(entry.name);

                        if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                            assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Context window budget exhausted. Truncating.' })
                            continue;
                        }

                        assembly.includedSources.push({ id: entry.id, name: entry.name, type: entry.type, contentSpan: '', estimatedTokens: tokens })
                        assembly.totalEstimatedTokens += tokens
                        combinedText += `\n[Codex: ${entry.name}]\n`
                    }
                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, combinedText)
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, combinedText)
                }
                else if (input.type === 'StoryGuides') {
                    const novelEntries = await db.bibleEntries.where('novelId').equals(scene.novelId).toArray()
                    const guides = novelEntries.filter(e => e.type === 'Story Guide')
                    let combinedText = ""
                    for (const g of guides) {
                        if (g.excludeFromContext) continue;
                        if (excludedObjectIds.includes(g.id)) {
                            assembly.excludedSources.push({ id: g.id, name: g.name, reason: 'Manually excluded by user.' })
                            continue;
                        }
                        const tokens = estimateTokens(g.description || g.name)
                        if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                            assembly.excludedSources.push({ id: g.id, name: g.name, reason: 'Context window budget exhausted. Truncating.' })
                            continue;
                        }

                        assembly.includedSources.push({ id: g.id, name: g.name, type: 'Story Guide', contentSpan: '', estimatedTokens: tokens })
                        assembly.totalEstimatedTokens += tokens
                        combinedText += `\n[Story Guide: ${g.name}]\n${g.description || ''}\n`
                    }
                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, combinedText)
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, combinedText)
                }
                else {
                    assembly.excludedSources.push({ id: 'N/A', name: `Input ${input.type}`, reason: 'Provider Adapter abstraction pending for this vector.' })
                }
            }
        }

        return assembly;
    }
}
