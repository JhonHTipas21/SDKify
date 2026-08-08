import * as path from "path";
import { SwaggerSpecValidator } from "./validators/swagger.validator.js";
import { HeyAPIGenerator } from "./generators/heyapi.generator.js";
import { NpmPackager } from "./packager/npm.packager.js";
import { GroqEnricher } from "./enrichers/groq.enricher.js";
import { ASTPostprocessor } from "./postprocessor/ast.postprocessor.js";
import { TestGenerator } from "./generators/test.generator.js";

export interface PipelineOptions {
  specPath: string;
  outputDir: string;
  useAI?: boolean;
  groqApiKey?: string;
  modelName?: string;
}

export class SDKifyPipeline {
  private validator = new SwaggerSpecValidator();
  private generator = new HeyAPIGenerator();
  private packager = new NpmPackager();

  /**
   * Runs the SDK generation pipeline.
   */
  async run(options: PipelineOptions): Promise<void> {
    console.log(`[SDKify] Starting generation pipeline for: ${options.specPath}`);

    // 1. Validate & resolve OpenAPI spec
    console.log(`[SDKify] [1/3] Validating and resolving OpenAPI spec...`);
    const resolvedSpec = await this.validator.validate(options.specPath);
    const title = resolvedSpec.info?.title || "API";
    const version = resolvedSpec.info?.version || "1.0.0";
    const description = resolvedSpec.info?.description || "";
    console.log(`[SDKify] Spec is valid. Title: "${title}", Version: "${version}"`);

    // 2. Generate base client using HeyAPI
    const sdkSrcDir = path.join(options.outputDir, "src");
    console.log(`[SDKify] [2/3] Invoking HeyAPI generator into: ${sdkSrcDir}...`);
    await this.generator.generate(options.specPath, sdkSrcDir);
    console.log(`[SDKify] HeyAPI client generated.`);

    // 2.5 AI Enrichment & Post-processing
    const useAI = options.useAI !== false;
    if (useAI) {
      console.log(`[SDKify] Running AI Enrichment Layer...`);
      const enricher = new GroqEnricher({
        apiKey: options.groqApiKey,
        modelName: options.modelName,
      });
      const postprocessor = new ASTPostprocessor(enricher);
      await postprocessor.process(sdkSrcDir, resolvedSpec);
    } else {
      console.log(`[SDKify] AI Enrichment Layer disabled.`);
    }

    // 2.7 Generate Smoke Tests
    console.log(`[SDKify] Generating automated smoke tests...`);
    const testGenerator = new TestGenerator();
    await testGenerator.generate(options.outputDir);

    // 3. Package npm codebase (package.json, tsconfig.json, index.ts, etc.)
    console.log(`[SDKify] [3/3] Packaging npm module structure in: ${options.outputDir}...`);
    await this.packager.package(options.outputDir, {
      title,
      version,
      description,
    });

    console.log(`[SDKify] Pipeline completed successfully! Generated SDK root: ${options.outputDir}`);
  }
}
