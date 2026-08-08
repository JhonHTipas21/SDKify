import { describe, it, expect } from "vitest";
import { SDKifyError } from "../src/errors/sdkify.error.js";
import { SpecValidationError } from "../src/errors/spec-validation.error.js";
import { GenerationError } from "../src/errors/generation.error.js";
import { EnrichmentError } from "../src/errors/enrichment.error.js";
import { TestGenerationError } from "../src/errors/test-generation.error.js";

describe("Custom Exceptions and Error Handling", () => {
  it("should preserve error inheritance and stack traces", () => {
    const message = "Custom error occurred";
    
    const baseError = new SDKifyError(message);
    const valError = new SpecValidationError(message);
    const genError = new GenerationError(message);
    const enrError = new EnrichmentError(message);
    const testGenError = new TestGenerationError(message);

    expect(baseError).toBeInstanceOf(Error);
    expect(baseError.name).toBe("SDKifyError");

    expect(valError).toBeInstanceOf(SDKifyError);
    expect(valError.name).toBe("SpecValidationError");

    expect(genError).toBeInstanceOf(SDKifyError);
    expect(genError.name).toBe("GenerationError");

    expect(enrError).toBeInstanceOf(SDKifyError);
    expect(enrError.name).toBe("EnrichmentError");

    expect(testGenError).toBeInstanceOf(SDKifyError);
    expect(testGenError.name).toBe("TestGenerationError");
  });

  it("should support catching all custom subclasses polymorphically", () => {
    const trigger = (type: string) => {
      if (type === "val") throw new SpecValidationError("Validation failed");
      if (type === "gen") throw new GenerationError("Generation failed");
      throw new Error("Generic failure");
    };

    try {
      trigger("val");
    } catch (err: any) {
      expect(err).toBeInstanceOf(SDKifyError);
      expect(err).toBeInstanceOf(SpecValidationError);
      expect(err.message).toBe("Validation failed");
    }

    try {
      trigger("gen");
    } catch (err: any) {
      expect(err).toBeInstanceOf(SDKifyError);
      expect(err).toBeInstanceOf(GenerationError);
      expect(err.message).toBe("Generation failed");
    }
  });
});
