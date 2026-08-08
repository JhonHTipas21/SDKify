export interface GeneratedCode {
  outputDir: string;
}

export interface BaseGenerator {
  /**
   * Generates the baseline SDK files from a resolved OpenAPI specification.
   * @param specPath Path to the OpenAPI spec (already resolved or validated)
   * @param outputDir Target directory where the SDK client will be generated
   */
  generate(specPath: string, outputDir: string): Promise<GeneratedCode>;
}
