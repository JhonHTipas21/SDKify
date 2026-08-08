import { SDKifyError } from "./sdkify.error.js";

export class SpecValidationError extends SDKifyError {
  constructor(message: string) {
    super(message);
    this.name = "SpecValidationError";
  }
}
