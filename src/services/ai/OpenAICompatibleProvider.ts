import type { ProviderAdapter, AIRequestPayload, AIResponse } from './ProviderAdapter';

export class OpenAICompatibleProvider implements ProviderAdapter {
    getProviderId(): string {
        return 'openai-compatible'
    }

    async generate(payload: AIRequestPayload, apiKey: string): Promise<AIResponse> {

        const baseUrl = payload.baseUrl || 'http://localhost:1234/v1'
        const endpoint = baseUrl.endsWith('/chat/completions')
            ? baseUrl
            : `${baseUrl.replace(/\/$/, '')}/chat/completions`

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
                model: payload.modelId,
                messages: payload.messages && payload.messages.length > 0 ? payload.messages : [
                    { role: "system", content: payload.systemInstruction },
                    { role: "user", content: payload.userPrompt }
                ],
                temperature: payload.temperature,
                max_tokens: payload.maxTokens,
                top_p: 1
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI Compatible API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.text
            || data.message?.content
            || data.response
            || "";

        if (!content && data.choices?.length === 0) {
            throw new Error(`OpenAI Compatible API returned empty choices. Raw: ${JSON.stringify(data).substring(0, 800)}`);
        }



        return {
            content: content,
            totalTokens: data.usage?.total_tokens || 0,
            id: data.id || crypto.randomUUID()
        };
    }
}
