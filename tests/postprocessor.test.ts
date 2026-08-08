import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { ASTPostprocessor } from "../src/postprocessor/ast.postprocessor.js";
import { AIEnricher, EnrichmentResult } from "../src/interfaces/enricher.interface.js";

const FIXTURE_DIR = path.join(__dirname, "fixtures");
const OUTPUT_DIR = path.join(__dirname, "output", "postprocessor-test");

class MockEnricher implements AIEnricher {
  async enrichOperation(endpointKey: string, operationDetails: any): Promise<EnrichmentResult> {
    if (endpointKey === "GET /pets/{id}") {
      return {
        methodName: "fetchPet",
        description: "Fetch a pet by its unique identifier.",
        example: "const { data } = await fetchPet({ path: { id: 45 } });",
      };
    }
    return {
      methodName: "updatePet",
      description: "Update details of an existing pet.",
      example: "const { data } = await updatePet({ path: { id: 45 }, body: { name: 'Fido' } });",
    };
  }
}

describe("ASTPostprocessor - Method Renaming", () => {
  it("should rename getPetById to fetchPet using ts-morph", async () => {
    // 1. Create a dummy services.gen.ts in the output directory
    const srcDir = path.join(OUTPUT_DIR, "src");
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
    
    const initialCode = `// This file is auto-generated
import { client } from './client';
export const getPetById = (options) => {
    return client.get({
        ...options,
        url: '/pets/{id}'
    });
};
export const updatePetById = (options) => {
    return client.post({
        ...options,
        url: '/pets/{id}'
    });
};
`;
    const servicesFilePath = path.join(srcDir, "services.gen.ts");
    fs.writeFileSync(servicesFilePath, initialCode, "utf-8");

    // 2. Set up resolved spec
    const resolvedSpec = {
      paths: {
        "/pets/{id}": {
          get: {
            operationId: "getPetById",
          },
          post: {
            operationId: "updatePetById",
          },
        },
      },
    };

    // 3. Run postprocessor
    const enricher = new MockEnricher();
    const postprocessor = new ASTPostprocessor(enricher);
    await postprocessor.process(srcDir, resolvedSpec);

    // 4. Verify results
    const processedCode = fs.readFileSync(servicesFilePath, "utf-8");
    
    // Original name should not be present
    expect(processedCode).not.toContain("export const getPetById");
    // New name should be present
    expect(processedCode).toContain("export const fetchPet");
    // JSDocs should be present
    expect(processedCode).toContain("Fetch a pet by its unique identifier.");
    expect(processedCode).toContain("const { data } = await fetchPet");
  });
});
