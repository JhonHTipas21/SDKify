import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { AIEnricher, EnrichmentResult } from "../interfaces/enricher.interface.js";
import { LLMProvider } from "../interfaces/provider.interface.js";
import { LLMProviderFactory } from "../providers/provider.factory.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export interface LLMEnricherOptions {
  providerName?: string;
  apiKey?: string;
  modelName?: string;
  cacheFilePath?: string;
}

export class LLMEnricher implements AIEnricher {
  private provider: LLMProvider | null = null;
  private cacheFilePath: string;
  private cache: Record<string, EnrichmentResult> = {};

  constructor(options: LLMEnricherOptions = {}) {
    const providerName = options.providerName || process.env.SDKIFY_PROVIDER || "groq";
    const apiKey = options.apiKey || this.getApiKeyForProvider(providerName);
    this.cacheFilePath = options.cacheFilePath || path.join(process.cwd(), ".sdkify-cache.json");

    if (apiKey) {
      this.provider = LLMProviderFactory.create(providerName, apiKey, options.modelName);
    }

    this.loadCache();
  }

  /**
   * Helper to retrieve appropriate env variable for the chosen provider.
   */
  private getApiKeyForProvider(providerName: string): string | undefined {
    const name = providerName.toLowerCase();
    if (name === "groq") return process.env.GROQ_API_KEY;
    if (name === "openai") return process.env.OPENAI_API_KEY;
    if (name === "anthropic") return process.env.ANTHROPIC_API_KEY;
    return undefined;
  }

  /**
   * Load cache from disk.
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const fileContent = fs.readFileSync(this.cacheFilePath, "utf-8");
        this.cache = JSON.parse(fileContent);
      }
    } catch (error) {
      console.warn(`[SDKify] Warning: Failed to load cache file: ${(error as Error).message}`);
    }
  }

  /**
   * Save cache to disk.
   */
  private saveCache(): void {
    try {
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2), "utf-8");
    } catch (error) {
      console.warn(`[SDKify] Warning: Failed to save cache file: ${(error as Error).message}`);
    }
  }

  /**
   * Computes SHA-256 hash of operation details.
   */
  private computeHash(operationDetails: any): string {
    const serialized = JSON.stringify(operationDetails);
    return crypto.createHash("sha256").update(serialized).digest("hex");
  }

  /**
   * Enriches an OpenAPI operation using the configured LLM provider.
   */
  async enrichOperation(endpointKey: string, operationDetails: any): Promise<EnrichmentResult> {
    const hash = this.computeHash(operationDetails);

    // 1. Check cache first
    if (this.cache[hash]) {
      return this.cache[hash];
    }

    // Fallback to deterministic generation if no provider is configured
    if (!this.provider) {
      const fallback = this.generateFallback(endpointKey, operationDetails);
      this.cache[hash] = fallback;
      this.saveCache();
      return fallback;
    }

    console.log(`[SDKify] Cache miss. Querying LLM for: ${endpointKey}...`);
    const prompt = this.buildPrompt(endpointKey, operationDetails);

    try {
      // Delegate to the pluggable LLM provider
      const result = await this.provider.generateEnrichment(prompt);

      // Set fallback methodName if LLM returned nothing or invalid string
      if (!result.methodName) {
        result.methodName = operationDetails.operationId || this.deriveMethodNameFromEndpoint(endpointKey);
      }

      // 2. Save to cache
      this.cache[hash] = result;
      this.saveCache();

      return result;
    } catch (error) {
      console.warn(`[SDKify] Warning: LLM query failed for ${endpointKey}: ${(error as Error).message}. Using fallback.`);
      const fallback = this.generateFallback(endpointKey, operationDetails);
      return fallback;
    }
  }

  /**
   * Generates a fallback when LLM is unavailable.
   */
  private generateFallback(endpointKey: string, operationDetails: any): EnrichmentResult {
    const originalName = operationDetails.operationId || "";
    const cleanName = originalName
      ? originalName.replace(/[^a-zA-Z0-9]/g, "")
      : this.deriveMethodNameFromEndpoint(endpointKey);

    return {
      methodName: cleanName,
      description: operationDetails.summary || operationDetails.description || `Endpoint ${endpointKey}`,
      example: `// Fallback example for calling the ${cleanName} SDK method
const { data, error } = await ${cleanName}({
  // Provide parameters here
});`,
    };
  }

  /**
   * Derives camelCase method name from HTTP method and path.
   * e.g. "GET /pets/{id}" -> "getPetsById"
   */
  private deriveMethodNameFromEndpoint(endpointKey: string): string {
    const [method, pathStr] = endpointKey.split(" ");
    if (!pathStr) return "request";

    const pathParts = pathStr
      .split("/")
      .filter((part) => part && !part.startsWith("{"));
    const pathName = pathParts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const hasParam = pathStr.includes("{");
    const suffix = hasParam ? "ById" : "";

    return `${method.toLowerCase()}${pathName}${suffix}`;
  }

  /**
   * Builds the prompt for the LLM.
   */
  private buildPrompt(endpointKey: string, operationDetails: any): string {
    const originalName = operationDetails.operationId || "";
    return `Given the following OpenAPI endpoint details:
Endpoint: ${endpointKey}
Original OperationId: ${originalName}
Summary: ${operationDetails.summary || ""}
Description: ${operationDetails.description || ""}
Parameters: ${JSON.stringify(operationDetails.parameters || [])}
RequestBody: ${JSON.stringify(operationDetails.requestBody || {})}

Please generate an enrichment result for a TypeScript SDK client.
Your output must be a JSON object matching this schema:
{
  "methodName": "A clean, camelCase, highly idiomatic TypeScript function name (e.g. 'getPet' instead of 'getPetById' or 'petGet')",
  "description": "A clear, professional JSDoc description focused on what this method does from a business logic perspective",
  "example": "A realistic code block demonstrating how to import and call this method in TypeScript, using the methodName and passing mock values for parameters if any. Keep it clean and short, e.g. \\nconst { data, error } = await methodName({ path: { id: 123 } });"
}

Do not include any explanation or markdown formatting, output JSON only.`;
  }
}
