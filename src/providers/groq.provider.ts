import Groq from "groq-sdk";
import { LLMProvider } from "../interfaces/provider.interface.js";
import { EnrichmentResult } from "../interfaces/enricher.interface.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export class GroqProvider implements LLMProvider {
  private groq: Groq;
  private modelName: string;

  constructor(apiKey: string, modelName = "llama3-70b-8192") {
    this.groq = new Groq({ apiKey });
    this.modelName = modelName;
  }

  /**
   * Generates enrichment using the Groq API.
   */
  async generateEnrichment(prompt: string): Promise<EnrichmentResult> {
    try {
      const chatCompletion = await this.groq.chat.completions.create({
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
        model: this.modelName,
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const rawResponse = chatCompletion.choices[0]?.message?.content || "{}";
      
      let parsed: any;
      try {
        parsed = JSON.parse(rawResponse);
      } catch (jsonErr: any) {
        throw new EnrichmentError(`Invalid JSON response from Groq LLM: ${jsonErr.message}`);
      }

      return {
        methodName: parsed.methodName,
        description: parsed.description || "No description provided.",
        example: parsed.example || "// Example not available",
      };
    } catch (error: any) {
      if (error instanceof EnrichmentError) throw error;
      throw new EnrichmentError(`Groq API request failed: ${error.message}`);
    }
  }
}
