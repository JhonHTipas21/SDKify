---
name: generate-sdk
description: Guide to generate TypeScript SDKs from OpenAPI specifications using the SDKify pipeline (incorporating HeyAPI, AST post-processing, and LLM enrichment).
---
# SDK Generation Workflow

This skill guides the user or agent through running and configuring the core SDKify pipeline to generate a clean, typed, and AI-enriched TypeScript SDK from an OpenAPI schema.

## Pipeline Architecture

The pipeline executes the following stages sequentially:
1. **Spec Validation**: Validates and dereferences the OpenAPI spec file using `@apidevtools/swagger-parser` to ensure it is structurally valid.
2. **HeyAPI Baseline**: Invokes `@hey-api/openapi-ts` to create the baseline fetch client, types, and raw query methods.
3. **AI Enrichment Layer**: If AI is enabled (`useAI: true`), uses `LLMEnricher` (via Groq, OpenAI, or Anthropic) to analyze spec operations, generate idiomatic operation names, add context-aware JSDoc comments, and append inline usage examples.
4. **Smoke Test Generation**: Automatically creates a self-contained test suite using `Vitest` and `MSW` to mock the endpoints.
5. **Packaging**: Generates the package infrastructure (`package.json`, `tsconfig.json`, `README.md`) for the output SDK module.
6. **Code Formatting**: Formats the generated source files using Prettier if available.

## Command Line Interface (CLI)

Run the generator locally using `tsx`:
```bash
npx tsx src/cli/index.ts --spec <path-to-spec> --output <target-dir> [options]
```

### Key Flags
- `-s, --spec <path>`: Path to OpenAPI spec file.
- `-o, --output <dir>`: Target directory for the SDK.
- `--no-ai`: Disables LLM enrichment, running deterministic generation only.
- `--provider <provider>`: Choose `groq`, `openai`, or `anthropic`.
- `--api-key <key>`: Explicit LLM API key.

## Local Configuration (sdkify.config.json)

Place an `sdkify.config.json` at the root of the project to define default options:
```json
{
  "spec": "./openapi.yaml",
  "output": "./sdk-output",
  "useAI": true,
  "llmProvider": "openai",
  "modelName": "gpt-4o-mini"
}
```
*Note: CLI flags always take precedence over configuration file options.*
