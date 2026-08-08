#!/usr/bin/env node
import { Command } from "commander";
import * as dotenv from "dotenv";
import { SDKifyPipeline } from "../index.js";

// Load environment variables from .env if present
dotenv.config();

const program = new Command();

program
  .name("sdkify")
  .description("SDKify — Generate typed, AI-enriched TypeScript SDKs from OpenAPI specifications.")
  .version("1.0.0")
  .requiredOption("-s, --spec <path>", "Path to the OpenAPI specification file (YAML or JSON)")
  .requiredOption("-o, --output <dir>", "Output directory where the SDK package will be generated")
  .option("--no-ai", "Disable the AI enrichment layer (deterministic generation only)")
  .option("--model <model>", "Groq LLM model to use for enrichment", "llama3-70b-8192")
  .option("--api-key <key>", "Groq API Key (overrides GROQ_API_KEY environment variable)")
  .action(async (options) => {
    try {
      const pipeline = new SDKifyPipeline();
      
      const useAI = options.ai !== false;
      const groqApiKey = options.apiKey || process.env.GROQ_API_KEY;

      if (useAI && !groqApiKey) {
        console.warn("[SDKify] Warning: AI enrichment is enabled but no GROQ_API_KEY was found in environment or arguments.");
        console.warn("[SDKify] Generation will proceed using deterministic fallbacks.");
      }

      await pipeline.run({
        specPath: options.spec,
        outputDir: options.output,
        useAI,
        groqApiKey,
        modelName: options.model,
      });

      console.log("\n[SDKify] Success! Your SDK is ready.");
    } catch (error: any) {
      console.error(`\n[SDKify] Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
