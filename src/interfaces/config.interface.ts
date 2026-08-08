export interface SDKConfig {
  /**
   * Path to the input OpenAPI specification file (YAML or JSON).
   */
  spec?: string;
  /**
   * Path to the target output directory where the SDK package will be written.
   */
  output?: string;
  /**
   * Toggles the AI enrichment layer on or off.
   */
  useAI?: boolean;
  /**
   * The LLM Provider to use (groq, openai, anthropic).
   */
  llmProvider?: string;
  /**
   * Optional name of the model to use on the selected provider.
   */
  modelName?: string;
  /**
   * Optional API key to override environment variables.
   */
  apiKey?: string;
  /**
   * Optional custom location for the .sdkify-cache.json file.
   */
  cacheFilePath?: string;
}
