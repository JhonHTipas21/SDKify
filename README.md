# SDKify

**SDKify** is an advanced, AI-powered developer tool that generates TypeScript SDKs from OpenAPI/Swagger specifications. 

It leverages **HeyAPI (`@hey-api/openapi-ts`)** as its deterministic code generation engine and adds an **intelligent LLM enrichment layer** powered by multiple providers (Groq, OpenAI, Anthropic) to rename methods idiomatically, inject business-oriented JSDoc comments, and generate realistic usage examples in TypeScript. Finally, it automatically outputs a self-contained test suite with **Vitest and MSW (Mock Service Worker)**.

---

## Key Features

1. **Deterministic Core**: Uses `@hey-api/openapi-ts` to generate type-safe HTTP requests, fetch clients, and schemas.
2. **AI-Enriched JSDocs & Idiomatic Renaming**: Connects to LLM APIs (via JSON Mode) to refine generic or ambiguous `operationId`s (e.g., changing `userGet` or `getUserById` to idiomatic `getUser`) and generates realistic code usage examples.
3. **AST Post-processing**: Uses `ts-morph` to parse the generated TypeScript Abstract Syntax Tree (AST), execute method renames cleanly across modules, and append structured JSDoc comments.
4. **Smart Endpoint Hashing & Caching**: Computes SHA-256 hashes of OpenAPI operations and caches LLM results in `.sdkify-cache.json` to prevent duplicate API requests and optimize cost.
5. **Automated Smoke Tests**: Generates integration tests inside the SDK folder using **Vitest** and **MSW** to mock requests. The generated test suite intercepts native `fetch` requests correctly out of the box.
6. **Code Formatting**: Automatically integrates with Prettier to format generated output, ensuring a clean and consistent codebase.

---

## Stack & Dependencies

- **Parser & Validator**: `@apidevtools/swagger-parser`
- **Baseline Generator**: `@hey-api/openapi-ts`
- **HTTP Client**: `@hey-api/client-fetch`
- **AST Modifier**: `ts-morph`
- **LLM SDKs**: `groq-sdk`, Native Fetch API (OpenAI, Anthropic)
- **CLI Framework**: `commander`
- **Testing**: `vitest` + `msw`

---

## Installation

Install dependencies and compile the CLI tool:

```bash
npm install
npm run build
```

Link the CLI globally to run it from anywhere:

```bash
npm link
```

---

## CLI Usage

SDKify exposes a developer-friendly Command Line Interface.

```bash
sdkify --spec <path-to-openapi.yaml> --output <target-directory> [options]
```

### Options

*   `-s, --spec <path>`: Path to the OpenAPI spec (YAML or JSON). Can also be configured via config file.
*   `-o, --output <dir>`: Target directory where the SDK npm package will be generated. Can also be configured via config file.
*   `-c, --config <path>`: Path to the SDKify configuration file (defaults to `sdkify.config.json`).
*   `--no-ai`: Disable the AI enrichment layer (runs the deterministic HeyAPI generation only).
*   `--provider <provider>`: LLM Provider to use (`groq`, `openai`, `anthropic`). Default is `groq`.
*   `--model <model>`: Specify the LLM model name override.
*   `--api-key <key>`: Explicit API Key (overrides environment variables).

### Example

Generate an SDK for a PetStore spec with AI enabled using OpenAI:

```bash
export OPENAI_API_KEY="your_api_key"
sdkify --spec ./petstore.yaml --output ./sdk-output --provider openai --model gpt-4o-mini
```

---

## Configuration File

You can also use a configuration file `sdkify.config.json` at the root of your project:

```json
{
  "spec": "./petstore.yaml",
  "output": "./sdk-output",
  "useAI": true,
  "llmProvider": "openai",
  "modelName": "gpt-4o-mini"
}
```

Then run `sdkify` with no arguments, and it will load options from this file.

---

## Generated SDK Structure

SDKify outputs a standard, publishable, and pre-configured npm module:

```
sdk-output/
├── package.json         # Ready with scripts (build, test) and devDependencies (Vitest, MSW)
├── tsconfig.json        # Pre-configured for ESM & NodeNext
├── README.md            # Usage instructions for the generated SDK
├── src/
│   ├── index.ts         # Main entry point re-exporting everything
│   ├── services.gen.ts  # Enriched SDK functions with JSDoc and custom names
│   ├── types.gen.ts     # Type-safe schemas and parameters
│   └── schemas.gen.ts   # Core schemas
└── tests/
    └── smoke.test.ts    # Self-contained MSW smoke tests
```

### Running Generated Tests

Inside the output folder, the user can verify their SDK immediately:

```bash
cd sdk-output
npm install
npm test
```

---

## SOLID Architecture

SDKify is built with software design best practices in mind:
- **Single Responsibility (S)**: Separate classes for parsing (`SwaggerSpecValidator`), generation (`HeyAPIGenerator`), post-processing (`ASTPostprocessor`), and testing (`TestGenerator`).
- **Open/Closed (O)**: The enricher is an extensible plugin interface (`LLMProvider`). The AI pipeline can be toggled off or swapped out without modifying the core pipeline structure.
- **Liskov Substitution (L)**: `GroqProvider`, `OpenAIProvider`, and `AnthropicProvider` conform to the `LLMProvider` contract seamlessly.
- **Interface Segregation (I)**: Interfaces are lean and minimal, segregating enrichment, validation, and generation contracts.
- **Dependency Inversion (D)**: The main `SDKifyPipeline` orchestrator depends on abstractions (`BaseGenerator`, `AIEnricher`, `SpecValidator`) rather than concrete implementations.
