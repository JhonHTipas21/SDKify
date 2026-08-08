export interface EnrichmentResult {
  methodName?: string;
  description: string;
  example: string;
}

export interface AIEnricher {
  /**
   * Enriches an OpenAPI operation with business descriptions, idiomatic method names, and code examples.
   * @param endpointKey Unique identifier for the endpoint, e.g. "GET /pets/{petId}"
   * @param operationDetails OpenAPI operation definition details (parameters, responses, description, etc.)
   */
  enrichOperation(endpointKey: string, operationDetails: any): Promise<EnrichmentResult>;
}
