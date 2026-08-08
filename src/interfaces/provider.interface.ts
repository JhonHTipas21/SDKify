import { EnrichmentResult } from "./enricher.interface.js";

export interface LLMProvider {
  /**
   * Communicates with the specific LLM API (Groq, OpenAI, Anthropic, etc.)
   * to generate structured enrichment metadata.
   * @param prompt User prompt details
   */
  generateEnrichment(prompt: string): Promise<EnrichmentResult>;
}
