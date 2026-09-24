import type { ProviderAdapter, AIRequestPayload, AIResponse } from './ProviderAdapter';

/**
 * Chutes is an emerging decentralized/alternative AI routing provider.
 * Their structure emulates standard OpenAI paths but is tracked independently. 
 */
export class ChutesProvider implements ProviderAdapter {
    getProviderId(): string {
        return 'chutes';
    }

    async generate(payload: AIRequestPayload, apiKey: string): Promise<AIResponse> {
        if (!apiKey) throw new Error("Chutes API missing. Ensure credentials are valid in settings.");

        const res = await fetch("https://api.chutes.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: payload.modelId,
                temperature: payload.temperature,
                max_tokens: payload.maxTokens,
                messages: [
                    { role: "system", content: payload.systemInstruction },
                    { role: "user", content: payload.userPrompt }
                ]
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Chutes Request failed [${res.status}]: ${err}`);
        }

        const data = await res.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            totalTokens: data.usage?.total_tokens || 0,
            id: data.id || ''
        };
    }
}
