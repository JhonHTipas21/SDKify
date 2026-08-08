import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import Groq from "groq-sdk";
import { AIEnricher, EnrichmentResult } from "../interfaces/enricher.interface.js";
import { EnrichmentError } from "../errors/enrichment.error.js";

export interface GroqEnricherOptions {
  apiKey?: string;
  modelName?: string;
  cacheFilePath?: string;
}

export class GroqEnricher implements AIEnricher {
  private groq: Groq | null = null;
  private modelName: string;
  private cacheFilePath: string;
  private cache: Record<string, EnrichmentResult> = {};

  constructor(options: GroqEnricherOptions = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    this.modelName = options.modelName || "llama3-70b-8192";
    this.cacheFilePath = options.cacheFilePath || path.join(process.cwd(), ".sdkify-cache.json");

    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }

    this.loadCache();
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
   * Enriches an operation using the Groq API (or reading from cache).
   */
  async enrichOperation(endpointKey: string, operationDetails: any): Promise<EnrichmentResult> {
    const hash = this.computeHash(operationDetails);

    // 1. Check cache first
    if (this.cache[hash]) {
      // console.log(`[SDKify] Cache hit for operation: ${endpointKey}`);
      return this.cache[hash];
    }

    // If Groq is not configured, fallback to basic determinism
    if (!this.groq) {
      const fallback = this.generateFallback(endpointKey, operationDetails);
      this.cache[hash] = fallback;
      this.saveCache();
      return fallback;
    }

    console.log(`[SDKify] Cache miss. Querying LLM for: ${endpointKey}...`);

    const prompt = this.buildPrompt(endpointKey, operationDetails);

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
        throw new EnrichmentError(`Invalid JSON response from LLM: ${jsonErr.message}`);
      }

      const result: EnrichmentResult = {
        methodName: parsed.methodName || operationDetails.operationId || undefined,
        description: parsed.description || operationDetails.summary || "No description provided.",
        example: parsed.example || `// Example not available`,
      };

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
    // Clean original name if it contains characters like _ or -
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
