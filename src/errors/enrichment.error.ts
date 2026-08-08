import { SDKifyError } from "./sdkify.error.js";

export class EnrichmentError extends SDKifyError {
  constructor(message: string) {
    super(message);
    this.name = "EnrichmentError";
  }
}
