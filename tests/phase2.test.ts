import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SDKifyPipeline } from "../src/index.js";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "petstore.yaml");
const OUTPUT_DIR = path.join(__dirname, "output", "petstore-sdk-tested");

describe("Phase 2 - Automated Smoke Tests Generator", () => {
  beforeAll(() => {
    // Clear previous output if exists
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  it("should generate smoke.test.ts with MSW mock handlers and Vitest test cases", async () => {
    const pipeline = new SDKifyPipeline();
    await pipeline.run({
      specPath: FIXTURE_PATH,
      outputDir: OUTPUT_DIR,
      useAI: false, // Turn off AI to keep it fast
    });

    const smokeTestFile = path.join(OUTPUT_DIR, "tests", "smoke.test.ts");
    expect(fs.existsSync(smokeTestFile)).toBe(true);

    const smokeTestContent = fs.readFileSync(smokeTestFile, "utf-8");

    // Check imports
    expect(smokeTestContent).toContain("import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';");
    expect(smokeTestContent).toContain("import { setupServer } from 'msw/node';");
    expect(smokeTestContent).toContain("import { http, HttpResponse } from 'msw';");
    expect(smokeTestContent).toContain("import { client, getPetById, updatePetById } from '../src/index.js';");

    // Check MSW handlers
    expect(smokeTestContent).toContain("http.get('http://localhost/pets/:id'");
    expect(smokeTestContent).toContain("http.post('http://localhost/pets/:id'");
    expect(smokeTestContent).toContain("HttpResponse.json({ success: true, message:");

    // Check test cases
    expect(smokeTestContent).toContain("describe('SDK Smoke Tests'");
    expect(smokeTestContent).toContain("it('should successfully execute getPetById'");
    expect(smokeTestContent).toContain("it('should successfully execute updatePetById'");
  });
});
