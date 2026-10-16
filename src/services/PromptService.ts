import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt, PromptCategory } from '../db/schema'

export class PromptService {
    static _seeded = false;
    static _seedPromise: Promise<void> | null = null;

    static async ensureBuiltIns(): Promise<void> {
        if (this._seeded) return;
        if (this._seedPromise) return this._seedPromise;

        // Check localStorage to avoid re-running seed logic on every page refresh
        const alreadySeeded = localStorage.getItem('anansi_prompts_seeded');
        if (alreadySeeded === 'true') {
            this._seeded = true;
            return;
        }

        this._seedPromise = this.seedDefaultPrompts().then(() => {
            this._seeded = true;
            localStorage.setItem('anansi_prompts_seeded', 'true');
        });

        return this._seedPromise;
    }

    // ─────────────────────────────────────────────────────────
    // Categories
    // ─────────────────────────────────────────────────────────
    static async getCategories(novelId?: string): Promise<PromptCategory[]> {
        await this.ensureBuiltIns();
        const all = await db.promptCategories.toArray()
        // Return globals + project specific
        return all.filter(c => !c.novelId || c.novelId === novelId).sort((a, b) => a.sortOrder - b.sortOrder)
    }

    static async seedDefaultPrompts(): Promise<void> {
        let defaultCategory = await db.promptCategories.filter(c => c.isSystem).first()
        if (!defaultCategory) {
            const catId = uuidv4()
            await db.promptCategories.add({
                id: catId,
                name: 'Built-ins',
                sortOrder: 0,
                isSystem: true
            })
            defaultCategory = await db.promptCategories.get(catId)
        }

        if (!defaultCategory) return

        const existingPrompts = await db.prompts.where({ categoryId: defaultCategory.id }).toArray()

        // 1. Expand
        const expandPrompt = existingPrompts.find(p => p.name === 'Expand');
        if (!expandPrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Expand',
                tags: ['creative', 'prose'],
                description: 'Expands the existing prose naturally.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.7,
                maxOutputTokens: 2000,
                tokenBudget: 50000,
                systemInstruction: "You are an expert prose editor. Expand existing text while preserving the author's established meaning, voice, characterization, POV, tense, and stylistic choices. Do not introduce unsupported plot developments. Return only the requested writing.",
                userTemplate: '{{content}}',
                applicableFields: ['prose', 'summary', 'codexText'],
                contextRecipe: [
                    { source: 'selectedText', required: true },
                    { source: 'currentScene', required: false },
                    { source: 'relevantCodex', required: false }
                ],
                presets: [
                    { id: 'preset-balanced', name: 'Balanced', values: { expansionFocus: 'Sensory Detail, Feelings', length: '1.5x' } },
                    { id: 'preset-deep-pov', name: 'Deep POV', values: { expansionFocus: 'Sensory Detail, Introspection', length: 'Double' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'expansionFocus', manualType: 'text', isRequired: false },
                    { kind: 'manual', name: 'length', manualType: 'select', options: ['Slightly Longer', '1.5x', 'Double', 'Triple'], defaultValue: '1.5x', isRequired: true }
                ],
                isFavorite: true,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }


        // 2. Rephrase
        const rephrasePrompt = existingPrompts.find(p => p.name === 'Rephrase');
        if (!rephrasePrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Rephrase',
                tags: ['editing'],
                description: 'Rewrites text effectively.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.5,
                maxOutputTokens: 2000,
                tokenBudget: 25000,
                systemInstruction: "Rewrite the supplied text while preserving its meaning, facts, characterization, POV, and tense. Conform carefully to the active destination format constraints. Return strictly the requested writing.",
                userTemplate: '{{content}}',
                applicableFields: ['prose', 'summary', 'codexText'],
                contextRecipe: [
                    { source: 'selectedText', required: true }
                ],
                presets: [],
                inputs: [],
                isFavorite: true,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }

        // 3. Plan Scene
        const planScenePrompt = existingPrompts.find(p => p.name === 'Plan Scene');
        if (!planScenePrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Plan Scene',
                tags: ['planning'],
                description: 'Turn an idea or partial Summary into a practical Scene plan.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.7,
                maxOutputTokens: 1000,
                tokenBudget: 35000,
                systemInstruction: "Develop a practical Scene plan from the author's request and supplied story context.\n\nIdentify what the Scene should accomplish, important developments, relevant character interactions or conflict, and the state in which the Scene ends.\n\nDo not write finished manuscript prose.\nDo not introduce unsupported plot developments.\nRespect the Scene Summary field's approximate 200-word maximum.",
                userTemplate: '{{content}}',
                applicableFields: ['summary'],
                contextRecipe: [
                    { source: 'sceneSummary', required: true },
                    { source: 'currentChapter', required: false },
                    { source: 'previousSceneSummary', required: false },
                    { source: 'nextSceneSummary', required: false },
                    { source: 'pov', required: false },
                    { source: 'location', required: false },
                    { source: 'sceneCharacters', required: false },
                    { source: 'relevantCodex', required: false },
                    { source: 'storyGuides', required: false }
                ],
                presets: [
                    { id: 'preset-balanced', name: 'Balanced', values: { planningEmphasis: 'Balanced' } },
                    { id: 'preset-character', name: 'Character', values: { planningEmphasis: 'Character' } },
                    { id: 'preset-conflict', name: 'Conflict', values: { planningEmphasis: 'Conflict' } },
                    { id: 'preset-plot', name: 'Plot', values: { planningEmphasis: 'Plot' } },
                    { id: 'preset-relationship', name: 'Relationship', values: { planningEmphasis: 'Relationship' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'planningEmphasis', manualType: 'select', options: ['Balanced', 'Character', 'Conflict', 'Plot', 'Relationship'], defaultValue: 'Balanced', isRequired: false }
                ],
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }

        // 4. Summary from Scene
        const summaryScenePrompt = existingPrompts.find(p => p.name === 'Summary from Scene');
        if (!summaryScenePrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Summary from Scene',
                tags: ['planning', 'recap'],
                description: 'Generate a concise factual Scene Summary from the associated Scene prose.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.5,
                maxOutputTokens: 600,
                tokenBudget: 35000,
                systemInstruction: "Produce a concise factual summary of what occurs in the current Scene.\n\nInclude important actions, decisions, discoveries, conflicts, relationship changes, and plot developments.\n\nDo not critique the writing.\nDo not invent motivations or facts unsupported by the Scene.\n\nKeep the result approximately 200 words or fewer.",
                userTemplate: '{{content}}',
                applicableFields: ['summary'],
                contextRecipe: [
                    { source: 'currentScene', required: true },
                    { source: 'pov', required: false },
                    { source: 'location', required: false },
                    { source: 'sceneCharacters', required: false },
                    { source: 'relevantCodex', required: false }
                ],
                presets: [
                    { id: 'preset-balanced', name: 'Balanced', values: { summaryFocus: 'Balanced' } },
                    { id: 'preset-plot', name: 'Plot-focused', values: { summaryFocus: 'Plot-focused' } },
                    { id: 'preset-character', name: 'Character-focused', values: { summaryFocus: 'Character-focused' } },
                    { id: 'preset-detailed', name: 'Detailed', values: { summaryFocus: 'Detailed' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'summaryFocus', manualType: 'select', options: ['Balanced', 'Plot-focused', 'Character-focused', 'Detailed'], defaultValue: 'Balanced', isRequired: false }
                ],
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }

        // 5. Scene Beats from Summary
        const sceneBeatsPrompt = existingPrompts.find(p => p.name === 'Scene Beats from Summary');
        if (!sceneBeatsPrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Scene Beats from Summary',
                tags: ['planning', 'beats'],
                description: 'Convert a Scene Summary into practical drafting beats.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.6,
                maxOutputTokens: 1000,
                tokenBudget: 25000,
                systemInstruction: "Convert the supplied Scene Summary into practical narrative beats that can guide drafting.\n\nPreserve the planned events and characterization.\nBreak the Scene into useful sequential developments.\n\nDo not write finished prose.\nDo not introduce unsupported plot changes.\nDo not force an arbitrary number of beats if the Scene naturally needs a different structure.",
                userTemplate: '{{content}}',
                applicableFields: ['sceneNotes'],
                contextRecipe: [
                    { source: 'sceneSummary', required: true },
                    { source: 'currentChapter', required: false },
                    { source: 'pov', required: false },
                    { source: 'location', required: false },
                    { source: 'sceneCharacters', required: false },
                    { source: 'relevantCodex', required: false }
                ],
                presets: [
                    { id: 'preset-simple', name: 'Simple', values: { beatDetail: 'Simple' } },
                    { id: 'preset-standard', name: 'Standard', values: { beatDetail: 'Standard' } },
                    { id: 'preset-detailed', name: 'Detailed', values: { beatDetail: 'Detailed' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'beatDetail', manualType: 'select', options: ['Simple', 'Standard', 'Detailed'], defaultValue: 'Standard', isRequired: false }
                ],
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }

        // 6. Story Sounding Board
        const storySoundingBoardPrompt = existingPrompts.find(p => p.name === 'Story Sounding Board');
        if (!storySoundingBoardPrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Story Sounding Board',
                tags: ['chat', 'collaboration'],
                description: 'Let the author discuss a story question without assuming the material is broken.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.8,
                maxOutputTokens: 2000,
                tokenBudget: 50000,
                systemInstruction: "Act as a collaborative story-development partner.\n\nDiscuss the author's question using the supplied story context.\nExplore possibilities, implications, tradeoffs, and useful questions.\n\nDo not assume the existing story is defective.\nDo not prescribe a single solution unless the author explicitly asks.",
                userTemplate: '{{content}}',
                applicableFields: ['chat'],
                contextRecipe: [],
                presets: [
                    { id: 'preset-brainstorm', name: 'Brainstorm', values: { goal: 'Brainstorm: Explore several meaningfully different possibilities.' } },
                    { id: 'preset-stress-test', name: 'Stress Test', values: { goal: 'Stress Test: Look for weak assumptions, contradictions, continuity problems, or consequences that may need support.' } },
                    { id: 'preset-questions', name: 'Ask Me Questions', values: { goal: 'Ask Me Questions: Help develop the idea primarily through focused questions rather than immediately proposing a finished solution.' } },
                    { id: 'preset-consequences', name: 'Consequences', values: { goal: 'Consequences: Explore what this idea would logically change downstream.' } },
                    { id: 'preset-help', name: 'Help Me Develop This', values: { goal: 'Help Me Develop This' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'goal', manualType: 'select', options: ['Brainstorm: Explore several meaningfully different possibilities.', 'Stress Test: Look for weak assumptions, contradictions, continuity problems, or consequences that may need support.', 'Ask Me Questions: Help develop the idea primarily through focused questions rather than immediately proposing a finished solution.', 'Consequences: Explore what this idea would logically change downstream.', 'Help Me Develop This'], defaultValue: 'Help Me Develop This', isRequired: false }
                ],
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }

        // 7. Explore Alternatives
        const exploreAlternativesPrompt = existingPrompts.find(p => p.name === 'Explore Alternatives');
        if (!exploreAlternativesPrompt) {
            await db.prompts.add({
                id: uuidv4(),
                scope: 'built-in',
                categoryId: defaultCategory.id,
                name: 'Explore Alternatives',
                tags: ['chat', 'brainstorming'],
                description: 'Produce several genuinely different approaches to a story problem.',
                outputMode: 'chat',
                defaultModel: 'anthropic/claude-3-haiku',
                allowedModels: [],
                temperature: 0.9,
                maxOutputTokens: 3000,
                tokenBudget: 50000,
                systemInstruction: "Generate several meaningfully different approaches to the author's stated story problem.\n\nAvoid superficial variations of the same solution.\n\nFor each approach, briefly explain:\n- what happens\n- why it could work\n- significant consequences for the story\n\nDo not select a preferred option unless the author explicitly asks.",
                userTemplate: '{{content}}',
                applicableFields: ['chat'],
                contextRecipe: [],
                presets: [
                    { id: 'preset-default', name: 'Default', values: { alternatives: '3', variation: 'Distinct' } }
                ],
                inputs: [
                    { kind: 'manual', name: 'alternatives', manualType: 'select', options: ['3', '5', 'Custom'], defaultValue: '3', isRequired: false },
                    { kind: 'manual', name: 'variation', manualType: 'select', options: ['Conservative', 'Distinct', 'Wild'], defaultValue: 'Distinct', isRequired: false }
                ],
                isFavorite: false,
                isEnabled: true,
                isTrashed: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
        }
    }

    static async createCategory(name: string, isSystem: boolean = false, novelId?: string): Promise<string> {
        const id = uuidv4()
        const count = await db.promptCategories.count()
        await db.promptCategories.add({
            id,
            novelId,
            name,
            sortOrder: count,
            isSystem
        })
        return id
    }

    static async updateCategory(id: string, updates: Partial<PromptCategory>): Promise<void> {
        await db.promptCategories.update(id, updates)
    }

    static async deleteCategory(id: string, fallbackCategoryId: string): Promise<void> {
        const cat = await db.promptCategories.get(id)
        if (cat?.isSystem) throw new Error("Cannot delete a system/built-in category.")

        // Move all prompts to the fallback category
        const prompts = await db.prompts.where({ categoryId: id }).toArray()
        for (const p of prompts) {
            await db.prompts.update(p.id, { categoryId: fallbackCategoryId, updatedAt: Date.now() })
        }
        await db.promptCategories.delete(id)
    }

    // ─────────────────────────────────────────────────────────
    // Prompts
    // ─────────────────────────────────────────────────────────
    static async getPrompts(novelId?: string, includeTrashed: boolean = false): Promise<Prompt[]> {
        await this.ensureBuiltIns(); // Guarantees global Built-Ins seed if totally absent
        const all = await db.prompts.toArray()
        const mapped = all.map(p => ({
            ...p,
            applicableFields: p.applicableFields || ['prose', 'summary', 'codexText'],
            presets: p.presets || [],
            contextRecipe: p.contextRecipe || [],
            inputs: p.inputs || []
        }))
        return mapped.filter(p => {
            if (!includeTrashed && p.isTrashed) return false
            if (p.scope === 'built-in' || p.scope === 'global') return true
            return p.novelId === novelId
        })
    }

    static async createPrompt(
        name: string,
        categoryId: string,
        scope: 'built-in' | 'global' | 'project' | 'series' | 'novel' = 'global',
        novelId?: string
    ): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            id,
            novelId: (scope === 'project' || scope === 'novel') ? novelId : undefined,
            scope,
            categoryId,
            name,
            tags: [],
            description: '',
            outputMode: 'chat',
            defaultModel: 'anthropic/claude-3-haiku',
            allowedModels: [],
            temperature: 0.7,
            maxOutputTokens: 2000,
            tokenBudget: 35000,
            systemInstruction: 'You are a helpful AI writing assistant.',
            userTemplate: '{{content}}',
            applicableFields: ['prose', 'summary', 'codexText'],
            presets: [],
            contextRecipe: [],
            inputs: [],
            isFavorite: false,
            isEnabled: true,
            isTrashed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    static async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<void> {
        const existing = await db.prompts.get(promptId)
        if (existing?.scope === 'built-in') throw new Error("Cannot modify a built-in prompt.")

        await db.prompts.update(promptId, {
            ...updates,
            updatedAt: Date.now()
        })
    }

    static async softDeletePrompt(promptId: string): Promise<void> {
        const existing = await db.prompts.get(promptId)
        const override = localStorage.getItem('anansi_allow_builtin_delete') === 'true'
        if (existing?.scope === 'built-in' && !override) throw new Error("Cannot delete a built-in prompt.")

        await db.prompts.update(promptId, {
            isTrashed: true,
            trashedAt: Date.now(),
            updatedAt: Date.now()
        })
    }

    static async restorePrompt(promptId: string): Promise<void> {
        await db.prompts.update(promptId, {
            isTrashed: false,
            trashedAt: undefined,
            updatedAt: Date.now()
        })
    }

    static async permanentDeletePrompt(promptId: string): Promise<void> {
        await db.prompts.delete(promptId)
    }

    static async duplicatePrompt(prompt: Prompt, targetScope: 'global' | 'project', targetProjectId?: string): Promise<string> {
        const id = uuidv4()
        await db.prompts.add({
            ...prompt,
            id,
            scope: targetScope,
            novelId: targetScope === 'project' ? targetProjectId : undefined,
            name: `${prompt.name} (Copy)`,
            isTrashed: false,
            trashedAt: undefined,
            isFavorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
        return id
    }

    // ─────────────────────────────────────────────────────────
    // Import / Export (Versioned Packages)
    // ─────────────────────────────────────────────────────────
    static async exportPrompts(promptIds: string[]): Promise<string> {
        const rawPrompts = await Promise.all(promptIds.map(id => db.prompts.get(id)))
        const prompts = rawPrompts.filter((p): p is Prompt => p !== undefined)

        const categoryIds = Array.from(new Set(prompts.map(p => p.categoryId).filter(Boolean)))
        const rawCategories = await Promise.all(categoryIds.map(id => db.promptCategories.get(id)))
        const categories: PromptPackageCategory[] = rawCategories
            .filter((c): c is PromptCategory => c !== undefined)
            .map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder }))

        const pkg: PromptPackage = {
            format: 'anansi-prompt-package',
            version: '1.0',
            createdAt: Date.now(),
            categories,
            prompts
        }

        return JSON.stringify(pkg, null, 2)
    }

    static async previewImportPackage(jsonString: string, targetNovelId?: string): Promise<PromptImportPreview> {
        let parsed: any
        try {
            parsed = JSON.parse(jsonString)
        } catch (e: any) {
            return {
                isValid: false,
                error: 'Invalid JSON payload: ' + e.message,
                promptsToAdd: [],
                conflicts: [],
                categoriesToCreate: []
            }
        }

        if (parsed?.format !== 'anansi-prompt-package') {
            return {
                isValid: false,
                error: 'Unsupported package format. Expected "anansi-prompt-package".',
                promptsToAdd: [],
                conflicts: [],
                categoriesToCreate: []
            }
        }

        if (parsed?.version !== '1.0') {
            return {
                isValid: false,
                error: `Unsupported package version "${parsed?.version}". Only version "1.0" is supported.`,
                promptsToAdd: [],
                conflicts: [],
                categoriesToCreate: []
            }
        }

        if (!Array.isArray(parsed?.prompts)) {
            return {
                isValid: false,
                error: 'Package is missing a valid "prompts" array.',
                promptsToAdd: [],
                conflicts: [],
                categoriesToCreate: []
            }
        }

        for (let i = 0; i < parsed.prompts.length; i++) {
            const p = parsed.prompts[i]
            if (!p || typeof p !== 'object' || !p.name || typeof p.name !== 'string') {
                return {
                    isValid: false,
                    error: `Prompt record at index ${i} is missing a valid name.`,
                    promptsToAdd: [],
                    conflicts: [],
                    categoriesToCreate: []
                }
            }
            if (typeof p.systemInstruction !== 'string' || typeof p.userTemplate !== 'string') {
                return {
                    isValid: false,
                    error: `Prompt "${p.name}" must specify systemInstruction and userTemplate.`,
                    promptsToAdd: [],
                    conflicts: [],
                    categoriesToCreate: []
                }
            }
        }

        const existingCategories = await db.promptCategories.toArray()
        const existingCatNames = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]))
        const categoriesToCreate: PromptPackageCategory[] = []
        if (Array.isArray(parsed.categories)) {
            for (const cat of parsed.categories) {
                if (cat?.name && !existingCatNames.has(cat.name.toLowerCase())) {
                    categoriesToCreate.push(cat)
                }
            }
        }

        const existingPrompts = await db.prompts.toArray()
        const promptsById = new Map(existingPrompts.map(p => [p.id, p]))
        const promptsByName = new Map(existingPrompts.map(p => [p.name.toLowerCase(), p]))

        const promptsToAdd: Prompt[] = []
        const conflicts: PromptImportConflict[] = []

        for (const incoming of parsed.prompts) {
            const matchById = promptsById.get(incoming.id)
            const matchByName = promptsByName.get(incoming.name.toLowerCase())
            const match = matchById || matchByName

            if (match) {
                conflicts.push({
                    incomingPrompt: incoming,
                    existingPrompt: match,
                    conflictType: matchById ? 'id' : 'name',
                    isBuiltIn: match.scope === 'built-in'
                })
            } else {
                promptsToAdd.push(incoming)
            }
        }

        return {
            isValid: true,
            packageVersion: parsed.version,
            promptsToAdd,
            conflicts,
            categoriesToCreate
        }
    }

    static async commitImportPackage(
        preview: PromptImportPreview,
        resolutions: Record<string, ConflictResolution> = {},
        targetNovelId?: string
    ): Promise<{ importedCount: number; skippedCount: number }> {
        if (!preview.isValid) {
            throw new Error(`Cannot commit invalid package: ${preview.error}`)
        }

        for (const conflict of preview.conflicts) {
            const key = conflict.incomingPrompt.id || conflict.incomingPrompt.name
            const action = resolutions[key] || resolutions[conflict.incomingPrompt.name] || 'skip'
            if (conflict.isBuiltIn && action === 'replace') {
                throw new Error(`Cannot overwrite built-in prompt "${conflict.existingPrompt.name}". Choose "copy" or "skip".`)
            }
        }

        let importedCount = 0
        let skippedCount = 0

        await db.transaction('rw', [db.prompts, db.promptCategories], async () => {
            const now = Date.now()

            const categoryMap = new Map<string, string>()
            const allCats = await db.promptCategories.toArray()
            for (const cat of allCats) {
                categoryMap.set(cat.name.toLowerCase(), cat.id)
            }

            for (const cat of preview.categoriesToCreate) {
                const newCatId = uuidv4()
                await db.promptCategories.add({
                    id: newCatId,
                    novelId: targetNovelId,
                    name: cat.name,
                    sortOrder: cat.sortOrder || 10,
                    isSystem: false
                })
                categoryMap.set(cat.name.toLowerCase(), newCatId)
                if (cat.id) categoryMap.set(cat.id, newCatId)
            }

            let defaultCat = allCats.find(c => c.isSystem) || allCats[0]
            const defaultCatId = defaultCat ? defaultCat.id : uuidv4()

            const resolveCategoryId = (incoming: Prompt): string => {
                if (incoming.categoryId && categoryMap.has(incoming.categoryId)) {
                    return categoryMap.get(incoming.categoryId)!
                }
                return defaultCatId
            }

            for (const p of preview.promptsToAdd) {
                const newId = uuidv4()
                await db.prompts.add({
                    ...p,
                    id: newId,
                    novelId: targetNovelId || p.novelId,
                    categoryId: resolveCategoryId(p),
                    createdAt: now,
                    updatedAt: now
                })
                importedCount++
            }

            for (const conflict of preview.conflicts) {
                const incoming = conflict.incomingPrompt
                const key = incoming.id || incoming.name
                const action = resolutions[key] || resolutions[incoming.name] || 'skip'

                if (action === 'skip') {
                    skippedCount++
                } else if (action === 'copy') {
                    const newId = uuidv4()
                    await db.prompts.add({
                        ...incoming,
                        id: newId,
                        novelId: targetNovelId || incoming.novelId,
                        name: `${incoming.name} (Imported)`,
                        categoryId: resolveCategoryId(incoming),
                        isFavorite: false,
                        isTrashed: false,
                        createdAt: now,
                        updatedAt: now
                    })
                    importedCount++
                } else if (action === 'replace') {
                    if (conflict.isBuiltIn) {
                        throw new Error(`Cannot overwrite built-in prompt "${conflict.existingPrompt.name}".`)
                    }
                    await db.prompts.update(conflict.existingPrompt.id, {
                        ...incoming,
                        id: conflict.existingPrompt.id,
                        updatedAt: now
                    })
                    importedCount++
                }
            }
        })

        return { importedCount, skippedCount }
    }
}

export interface PromptPackageCategory {
    id: string;
    name: string;
    sortOrder?: number;
}

export interface PromptPackage {
    format: 'anansi-prompt-package';
    version: '1.0';
    createdAt: number;
    categories: PromptPackageCategory[];
    prompts: Prompt[];
}

export type ConflictResolution = 'skip' | 'copy' | 'replace';

export interface PromptImportConflict {
    incomingPrompt: Prompt;
    existingPrompt: Prompt;
    conflictType: 'name' | 'id';
    isBuiltIn: boolean;
}

export interface PromptImportPreview {
    isValid: boolean;
    error?: string;
    packageVersion?: string;
    promptsToAdd: Prompt[];
    conflicts: PromptImportConflict[];
    categoriesToCreate: PromptPackageCategory[];
}
