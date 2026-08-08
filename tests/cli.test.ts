import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const CLI_JS = path.join(__dirname, "..", "dist", "cli", "index.js");
const FIXTURE_PATH = path.join(__dirname, "fixtures", "petstore.yaml");
const OUTPUT_DIR = path.join(__dirname, "output", "cli-sdk");

describe("Phase 3 - CLI Executable integration", () => {
  beforeAll(() => {
    // Clear previous output if exists
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    
    // Compile TypeScript files to dist
    const rootDir = path.join(__dirname, "..");
    execSync("npx tsc", { cwd: rootDir });
  });

  it("should generate SDK successfully when executing compiled CLI", () => {
    const cmd = `node ${CLI_JS} -s ${FIXTURE_PATH} -o ${OUTPUT_DIR} --no-ai`;
    
    // Execute command
    const output = execSync(cmd, { encoding: "utf-8" });
    
    // Check console logs
    expect(output).toContain("[SDKify] Starting generation pipeline");
    expect(output).toContain("[SDKify] Pipeline completed successfully");
    expect(output).toContain("Success! Your SDK is ready.");

    // Verify output files are present
    expect(fs.existsSync(path.join(OUTPUT_DIR, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, "src", "services.gen.ts"))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, "tests", "smoke.test.ts"))).toBe(true);
  });
});
