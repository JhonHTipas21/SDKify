export class SDKifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SDKifyError";
    // Fix call stack tracing and prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
