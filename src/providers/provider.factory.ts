import { LLMProvider } from "../interfaces/provider.interface.js";
import { GroqProvider } from "./groq.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { AnthropicProvider } from "./anthropic.provider.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export class LLMProviderFactory {
  /**
   * Instantiates an LLMProvider based on the provider name.
   * @param providerName Name of the provider (groq, openai, anthropic)
   * @param apiKey API key for the chosen provider
   * @param modelName Optional model name override
   */
  static create(
    providerName: string,
    apiKey: string,
    modelName?: string
  ): LLMProvider {
    const provider = providerName.toLowerCase();

    if (provider === "groq") {
      return new GroqProvider(apiKey, modelName);
    } else if (provider === "openai") {
      return new OpenAIProvider(apiKey, modelName);
    } else if (provider === "anthropic") {
      return new AnthropicProvider(apiKey, modelName);
    } else {
      throw new EnrichmentError(`Unsupported LLM provider: ${providerName}`);
    }
  }
}
