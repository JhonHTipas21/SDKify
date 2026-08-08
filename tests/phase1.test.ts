import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SDKifyPipeline } from "../src/index.js";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "petstore.yaml");
const OUTPUT_DIR = path.join(__dirname, "output", "petstore-sdk-enriched");
const CACHE_FILE = path.join(OUTPUT_DIR, ".sdkify-cache.json");

describe("Phase 1 - AI Enrichment Layer & AST Postprocessing", () => {
  beforeAll(() => {
    // Clear previous output if exists
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  it("should enrich services.gen.ts using fallback values when no Groq key is present", async () => {
    const pipeline = new SDKifyPipeline();
    
    // Run pipeline with AI enabled but no API key (should trigger fallback)
    await pipeline.run({
      specPath: FIXTURE_PATH,
      outputDir: OUTPUT_DIR,
      useAI: true,
      groqApiKey: "", // Empty to force fallback
    });

    const servicesFile = path.join(OUTPUT_DIR, "src", "services.gen.ts");
    expect(fs.existsSync(servicesFile)).toBe(true);

    const servicesContent = fs.readFileSync(servicesFile, "utf-8");

    // 1. Verify renaming:
    // Original operationId was getPetById, fallback cleans it or leaves it if clean.
    // Let's verify getPetById is present in services.gen.ts (it shouldn't crash).
    expect(servicesContent).toContain("export const getPetById");
    expect(servicesContent).toContain("export const updatePetById");

    // 2. Verify JSDoc and @example injection:
    expect(servicesContent).toContain("* @example");
    expect(servicesContent).toContain("Fallback example for calling");
    expect(servicesContent).toContain("const { data, error } = await getPetById");

    // 3. Verify that the cache file was generated
    expect(fs.existsSync(CACHE_FILE)).toBe(false); // Wait, cacheFilePath is process.cwd()/.sdkify-cache.json by default.
    // Let's check process.cwd()/.sdkify-cache.json
    const globalCachePath = path.join(process.cwd(), ".sdkify-cache.json");
    expect(fs.existsSync(globalCachePath)).toBe(true);
    
    // Cleanup global cache file after test
    if (fs.existsSync(globalCachePath)) {
      fs.rmSync(globalCachePath);
    }
  }, 30000);
});
