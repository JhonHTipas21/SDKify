import { LLMProvider } from "../interfaces/provider.interface.js";
import { EnrichmentResult } from "../interfaces/enricher.interface.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * Generates enrichment using the OpenAI API.
   */
  async generateEnrichment(prompt: string): Promise<EnrichmentResult> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: "You are a professional devtools engineer who designs premium, clean, idiomatic SDKs. You must output JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new EnrichmentError(`OpenAI API responded with status ${response.status}: ${errText}`);
      }

      const payload = (await response.json()) as any;
      const rawResponse = payload.choices?.[0]?.message?.content || "{}";

      let parsed: any;
      try {
        parsed = JSON.parse(rawResponse);
      } catch (jsonErr: any) {
        throw new EnrichmentError(`Invalid JSON response from OpenAI LLM: ${jsonErr.message}`);
      }

      return {
        methodName: parsed.methodName,
        description: parsed.description || "No description provided.",
        example: parsed.example || "// Example not available",
      };
    } catch (error: any) {
      if (error instanceof EnrichmentError) throw error;
      throw new EnrichmentError(`OpenAI API request failed: ${error.message}`);
    }
  }
}
