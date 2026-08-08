#!/usr/bin/env node
import { Command } from "commander";
import * as dotenv from "dotenv";
import { SDKifyPipeline } from "../index.js";
import { ConfigReader } from "../config/config.reader.js";

// Load environment variables from .env if present
dotenv.config();

const program = new Command();

program
  .name("sdkify")
  .description("SDKify — Generate typed, AI-enriched TypeScript SDKs from OpenAPI specifications.")
  .version("1.0.0")
  .option("-s, --spec <path>", "Path to the OpenAPI specification file (YAML or JSON)")
  .option("-o, --output <dir>", "Output directory where the SDK package will be generated")
  .option("-c, --config <path>", "Path to the SDKify configuration file")
  .option("--no-ai", "Disable the AI enrichment layer (deterministic generation only)")
  .option("--provider <provider>", "LLM Provider to use (groq, openai, anthropic)", "groq")
  .option("--model <model>", "LLM model to use for enrichment")
  .option("--api-key <key>", "LLM API Key (overrides environment variables)")
  .action(async (options) => {
    try {
      // 1. Read config file
      const config = ConfigReader.read(options.config);

      // 2. Merge options (CLI arguments override config file)
      const specPath = options.spec || config.spec;
      const outputDir = options.output || config.output;
      const useAI = (options.ai !== undefined ? options.ai : config.useAI) !== false;
      const llmProvider = options.provider || config.llmProvider || "groq";
      const modelName = options.model || config.modelName;
      const apiKey = options.apiKey || config.apiKey;

      if (!specPath) {
        throw new Error("Missing spec path. Please provide it via -s/--spec or configure it in sdkify.config.json");
      }
      if (!outputDir) {
        throw new Error("Missing output directory. Please provide it via -o/--output or configure it in sdkify.config.json");
      }

      const pipeline = new SDKifyPipeline();

      await pipeline.run({
        specPath,
        outputDir,
        useAI,
        llmProvider,
        apiKey,
        modelName,
      });

      console.log("\n[SDKify] Success! Your SDK is ready.");
    } catch (error: any) {
      console.error(`\n[SDKify] Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
