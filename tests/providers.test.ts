import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LLMProviderFactory } from "../src/providers/provider.factory.js";
import { OpenAIProvider } from "../src/providers/openai.provider.js";
import { AnthropicProvider } from "../src/providers/anthropic.provider.js";
import { GroqProvider } from "../src/providers/groq.provider.js";
import { EnrichmentError } from "../src/errors/enrichment.error.js";

describe("LLM Providers and Factory", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should create corresponding provider instance using factory", () => {
    const groq = LLMProviderFactory.create("groq", "mock-key");
    expect(groq).toBeInstanceOf(GroqProvider);

    const openai = LLMProviderFactory.create("openai", "mock-key");
    expect(openai).toBeInstanceOf(OpenAIProvider);

    const anthropic = LLMProviderFactory.create("anthropic", "mock-key");
    expect(anthropic).toBeInstanceOf(AnthropicProvider);
  });

  it("should throw EnrichmentError for unsupported provider", () => {
    expect(() => {
      LLMProviderFactory.create("unsupported", "mock-key");
    }).toThrow(EnrichmentError);
  });

  it("should execute OpenAIProvider call with correct body and return parsed result", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              methodName: "getUser",
              description: "Retrieves a user profile",
              example: "const user = await getUser({ path: { id: 1 } });",
            }),
          },
        },
      ],
    };

    // Mock global fetch
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider("mock-openai-key", "gpt-4o-mini");
    const result = await provider.generateEnrichment("OpenAPI detail");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe("Bearer mock-openai-key");

    expect(result.methodName).toBe("getUser");
    expect(result.description).toBe("Retrieves a user profile");
    expect(result.example).toBe("const user = await getUser({ path: { id: 1 } });");
  });

  it("should execute AnthropicProvider call with correct headers and return parsed result", async () => {
    const mockResponse = {
      content: [
        {
          text: JSON.stringify({
            methodName: "createPet",
            description: "Creates a new pet",
            example: "const pet = await createPet({ body: { name: 'Fido' } });",
          }),
        },
      ],
    };

    // Mock global fetch
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new AnthropicProvider("mock-anthropic-key", "claude-3-5-sonnet-20240620");
    const result = await provider.generateEnrichment("OpenAPI detail");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe("mock-anthropic-key");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");

    expect(result.methodName).toBe("createPet");
    expect(result.description).toBe("Creates a new pet");
    expect(result.example).toBe("const pet = await createPet({ body: { name: 'Fido' } });");
  });
});
