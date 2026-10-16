import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/database'
import { PromptService } from './PromptService'
import type { Prompt, PromptCategory } from '../db/schema'

describe('PromptService — Versioned Prompt Packages (AW-08)', () => {
    const novelId = 'test-prompt-novel'

    beforeEach(async () => {
        await db.prompts.clear()
        await db.promptCategories.clear()

        // Seed a built-in category & prompt
        await db.promptCategories.add({
            id: 'cat-builtin',
            name: 'Built-ins',
            sortOrder: 0,
            isSystem: true
        })

        await db.prompts.add({
            id: 'prompt-expand',
            scope: 'built-in',
            categoryId: 'cat-builtin',
            name: 'Expand',
            tags: ['creative'],
            description: 'Built-in expand prompt',
            outputMode: 'chat',
            defaultModel: 'anthropic/claude-3-haiku',
            allowedModels: [],
            temperature: 0.7,
            maxOutputTokens: 2000,
            tokenBudget: 35000,
            systemInstruction: 'Expand the prose cleanly.',
            userTemplate: '{{content}}',
            applicableFields: ['prose'],
            presets: [],
            contextRecipe: [],
            inputs: [],
            isFavorite: true,
            isEnabled: true,
            isTrashed: false,
            createdAt: 100,
            updatedAt: 100
        })
    })

    it('exports prompts into a versioned envelope containing categories and prompt records', async () => {
        // Create custom prompt
        const customPromptId = await PromptService.createPrompt(
            'Dialogue Polisher',
            'cat-builtin',
            'novel',
            novelId
        )

        const json = await PromptService.exportPrompts([customPromptId])
        const parsed = JSON.parse(json)

        expect(parsed.format).toBe('anansi-prompt-package')
        expect(parsed.version).toBe('1.0')
        expect(Array.isArray(parsed.categories)).toBe(true)
        expect(Array.isArray(parsed.prompts)).toBe(true)
        expect(parsed.prompts.length).toBe(1)
        expect(parsed.prompts[0].name).toBe('Dialogue Polisher')
    })

    it('rejects malformed, unsupported version, or invalid JSON during preview', async () => {
        const previewBadJson = await PromptService.previewImportPackage('{ bad json')
        expect(previewBadJson.isValid).toBe(false)
        expect(previewBadJson.error).toContain('Invalid JSON')

        const previewWrongFormat = await PromptService.previewImportPackage(JSON.stringify({ format: 'other-app' }))
        expect(previewWrongFormat.isValid).toBe(false)
        expect(previewWrongFormat.error).toContain('Unsupported package format')

        const previewWrongVersion = await PromptService.previewImportPackage(JSON.stringify({
            format: 'anansi-prompt-package',
            version: '2.0',
            prompts: []
        }))
        expect(previewWrongVersion.isValid).toBe(false)
        expect(previewWrongVersion.error).toContain('version "2.0"')
    })

    it('detects conflicts against existing prompts and flags built-in collision', async () => {
        const packageJson = JSON.stringify({
            format: 'anansi-prompt-package',
            version: '1.0',
            categories: [{ id: 'cat-new', name: 'Worldbuilding', sortOrder: 5 }],
            prompts: [
                {
                    id: 'prompt-new-1',
                    name: 'Faction Generator',
                    scope: 'novel',
                    categoryId: 'cat-new',
                    tags: [],
                    description: 'Generates factions',
                    outputMode: 'chat',
                    defaultModel: 'anthropic/claude-3-haiku',
                    allowedModels: [],
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    tokenBudget: 35000,
                    systemInstruction: 'Generate faction details.',
                    userTemplate: '{{prompt}}',
                    applicableFields: [],
                    presets: [],
                    contextRecipe: [],
                    inputs: [],
                    isFavorite: false,
                    isEnabled: true,
                    isTrashed: false
                },
                {
                    id: 'prompt-expand-duplicate',
                    name: 'Expand', // Collides with built-in Expand!
                    scope: 'novel',
                    categoryId: 'cat-new',
                    tags: [],
                    description: 'Malicious or accidental overwrite attempt',
                    outputMode: 'chat',
                    defaultModel: 'anthropic/claude-3-haiku',
                    allowedModels: [],
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    tokenBudget: 35000,
                    systemInstruction: 'Overwritten prompt',
                    userTemplate: '{{prompt}}',
                    applicableFields: [],
                    presets: [],
                    contextRecipe: [],
                    inputs: [],
                    isFavorite: false,
                    isEnabled: true,
                    isTrashed: false
                }
            ]
        })

        const preview = await PromptService.previewImportPackage(packageJson, novelId)
        expect(preview.isValid).toBe(true)
        expect(preview.promptsToAdd.length).toBe(1)
        expect(preview.promptsToAdd[0].name).toBe('Faction Generator')
        expect(preview.categoriesToCreate.length).toBe(1)
        expect(preview.categoriesToCreate[0].name).toBe('Worldbuilding')

        expect(preview.conflicts.length).toBe(1)
        expect(preview.conflicts[0].existingPrompt.name).toBe('Expand')
        expect(preview.conflicts[0].isBuiltIn).toBe(true)
    })

    it('strictly forbids replacing built-in prompts', async () => {
        const packageJson = JSON.stringify({
            format: 'anansi-prompt-package',
            version: '1.0',
            categories: [],
            prompts: [
                {
                    id: 'prompt-expand',
                    name: 'Expand',
                    scope: 'novel',
                    categoryId: 'cat-builtin',
                    systemInstruction: 'Overwritten',
                    userTemplate: '{{content}}',
                    inputs: []
                }
            ]
        })

        const preview = await PromptService.previewImportPackage(packageJson)
        expect(preview.conflicts.length).toBe(1)
        expect(preview.conflicts[0].isBuiltIn).toBe(true)

        // Attempting to replace a built-in prompt must reject!
        await expect(PromptService.commitImportPackage(preview, {
            'Expand': 'replace'
        })).rejects.toThrow('Cannot overwrite built-in prompt')

        // Built-in prompt remains untouched
        const builtIn = await db.prompts.get('prompt-expand')
        expect(builtIn?.systemInstruction).toBe('Expand the prose cleanly.')
    })

    it('commits imports transactionally with copy or skip conflict resolutions', async () => {
        const packageJson = JSON.stringify({
            format: 'anansi-prompt-package',
            version: '1.0',
            categories: [{ id: 'cat-char', name: 'Characters', sortOrder: 2 }],
            prompts: [
                {
                    id: 'p-new',
                    name: 'Backstory Generator',
                    scope: 'novel',
                    categoryId: 'cat-char',
                    systemInstruction: 'Generate backstory',
                    userTemplate: '{{name}}',
                    inputs: []
                },
                {
                    id: 'p-conflict',
                    name: 'Expand',
                    scope: 'novel',
                    categoryId: 'cat-char',
                    systemInstruction: 'Alternative expand',
                    userTemplate: '{{content}}',
                    inputs: []
                }
            ]
        })

        const preview = await PromptService.previewImportPackage(packageJson, novelId)

        // Resolve conflict as 'copy'
        const result = await PromptService.commitImportPackage(preview, {
            'Expand': 'copy'
        }, novelId)

        expect(result.importedCount).toBe(2)
        expect(result.skippedCount).toBe(0)

        // Verify category was created
        const cats = await db.promptCategories.toArray()
        expect(cats.some(c => c.name === 'Characters')).toBe(true)

        // Verify new prompt was added
        const allPrompts = await db.prompts.toArray()
        expect(allPrompts.some(p => p.name === 'Backstory Generator')).toBe(true)

        // Verify copy was created
        expect(allPrompts.some(p => p.name === 'Expand (Imported)')).toBe(true)

        // Verify built-in remains unchanged
        const builtIn = await db.prompts.get('prompt-expand')
        expect(builtIn?.systemInstruction).toBe('Expand the prose cleanly.')
    })
})
