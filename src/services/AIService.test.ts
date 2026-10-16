import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIService } from './AIService'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '../db/schema'

describe('AIService — Inference settings and history fidelity (AW-03)', () => {
    const novelId = uuidv4()

    beforeEach(async () => {
        await db.aiRequestHistory.clear()
        await db.appSettings.clear()
        vi.restoreAllMocks()
    })

    it('sends prompt-configured temperature and maxOutputTokens and logs them accurately', async () => {
        const mockPrompt: Prompt = {
            id: uuidv4(),
            scope: 'global',
            categoryId: uuidv4(),
            name: 'Creative Prose',
            tags: [],
            description: 'Test',
            outputMode: 'chat',
            defaultModel: 'gpt-4o-mini',
            allowedModels: [],
            temperature: 0.95, // Non-default
            maxOutputTokens: 4096, // Non-default
            tokenBudget: 35000,
            systemInstruction: 'Be creative.',
            userTemplate: 'Write a story.',
            applicableFields: ['prose'],
            presets: [],
            contextRecipe: [],
            inputs: [],
            isFavorite: false,
            isEnabled: true,
            isTrashed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        // Mock adapter
        const mockAdapter = {
            getProviderId: () => 'openai-compatible',
            generate: vi.fn().mockResolvedValue({
                content: 'Once upon a time...',
                totalTokens: 120,
                id: 'mock-response-id'
            })
        }
        vi.spyOn(AIService, 'getProviderAdapter').mockReturnValue(mockAdapter as any)

        const result = await AIService.generate(
            novelId,
            'Be creative.',
            'Write a story.',
            'gpt-4o-mini',
            'openai-compatible',
            undefined,
            mockPrompt
        )

        expect(result).toBe('Once upon a time...')

        // 1. Verify payload passed to provider adapter
        expect(mockAdapter.generate).toHaveBeenCalledTimes(1)
        const payloadSent = mockAdapter.generate.mock.calls[0][0]
        expect(payloadSent.temperature).toBe(0.95)
        expect(payloadSent.maxTokens).toBe(4096)

        // 2. Verify request history row
        const history = await db.aiRequestHistory.where({ novelId }).toArray()
        expect(history.length).toBe(1)
        expect(history[0].executionMetadata?.temperatureUsed).toBe(0.95)
        expect(history[0].executionMetadata?.maxTokensUsed).toBe(4096)
        expect(history[0].promptName).toBe('Creative Prose')
        expect(history[0].executedPromptSnapshot).toBeDefined()
    })

    it('prioritizes call-level overrides over Prompt configuration defaults', async () => {
        const mockPrompt: Prompt = {
            id: uuidv4(),
            scope: 'global',
            categoryId: uuidv4(),
            name: 'Rigid Prompt',
            tags: [],
            description: 'Test',
            outputMode: 'chat',
            defaultModel: 'gpt-4o-mini',
            allowedModels: [],
            temperature: 0.2,
            maxOutputTokens: 1000,
            tokenBudget: 35000,
            systemInstruction: 'Strict.',
            userTemplate: 'Evaluate.',
            applicableFields: ['prose'],
            presets: [],
            contextRecipe: [],
            inputs: [],
            isFavorite: false,
            isEnabled: true,
            isTrashed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        const mockAdapter = {
            getProviderId: () => 'openai-compatible',
            generate: vi.fn().mockResolvedValue({
                content: 'Overridden result',
                totalTokens: 50,
                id: 'resp-id'
            })
        }
        vi.spyOn(AIService, 'getProviderAdapter').mockReturnValue(mockAdapter as any)

        // Call with explicit call-level overrides (temp = 0.85, maxTokens = 500)
        await AIService.generate(
            novelId,
            'Strict.',
            'Evaluate.',
            'gpt-4o-mini',
            'openai-compatible',
            undefined,
            mockPrompt,
            undefined,
            undefined,
            0.85, // Call-level override
            500   // Call-level override
        )

        const payloadSent = mockAdapter.generate.mock.calls[0][0]
        expect(payloadSent.temperature).toBe(0.85)
        expect(payloadSent.maxTokens).toBe(500)

        const history = await db.aiRequestHistory.where({ novelId }).toArray()
        expect(history[0].executionMetadata?.temperatureUsed).toBe(0.85)
        expect(history[0].executionMetadata?.maxTokensUsed).toBe(500)
    })

    it('records explicit applied defaults without fabricating Prompt snapshot for Staging invocations', async () => {
        const mockAdapter = {
            getProviderId: () => 'openai-compatible',
            generate: vi.fn().mockResolvedValue({
                content: 'Staging response',
                totalTokens: 80,
                id: 'resp-id-staging'
            })
        }
        vi.spyOn(AIService, 'getProviderAdapter').mockReturnValue(mockAdapter as any)

        // Staging invocation without executedPromptSnapshot
        await AIService.generate(
            novelId,
            'Interview prompt',
            'Hello character',
            'gpt-4o-mini',
            'openai-compatible'
        )

        const payloadSent = mockAdapter.generate.mock.calls[0][0]
        expect(payloadSent.temperature).toBe(0.7) // Default provider temp
        expect(payloadSent.maxTokens).toBe(2000)   // Default max tokens

        const history = await db.aiRequestHistory.where({ novelId }).toArray()
        expect(history[0].promptName).toBe('Staging Invocation')
        expect(history[0].executedPromptSnapshot).toBeUndefined()
        expect(history[0].executionMetadata?.temperatureUsed).toBe(0.7)
        expect(history[0].executionMetadata?.maxTokensUsed).toBe(2000)
    })
})
