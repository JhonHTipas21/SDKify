import { SDKifyError } from "./sdkify.error.js";

export class GenerationError extends SDKifyError {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}
