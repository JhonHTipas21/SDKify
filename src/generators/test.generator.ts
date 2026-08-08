import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind, ArrowFunction, CallExpression, ObjectLiteralExpression } from "ts-morph";

export interface TestGeneratorOptions {
  sdkRootDir: string;
}

export class TestGenerator {
  /**
   * Generates MSW + Vitest integration tests for the SDK.
   * @param sdkRootDir Root directory of the generated SDK
   */
  async generate(sdkRootDir: string): Promise<void> {
    const srcDir = path.join(sdkRootDir, "src");
    const servicesFilePath = path.join(srcDir, "services.gen.ts");

    if (!fs.existsSync(servicesFilePath)) {
      console.warn(`[SDKify] Warning: Cannot generate tests. services.gen.ts not found.`);
      return;
    }

    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(servicesFilePath);
    const variableDeclarations = sourceFile.getVariableDeclarations();

    const endpoints: Array<{
      methodName: string;
      httpMethod: string;
      rawPath: string;
      mswPath: string;
      pathParams: string[];
    }> = [];

    for (const varDecl of variableDeclarations) {
      const isExported = varDecl.getVariableStatement()?.isExported();
      const name = varDecl.getName();
      const initializer = varDecl.getInitializer();

      if (isExported && name !== "client" && initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        const arrowFunc = initializer as ArrowFunction;
        const details = this.getEndpointDetails(arrowFunc);

        if (details) {
          const { path: rawPath, method } = details;
          
          // Convert OpenAPI path parameters /pets/{id} to MSW format /pets/:id
          const mswPath = rawPath.replace(/\{([^}]+)\}/g, ":$1");
          
          // Extract path parameter names (e.g. ["id"])
          const pathParams: string[] = [];
          const paramMatches = rawPath.match(/\{([^}]+)\}/g);
          if (paramMatches) {
            paramMatches.forEach((match) => {
              pathParams.push(match.slice(1, -1));
            });
          }

          endpoints.push({
            methodName: name,
            httpMethod: method,
            rawPath,
            mswPath,
            pathParams,
          });
        }
      }
    }

    if (endpoints.length === 0) {
      console.log(`[SDKify] No endpoints found in services.gen.ts to generate tests for.`);
      return;
    }

    // Write tests directory
    const testsOutDir = path.join(sdkRootDir, "tests");
    if (!fs.existsSync(testsOutDir)) {
      fs.mkdirSync(testsOutDir, { recursive: true });
    }

    // Build the test file content
    const testFileContent = this.buildTestFileContent(endpoints);
    fs.writeFileSync(path.join(testsOutDir, "smoke.test.ts"), testFileContent, "utf-8");
    console.log(`[SDKify] Smoke tests generated successfully at: ${path.join(testsOutDir, "smoke.test.ts")}`);
  }

  /**
   * Helper to parse the arrow function body and extract HTTP method and URL path.
   */
  private getEndpointDetails(arrowFunc: ArrowFunction): { path: string; method: string } | null {
    const body = arrowFunc.getBody();
    let callExpr: CallExpression | undefined;

    if (body.getKind() === SyntaxKind.Block) {
      const returnStmt = body.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
      const expr = returnStmt?.getExpression();
      if (expr && expr.getKind() === SyntaxKind.CallExpression) {
        callExpr = expr as CallExpression;
      }
    } else if (body.getKind() === SyntaxKind.CallExpression) {
      callExpr = body as CallExpression;
    }

    if (!callExpr) return null;

    const propAccess = callExpr.getExpression();
    let method = "";
    if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression) {
      const name = (propAccess as any).getName();
      const validMethods = ["get", "post", "put", "delete", "patch", "options", "head"];
      if (validMethods.includes(name.toLowerCase())) {
        method = name.toUpperCase();
      }
    }

    const arg = callExpr.getArguments()[0];
    let urlPath = "";

    if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const obj = arg as ObjectLiteralExpression;
      const urlProp = obj.getProperty("url");
      if (urlProp && urlProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (urlProp as any).getInitializer();
        if (init && init.getKind() === SyntaxKind.StringLiteral) {
          urlPath = (init as any).getLiteralValue();
        }
      }

      const methodProp = obj.getProperty("method");
      if (methodProp && methodProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (methodProp as any).getInitializer();
        if (init && init.getKind() === SyntaxKind.StringLiteral) {
          method = (init as any).getLiteralValue().toUpperCase();
        }
      }
    }

    if (!urlPath) return null;
    return { path: urlPath, method: method || "GET" };
  }

  /**
   * Builds the smoke.test.ts source code structure.
   */
  private buildTestFileContent(endpoints: Array<{
    methodName: string;
    httpMethod: string;
    rawPath: string;
    mswPath: string;
    pathParams: string[];
  }>): string {
    const imports = endpoints.map((e) => e.methodName).join(", ");
    
    // Build MSW Handlers list
    const handlers = endpoints.map((e) => {
      const methodLower = e.httpMethod.toLowerCase();
      // Ensure path parameter colons don't break string literals
      return `  http.${methodLower}('http://localhost${e.mswPath}', () => {
    return HttpResponse.json({ success: true, message: 'Mock response for ${e.methodName}' });
  })`;
    }).join(",\n");

    // Build Test Cases list
    const testCases = endpoints.map((e) => {
      // Build options object with path parameters if required
      let optionsStr = "";
      if (e.pathParams.length > 0) {
        const pathParamsFields = e.pathParams.map((p) => `${p}: 1`).join(", ");
        optionsStr = `{ path: { ${pathParamsFields} } } as any`;
      } else {
        optionsStr = "{} as any";
      }

      return `  it('should successfully execute ${e.methodName}', async () => {
    const { data, error } = await ${e.methodName}(${optionsStr});
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect((data as any).success).toBe(true);
  });`;
    }).join("\n\n");

    return `// Auto-generated smoke tests. Powered by SDKify.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { client, ${imports} } from '../src/index.js';

const handlers = [
${handlers}
];

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  client.setConfig({ baseUrl: 'http://localhost', fetch: globalThis.fetch });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SDK Smoke Tests', () => {
${testCases}
});
`;
  }
}
