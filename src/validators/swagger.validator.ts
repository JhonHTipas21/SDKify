import SwaggerParser from "@apidevtools/swagger-parser";
import { SpecValidator } from "../interfaces/validator.interface.js";

export class SwaggerSpecValidator implements SpecValidator {
  /**
   * Validates and dereferences the OpenAPI spec.
   * Throws a clear, descriptive error if validation fails.
   */
  async validate(specPath: string): Promise<any> {
    try {
      // SwaggerParser.validate validates the API against the OpenAPI schema 
      // AND resolves all external / internal $ref pointers.
      const resolvedSpec = await SwaggerParser.validate(specPath);
      return resolvedSpec;
    } catch (error: any) {
      throw new Error(`OpenAPI specification validation failed: ${error.message}`);
    }
  }
}
