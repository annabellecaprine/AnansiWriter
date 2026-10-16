import { db } from '../../db/database'
import type { Prompt, BibleEntry, FieldValue, Scene, EntityState } from '../../db/schema'
import { extractTextFromJson } from '../textUtils'
import { BibleService } from '../BibleService'
import { getSceneNarrativeSequence } from './narrativeComparator'

// Baseline character length approximation (4 characters ≈ 1 token)
export const estimateTokens = (text: string): number => Math.ceil((text || '').length / 4);

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

export class ContextEngine {
    /**
     * Assembles a Context Payload dynamically enforcing canon-aware field eligibility,
     * temporal narrative bounds, deterministic precedence, and token budgeting.
     */
    static async assemble(
        prompt: Prompt,
        targetSceneId: string | null,
        manualInputs: Record<string, string> = {},
        pinnedObjectIds: string[] = [],
        excludedObjectIds: string[] = []
    ): Promise<ContextAssembly> {
        let assembly: ContextAssembly = {
            assembledSystemInstruction: prompt.systemInstruction || '',
            assembledUserPrompt: prompt.userTemplate || '',
            totalEstimatedTokens: estimateTokens(prompt.systemInstruction || '') + estimateTokens(prompt.userTemplate || ''),
            budgetLimit: prompt.tokenBudget || 35000,
            includedSources: [],
            excludedSources: []
        };

        const scene = targetSceneId ? await db.scenes.get(targetSceneId) : null;
        const targetSequence = scene ? getSceneNarrativeSequence(scene) : null;

        for (const input of (prompt.inputs || [])) {
            const regex = new RegExp(`\\{\\{\\s*${input.name}\\s*\\}\\}`, 'gi');

            if (input.kind === 'manual') {
                const val = manualInputs[input.name] !== undefined ? manualInputs[input.name] : (input.defaultValue || '');
                assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, String(val));
                assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, String(val));
            } else if (input.kind === 'context') {
                if (input.type === 'CurrentScene' || input.type === 'Selection') {
                    if (!scene) {
                        assembly.excludedSources.push({ id: 'N/A', name: input.name, reason: 'No active context sequence available.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        continue;
                    }

                    if (excludedObjectIds.includes(scene.id)) {
                        assembly.excludedSources.push({ id: scene.id, name: scene.name, reason: 'Manually excluded by user.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        continue;
                    }

                    const sceneText = extractTextFromJson(scene.content);
                    const tokens = estimateTokens(sceneText);

                    if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                        assembly.excludedSources.push({ id: scene.id, name: scene.name, reason: 'Context window budget exhausted.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        continue;
                    }

                    assembly.includedSources.push({ id: scene.id, name: scene.name, type: 'Scene', contentSpan: sceneText, estimatedTokens: tokens });
                    assembly.totalEstimatedTokens += tokens;

                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, sceneText);
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, sceneText);
                } else if (input.type === 'CharacterState' || input.type === 'RelevantBibleEntries') {
                    // Gather candidate entries from occurrences, pins, and alwaysIncludeInContext
                    const candidateEntryIds: string[] = [];

                    // 1. Pinned entries have highest priority
                    if (pinnedObjectIds && pinnedObjectIds.length > 0) {
                        for (const pid of pinnedObjectIds) {
                            if (!candidateEntryIds.includes(pid)) candidateEntryIds.push(pid);
                        }
                    }

                    // 2. Entries marked alwaysIncludeInContext
                    if (scene?.novelId) {
                        const activeEntries = await BibleService.listActiveEntries(scene.novelId);
                        for (const ae of activeEntries) {
                            if (ae.alwaysIncludeInContext && !candidateEntryIds.includes(ae.id)) {
                                candidateEntryIds.push(ae.id);
                            }
                        }
                    }

                    // 3. Scene occurrences
                    if (scene) {
                        const occurrences = await db.occurrences.where({ sceneId: scene.id }).toArray();
                        for (const occ of occurrences) {
                            if (!candidateEntryIds.includes(occ.entryId)) {
                                candidateEntryIds.push(occ.entryId);
                            }
                        }
                    }

                    let combinedText = '';

                    for (const entryId of candidateEntryIds) {
                        // Precedence 1: Manual exclusion wins over everything
                        if (excludedObjectIds.includes(entryId)) {
                            assembly.excludedSources.push({ id: entryId, name: 'Entity ' + entryId, reason: 'Manually excluded by user.' });
                            continue;
                        }

                        const entry = await db.bibleEntries.get(entryId);
                        if (!entry || entry.isTrashed) continue;

                        // Filter by type if CharacterState requested
                        if (input.type === 'CharacterState' && entry.type?.toLowerCase() !== 'character') {
                            continue;
                        }

                        // Precedence 2: Entry-level excludeFromContext (pins do not override excludeFromContext)
                        if (entry.excludeFromContext) {
                            assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Excluded by entry settings (excludeFromContext).' });
                            continue;
                        }

                        // State policy: default strictly to Canon, unless prompt input explicitly specifies allowedStates
                        const allowedStates: EntityState[] = (input as any).allowedStates || ['Canon'];
                        const fields = await BibleService.queryEligibleFields(entry.id, targetSequence, allowedStates);

                        // Serialize the entry and its canon-eligible fields
                        const entryText = ContextEngine.formatBibleEntry(entry, fields);
                        const tokens = estimateTokens(entryText);

                        // Precedence 3: Budget check
                        if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                            assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Context window budget exhausted.' });
                            continue;
                        }

                        assembly.includedSources.push({ id: entry.id, name: entry.name, type: entry.type, contentSpan: entryText, estimatedTokens: tokens });
                        assembly.totalEstimatedTokens += tokens;
                        combinedText += `\n${entryText}\n`;
                    }

                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, combinedText.trim());
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, combinedText.trim());
                } else if (input.type === 'StoryGuides') {
                    const novelId = scene?.novelId;
                    if (!novelId) {
                        assembly.excludedSources.push({ id: 'N/A', name: input.name, reason: 'No active context sequence available.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        continue;
                    }

                    const activeEntries = await BibleService.listActiveEntries(novelId);
                    const guides = activeEntries.filter(e => e.type === 'Story Guide');
                    let combinedText = '';

                    for (const g of guides) {
                        if (g.excludeFromContext) {
                            assembly.excludedSources.push({ id: g.id, name: g.name, reason: 'Excluded by entry settings (excludeFromContext).' });
                            continue;
                        }
                        if (excludedObjectIds.includes(g.id)) {
                            assembly.excludedSources.push({ id: g.id, name: g.name, reason: 'Manually excluded by user.' });
                            continue;
                        }
                        const guideText = `[Story Guide: ${g.name}]\n${g.description || ''}`.trim();
                        const tokens = estimateTokens(guideText);
                        if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                            assembly.excludedSources.push({ id: g.id, name: g.name, reason: 'Context window budget exhausted.' });
                            continue;
                        }

                        assembly.includedSources.push({ id: g.id, name: g.name, type: 'Story Guide', contentSpan: guideText, estimatedTokens: tokens });
                        assembly.totalEstimatedTokens += tokens;
                        combinedText += `\n${guideText}\n`;
                    }

                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, combinedText.trim());
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, combinedText.trim());
                } else if (input.type === 'PreviousScene') {
                    if (!scene) {
                        assembly.excludedSources.push({ id: 'N/A', name: 'PreviousScene', reason: 'No target scene provided for relative context.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                    } else {
                        const novelScenes = await db.scenes.where('novelId').equals(scene.novelId).toArray();
                        novelScenes.sort((a, b) => getSceneNarrativeSequence(a) - getSceneNarrativeSequence(b));
                        const currentIndex = novelScenes.findIndex(s => s.id === scene.id);
                        const prevScene = currentIndex > 0 ? novelScenes[currentIndex - 1] : null;

                        if (prevScene && !excludedObjectIds.includes(prevScene.id)) {
                            const sceneText = extractTextFromJson(prevScene.content);
                            const contentSpan = `[Previous Scene: ${prevScene.name}]\n${sceneText}`.trim();
                            const tokens = estimateTokens(contentSpan);
                            if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                                assembly.excludedSources.push({ id: prevScene.id, name: prevScene.name, reason: 'Context window budget exhausted.' });
                                assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                                assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                            } else {
                                assembly.includedSources.push({ id: prevScene.id, name: prevScene.name, type: 'PreviousScene', contentSpan, estimatedTokens: tokens });
                                assembly.totalEstimatedTokens += tokens;
                                assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, `\n${contentSpan}\n`);
                                assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, `\n${contentSpan}\n`);
                            }
                        } else if (prevScene && excludedObjectIds.includes(prevScene.id)) {
                            assembly.excludedSources.push({ id: prevScene.id, name: prevScene.name, reason: 'Manually excluded by user.' });
                            assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                            assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        } else {
                            assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                            assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                        }
                    }
                } else if (input.type === 'CurrentChapter') {
                    if (!scene || !scene.chapterId) {
                        assembly.excludedSources.push({ id: 'N/A', name: 'CurrentChapter', reason: 'No target scene or chapter provided.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                    } else {
                        const chapterScenes = await db.scenes.where({ chapterId: scene.chapterId }).toArray();
                        chapterScenes.sort((a, b) => getSceneNarrativeSequence(a) - getSceneNarrativeSequence(b));
                        let combinedText = '';
                        for (const chapScene of chapterScenes) {
                            if (excludedObjectIds.includes(chapScene.id)) {
                                assembly.excludedSources.push({ id: chapScene.id, name: chapScene.name, reason: 'Manually excluded by user.' });
                                continue;
                            }
                            const sceneText = extractTextFromJson(chapScene.content);
                            const contentSpan = `[Scene: ${chapScene.name}]\n${sceneText}`.trim();
                            const tokens = estimateTokens(contentSpan);
                            if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                                assembly.excludedSources.push({ id: chapScene.id, name: chapScene.name, reason: 'Context window budget exhausted.' });
                                continue;
                            }
                            assembly.includedSources.push({ id: chapScene.id, name: chapScene.name, type: 'CurrentChapter', contentSpan, estimatedTokens: tokens });
                            assembly.totalEstimatedTokens += tokens;
                            combinedText += `\n${contentSpan}\n`;
                        }
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, combinedText.trim());
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, combinedText.trim());
                    }
                } else if (input.type === 'PlanningNotes' || input.type === 'CurrentScenePlan' || (input.type as string) === 'Planning') {
                    // Collect planning content from Scene, Chapter, Act, and Novel
                    let planningParts: string[] = [];
                    if (scene?.planningContent) {
                        const text = extractTextFromJson(scene.planningContent);
                        if (text.trim()) planningParts.push(`[Scene Plan: ${scene.name}]\n${text.trim()}`);
                    }
                    if (scene?.chapterId) {
                        const ch = await db.chapters.get(scene.chapterId);
                        if (ch?.planningContent) {
                            const text = extractTextFromJson(ch.planningContent);
                            if (text.trim()) planningParts.push(`[Chapter Plan: ${ch.name}]\n${text.trim()}`);
                        }
                    }
                    if (scene?.novelId) {
                        const n = await db.novels.get(scene.novelId);
                        if (n?.planningContent) {
                            const text = extractTextFromJson(n.planningContent);
                            if (text.trim()) planningParts.push(`[Novel Plan: ${n.title}]\n${text.trim()}`);
                        }
                    }

                    const combined = planningParts.join('\n\n');
                    const tokens = estimateTokens(combined);
                    if (tokens > 0 && assembly.totalEstimatedTokens + tokens <= assembly.budgetLimit) {
                        assembly.includedSources.push({ id: scene?.id || 'planning', name: 'Planning Content', type: 'Planning', contentSpan: combined, estimatedTokens: tokens });
                        assembly.totalEstimatedTokens += tokens;
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, `\n${combined}\n`);
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, `\n${combined}\n`);
                    } else if (tokens > 0) {
                        assembly.excludedSources.push({ id: scene?.id || 'planning', name: 'Planning Content', reason: 'Context window budget exhausted.' });
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                    } else {
                        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                    }
                } else {
                    assembly.excludedSources.push({ id: 'N/A', name: `Input ${input.type}`, reason: 'Provider Adapter abstraction pending for this vector.' });
                    assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
                    assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
                }
            }
        }

        // Failsafe pass: ensure no declared {{variable}} or leftover {{...}} remains in either output
        for (const input of (prompt.inputs || [])) {
            const regex = new RegExp(`\\{\\{\\s*${input.name}\\s*\\}\\}`, 'gi');
            assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(regex, '');
            assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(regex, '');
        }
        assembly.assembledUserPrompt = assembly.assembledUserPrompt.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');
        assembly.assembledSystemInstruction = assembly.assembledSystemInstruction.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');

        return assembly;
    }

    static formatFieldValue(value: any): string {
        if (value == null) return '';
        if (typeof value === 'string') {
            const t = value.trim();
            if (t.startsWith('{') && t.includes('"type"')) {
                try {
                    return extractTextFromJson(JSON.parse(t));
                } catch {
                    return value;
                }
            }
            return value;
        }
        if (typeof value === 'object') {
            if (value.type === 'doc' || Array.isArray(value.content)) {
                return extractTextFromJson(value);
            }
            return JSON.stringify(value);
        }
        return String(value);
    }

    static formatBibleEntry(entry: BibleEntry, fields: FieldValue[]): string {
        const lines: string[] = [`[Codex: ${entry.name} (${entry.type})]`];
        if (entry.description?.trim()) {
            lines.push(`Description: ${entry.description.trim()}`);
        }
        for (const f of fields) {
            const val = ContextEngine.formatFieldValue(f.value);
            if (val.trim()) {
                lines.push(`- ${f.fieldKey}: ${val.trim()}`);
            }
        }
        return lines.join('\n');
    }

    /**
     * Resolves an arbitrary list of context references (e.g. from Chat or Staging)
     * using the same canon-aware field eligibility, narrative ordering, and budget accounting.
     */
    static async assembleChatContext(
        novelId: string,
        references: Array<{ type: string; id: string; name: string }>,
        targetSceneId: string | null = null,
        excludedObjectIds: string[] = [],
        tokenBudget: number = 35000
    ): Promise<ContextAssembly> {
        const baseSystem = 'You are a helpful creative writing assistant.';
        let assembly: ContextAssembly = {
            assembledSystemInstruction: baseSystem,
            assembledUserPrompt: '',
            totalEstimatedTokens: estimateTokens(baseSystem),
            budgetLimit: tokenBudget,
            includedSources: [],
            excludedSources: []
        };

        const scene = targetSceneId ? await db.scenes.get(targetSceneId) : null;
        const targetSequence = scene ? getSceneNarrativeSequence(scene) : null;

        for (const ref of references) {
            if (excludedObjectIds.includes(ref.id)) {
                assembly.excludedSources.push({ id: ref.id, name: ref.name, reason: 'Manually excluded by user.' });
                continue;
            }

            if (ref.type === 'Scene') {
                const sc = await db.scenes.get(ref.id);
                if (!sc || sc.isTrashed) continue;
                const text = extractTextFromJson(sc.content);
                const contentSpan = `[Scene: ${sc.name}]\n${text}`.trim();
                const tokens = estimateTokens(contentSpan);

                if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                    assembly.excludedSources.push({ id: sc.id, name: sc.name, reason: 'Context window budget exhausted.' });
                    continue;
                }

                assembly.includedSources.push({ id: sc.id, name: sc.name, type: 'Scene', contentSpan, estimatedTokens: tokens });
                assembly.totalEstimatedTokens += tokens;
            } else if (ref.type === 'Chapter') {
                const chapterScenes = await db.scenes.where({ chapterId: ref.id }).toArray();
                chapterScenes.sort((a, b) => getSceneNarrativeSequence(a) - getSceneNarrativeSequence(b));
                const parts: string[] = [];
                for (const cs of chapterScenes) {
                    if (cs.isTrashed) continue;
                    const cText = extractTextFromJson(cs.content);
                    if (cText.trim()) parts.push(`[Scene: ${cs.name}]\n${cText.trim()}`);
                }
                const contentSpan = `[Chapter: ${ref.name}]\n${parts.join('\n\n')}`.trim();
                const tokens = estimateTokens(contentSpan);

                if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                    assembly.excludedSources.push({ id: ref.id, name: ref.name, reason: 'Context window budget exhausted.' });
                    continue;
                }

                assembly.includedSources.push({ id: ref.id, name: ref.name, type: 'Chapter', contentSpan, estimatedTokens: tokens });
                assembly.totalEstimatedTokens += tokens;
            } else if (ref.type.startsWith('Codex_') || ref.type === 'BibleEntry') {
                const entry = await db.bibleEntries.get(ref.id);
                if (!entry || entry.isTrashed) continue;

                if (entry.excludeFromContext) {
                    assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Excluded by entry settings (excludeFromContext).' });
                    continue;
                }

                const fields = await BibleService.queryEligibleFields(entry.id, targetSequence, ['Canon']);
                const contentSpan = ContextEngine.formatBibleEntry(entry, fields);
                const tokens = estimateTokens(contentSpan);

                if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                    assembly.excludedSources.push({ id: entry.id, name: entry.name, reason: 'Context window budget exhausted.' });
                    continue;
                }

                assembly.includedSources.push({ id: entry.id, name: entry.name, type: entry.type, contentSpan, estimatedTokens: tokens });
                assembly.totalEstimatedTokens += tokens;
            } else if (ref.type.startsWith('Planning')) {
                let planningText = '';
                if (ref.type === 'Planning_Novel') {
                    const n = await db.novels.get(ref.id);
                    if (n?.planningContent) planningText = extractTextFromJson(n.planningContent);
                } else if (ref.type === 'Planning_Act') {
                    const a = await db.acts.get(ref.id);
                    if (a?.planningContent) planningText = extractTextFromJson(a.planningContent);
                } else if (ref.type === 'Planning_Chapter') {
                    const c = await db.chapters.get(ref.id);
                    if (c?.planningContent) planningText = extractTextFromJson(c.planningContent);
                } else if (ref.type === 'Planning_Scene') {
                    const s = await db.scenes.get(ref.id);
                    if (s?.planningContent) planningText = extractTextFromJson(s.planningContent);
                } else {
                    const [n, a, c, s] = await Promise.all([
                        db.novels.get(ref.id),
                        db.acts.get(ref.id),
                        db.chapters.get(ref.id),
                        db.scenes.get(ref.id)
                    ]);
                    const contentObj = n?.planningContent || a?.planningContent || c?.planningContent || s?.planningContent;
                    if (contentObj) planningText = extractTextFromJson(contentObj);
                }

                const contentSpan = `[Planning: ${ref.name}]\n${planningText}`.trim();
                const tokens = estimateTokens(contentSpan);

                if (assembly.totalEstimatedTokens + tokens > assembly.budgetLimit) {
                    assembly.excludedSources.push({ id: ref.id, name: ref.name, reason: 'Context window budget exhausted.' });
                    continue;
                }

                assembly.includedSources.push({ id: ref.id, name: ref.name, type: 'Planning', contentSpan, estimatedTokens: tokens });
                assembly.totalEstimatedTokens += tokens;
            }
        }

        if (assembly.includedSources.length > 0) {
            const contextBlock = assembly.includedSources.map(s => s.contentSpan).join('\n\n');
            assembly.assembledSystemInstruction = `${baseSystem}\n\nContext to consider:\n\n${contextBlock}`;
        }

        return assembly;
    }
}
