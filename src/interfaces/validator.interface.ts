export interface SpecValidator {
  /**
   * Validates the spec file and returns the dereferenced/resolved JSON spec object.
   * Throws an error if the spec is invalid or does not exist.
   * @param specPath Path to the OpenAPI spec (JSON or YAML)
   */
  validate(specPath: string): Promise<any>;
}
