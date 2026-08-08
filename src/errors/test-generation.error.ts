import { SDKifyError } from "./sdkify.error.js";

export class TestGenerationError extends SDKifyError {
  constructor(message: string) {
    super(message);
    this.name = "TestGenerationError";
  }
}
