import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { ConfigReader } from "../src/config/config.reader.js";
import { SDKifyError } from "../src/errors/sdkify.error.js";

const TMP_DIR = path.join(import.meta.dirname, "output", "config-test");
const VALID_CONFIG_PATH = path.join(TMP_DIR, "sdkify.config.json");
const INVALID_CONFIG_PATH = path.join(TMP_DIR, "invalid.config.json");

describe("ConfigReader - Configuration File Parsing", () => {
  beforeAll(() => {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    // Write a valid config fixture
    fs.writeFileSync(
      VALID_CONFIG_PATH,
      JSON.stringify({
        spec: "./api.yaml",
        output: "./sdk-out",
        useAI: false,
        llmProvider: "openai",
        modelName: "gpt-4o-mini",
      }),
      "utf-8"
    );

    // Write an invalid config fixture (useAI is not boolean)
    fs.writeFileSync(
      INVALID_CONFIG_PATH,
      JSON.stringify({
        useAI: "yes",
      }),
      "utf-8"
    );
  });

  afterAll(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  it("should return an empty object when no config file is present at the default location", () => {
    // ConfigReader.read() with no arguments looks for sdkify.config.json in process.cwd().
    // In the test environment process.cwd() is /Users/jhonharveytipassolis/SDKify, which has no config file.
    const result = ConfigReader.read();
    expect(result).toEqual({});
  });

  it("should throw SDKifyError if an explicit config path does not exist", () => {
    expect(() => ConfigReader.read("/non-existent/path/to/sdkify.config.json")).toThrow(SDKifyError);
  });

  it("should parse a valid JSON config file", () => {
    const config = ConfigReader.read(VALID_CONFIG_PATH);
    expect(config.spec).toBe("./api.yaml");
    expect(config.output).toBe("./sdk-out");
    expect(config.useAI).toBe(false);
    expect(config.llmProvider).toBe("openai");
    expect(config.modelName).toBe("gpt-4o-mini");
  });

  it("should throw SDKifyError on invalid 'useAI' type in config", () => {
    expect(() => ConfigReader.read(INVALID_CONFIG_PATH)).toThrow(SDKifyError);
  });
});
