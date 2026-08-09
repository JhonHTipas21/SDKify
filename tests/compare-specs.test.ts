import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import * as path from "path";

describe("OpenAPI Semantic Comparator", () => {
  const scriptPath = path.join(process.cwd(), "scripts", "compare-specs.ts");
  const petstoreBase = path.join(process.cwd(), "tests", "fixtures", "petstore.yaml");
  const petstoreBreaking = path.join(process.cwd(), "tests", "fixtures", "petstore_breaking.yaml");
  const petstoreNonBreaking = path.join(process.cwd(), "tests", "fixtures", "petstore_non_breaking.yaml");

  it("should return exit code 0 when there are no changes between identical specs", () => {
    let exitCode = 0;
    try {
      execSync(`npx tsx ${scriptPath} --old ${petstoreBase} --new ${petstoreBase}`);
    } catch (err: any) {
      exitCode = err.status;
    }
    expect(exitCode).toBe(0);
  });

  it("should return exit code 1 (breaking) when an endpoint/operation is removed", () => {
    let exitCode = 0;
    let stdout = "";
    try {
      stdout = execSync(`npx tsx ${scriptPath} --old ${petstoreBase} --new ${petstoreBreaking}`).toString();
    } catch (err: any) {
      exitCode = err.status;
      stdout = err.stdout.toString();
    }

    expect(exitCode).toBe(1);
    const report = JSON.parse(stdout);
    expect(report.breaking.length).toBeGreaterThan(0);
    expect(report.breaking[0].message).toContain("Operation 'getPetById' was removed");
  });

  it("should return exit code 2 (non-breaking) when description changes or a new endpoint is added", () => {
    let exitCode = 0;
    let stdout = "";
    try {
      stdout = execSync(`npx tsx ${scriptPath} --old ${petstoreBase} --new ${petstoreNonBreaking}`).toString();
    } catch (err: any) {
      exitCode = err.status;
      stdout = err.stdout.toString();
    }

    expect(exitCode).toBe(2);
    const report = JSON.parse(stdout);
    expect(report.breaking.length).toBe(0);
    expect(report.nonBreaking.length).toBeGreaterThan(0);
  });
});
