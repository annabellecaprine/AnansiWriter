import type { ProviderAdapter, AIRequestPayload, AIResponse } from './ProviderAdapter';

export class OpenRouterProvider implements ProviderAdapter {
    getProviderId(): string {
        return 'openrouter';
    }

    async generate(payload: AIRequestPayload, apiKey: string): Promise<AIResponse> {
        if (!apiKey) throw new Error("OpenRouter API missing. Ensure credentials are valid in settings.");

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // Headers ensuring proper identification for open router ecosystem mappings
                "HTTP-Referer": "https://github.com/annabellecaprine",
                "X-Title": "AnansiWriter IDE"
            },
            body: JSON.stringify({
                model: payload.modelId,
                temperature: payload.temperature,
                messages: payload.messages && payload.messages.length > 0 ? payload.messages : [
                    { role: "system", content: payload.systemInstruction },
                    { role: "user", content: payload.userPrompt }
                ]
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenRouter Request failed [${res.status}]: ${err}`);
        }

        const data = await res.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            totalTokens: data.usage?.total_tokens || 0,
            id: data.id || ''
        };
    }
}
