import { LLMProvider } from "../interfaces/provider.interface.js";
import { EnrichmentResult } from "../interfaces/enricher.interface.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName = "claude-3-5-sonnet-20240620") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * Generates enrichment using the Anthropic API.
   */
  async generateEnrichment(prompt: string): Promise<EnrichmentResult> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: 1024,
          system: "You are a professional devtools engineer who designs premium, clean, idiomatic SDKs. You must output JSON only.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new EnrichmentError(`Anthropic API responded with status ${response.status}: ${errText}`);
      }

      const payload = (await response.json()) as any;
      // Anthropic returns content as an array of content blocks
      const rawResponse = payload.content?.[0]?.text || "{}";

      let parsed: any;
      try {
        parsed = JSON.parse(rawResponse);
      } catch (jsonErr: any) {
        throw new EnrichmentError(`Invalid JSON response from Anthropic LLM: ${jsonErr.message}`);
      }

      return {
        methodName: parsed.methodName,
        description: parsed.description || "No description provided.",
        example: parsed.example || "// Example not available",
      };
    } catch (error: any) {
      if (error instanceof EnrichmentError) throw error;
      throw new EnrichmentError(`Anthropic API request failed: ${error.message}`);
    }
  }
}
