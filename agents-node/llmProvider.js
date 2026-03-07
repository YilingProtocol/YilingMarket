import OpenAI from "openai";

export class OpenAIProvider {
  constructor(model = "gpt-4o-mini", apiKey = null) {
    this.model = model;
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.providerName = `openai/${model}`;
  }

  async chat(systemPrompt, userPrompt) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  }
}

export function createLLMProvider(provider, model, apiKey) {
  provider = provider.toLowerCase();
  if (provider === "openai") {
    return new OpenAIProvider(model || "gpt-4o-mini", apiKey);
  }
  // Fallback to OpenAI for unsupported providers
  console.log(`[LLM] Provider '${provider}' not supported in Node.js build, using OpenAI`);
  return new OpenAIProvider(model || "gpt-4o-mini", apiKey);
}
