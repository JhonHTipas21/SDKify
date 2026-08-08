import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SDKifyPipeline } from "../src/index.js";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "petstore.yaml");
const OUTPUT_DIR = path.join(__dirname, "output", "petstore-sdk");

describe("Phase 0 - Deterministic Pipeline", () => {
  beforeAll(() => {
    // Clear previous output if exists
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  it("should successfully run the pipeline and generate SDK files", async () => {
    const pipeline = new SDKifyPipeline();
    await pipeline.run({
      specPath: FIXTURE_PATH,
      outputDir: OUTPUT_DIR,
    });

    // Check root files
    expect(fs.existsSync(path.join(OUTPUT_DIR, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, "README.md"))).toBe(true);

    // Read package.json to verify content
    const pkg = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, "package.json"), "utf-8"));
    expect(pkg.name).toBe("petstore-sdk");
    expect(pkg.version).toBe("1.0.4");
    expect(pkg.type).toBe("module");

    // Check src files
    const srcDir = path.join(OUTPUT_DIR, "src");
    expect(fs.existsSync(path.join(srcDir, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, "services.gen.ts"))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, "types.gen.ts"))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, "schemas.gen.ts"))).toBe(true);

    // Verify index.ts re-exports
    const indexContent = fs.readFileSync(path.join(srcDir, "index.ts"), "utf-8");
    expect(indexContent).toContain("export * from './services.gen';");
    expect(indexContent).toContain("export * from './types.gen';");
    expect(indexContent).toContain("export * from './schemas.gen';");
  }, 30000); // 30s timeout for HeyAPI codegen
});
