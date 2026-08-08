import { createClient } from "@hey-api/openapi-ts";
import { BaseGenerator, GeneratedCode } from "../interfaces/generator.interface.js";

export class HeyAPIGenerator implements BaseGenerator {
  /**
   * Generates type-safe client and SDK code into outputDir using HeyAPI.
   */
  async generate(specPath: string, outputDir: string): Promise<GeneratedCode> {
    try {
      // Run @hey-api/openapi-ts programmatically
      await createClient({
        input: specPath,
        output: outputDir,
        client: "@hey-api/client-fetch",
      });
      return { outputDir };
    } catch (error: any) {
      throw new Error(`HeyAPI code generation failed: ${error.stack || error.message}`);
    }
  }
}
