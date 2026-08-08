import * as path from "path";
import { Project, SyntaxKind, ArrowFunction, CallExpression, ObjectLiteralExpression } from "ts-morph";
import { AIEnricher } from "../interfaces/enricher.interface.js";

export class ASTPostprocessor {
  private enricher: AIEnricher;

  constructor(enricher: AIEnricher) {
    this.enricher = enricher;
  }

  /**
   * Processes the generated services file, renaming methods and injecting JSDocs.
   * @param sdkSrcDir The 'src' folder of the generated SDK
   * @param resolvedSpec The fully validated and resolved OpenAPI spec JSON object
   */
  async process(sdkSrcDir: string, resolvedSpec: any): Promise<void> {
    const servicesFilePath = path.join(sdkSrcDir, "services.gen.ts");
    const project = new Project();
    
    // Load the generated services file
    const sourceFile = project.addSourceFileAtPath(servicesFilePath);

    // Find all variable declarations (e.g. export const getPetById = ...)
    const variableDeclarations = sourceFile.getVariableDeclarations();

    for (const varDecl of variableDeclarations) {
      // Check if it's exported and initialized to an arrow function
      const isExported = varDecl.getVariableStatement()?.isExported();
      const initializer = varDecl.getInitializer();

      if (isExported && initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        const arrowFunc = initializer as ArrowFunction;
        const endpoint = this.getEndpointDetails(arrowFunc);

        if (endpoint) {
          const { path: urlPath, method } = endpoint;
          const opDetails = resolvedSpec.paths?.[urlPath]?.[method.toLowerCase()];

          if (opDetails) {
            const endpointKey = `${method} ${urlPath}`;
            
            // Query AI Enricher (using cache under the hood)
            const enrichment = await this.enricher.enrichOperation(endpointKey, opDetails);

            // 1. Rename function if a better name is provided
            if (enrichment.methodName && enrichment.methodName !== varDecl.getName()) {
              console.log(`[SDKify] Renaming function "${varDecl.getName()}" -> "${enrichment.methodName}"`);
              varDecl.rename(enrichment.methodName);
            }

            // 2. Add JSDoc block
            const varStatement = varDecl.getVariableStatement();
            if (varStatement) {
              // Remove old JSDoc comments to avoid duplication
              varStatement.getJsDocs().forEach((jsdoc) => jsdoc.remove());

              // Build structured JSDoc content
              const jsdocContent = `${enrichment.description}\n\n@example\n\`\`\`typescript\n${enrichment.example}\n\`\`\``;
              varStatement.addJsDoc({
                description: jsdocContent,
              });
            }
          }
        }
      }
    }

    // Save modifications
    await sourceFile.save();
    console.log(`[SDKify] JSDoc enrichment and method renaming completed for: services.gen.ts`);
  }

  /**
   * Helper to parse the arrow function body and extract HTTP method and URL path.
   */
  private getEndpointDetails(arrowFunc: ArrowFunction): { path: string; method: string } | null {
    const body = arrowFunc.getBody();
    let callExpr: CallExpression | undefined;

    // Check if the body is a block (return client.get(...)) or simple expression (client.get(...))
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

    // Try to extract method from the property name accessed (e.g. client.get -> GET)
    const propAccess = callExpr.getExpression();
    let method = "";
    if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression) {
      const name = (propAccess as any).getName();
      const validMethods = ["get", "post", "put", "delete", "patch", "options", "head"];
      if (validMethods.includes(name.toLowerCase())) {
        method = name.toUpperCase();
      }
    }

    // Extract path and method from options object literal argument
    const arg = callExpr.getArguments()[0];
    let urlPath = "";

    if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const obj = arg as ObjectLiteralExpression;
      
      // Look for url: '/path'
      const urlProp = obj.getProperty("url");
      if (urlProp && urlProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (urlProp as any).getInitializer();
        if (init && init.getKind() === SyntaxKind.StringLiteral) {
          urlPath = (init as any).getLiteralValue();
        }
      }

      // Look for method: 'POST' (fallback / override)
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
}
