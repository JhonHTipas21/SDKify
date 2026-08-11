# 1.0.0 (2026-08-11)


### Bug Fixes

* **ci:** add @vitest/coverage-v8@1.6 to resolve missing coverage dependency in CI ([c525537](https://github.com/JhonHTipas21/SDKify/commit/c5255372f4e2b07d006eb3695f487beef40eac86))
* **ci:** replace env with step outputs in spec-watch conditionals ([a272253](https://github.com/JhonHTipas21/SDKify/commit/a272253147c7ed596dedc886a791b0d818d37029))


### Features

* **config:** define SDKConfig interface schema ([0fe5dd1](https://github.com/JhonHTipas21/SDKify/commit/0fe5dd1fb4a38d7c69de328622673d6144caee9a))
* **config:** implement ConfigReader to load JSON configurations ([f45ee17](https://github.com/JhonHTipas21/SDKify/commit/f45ee17fd36f7c74f07c99883738b224dcdec879))
* **config:** integrate ConfigReader into CLI with option merging and provider flag ([a373743](https://github.com/JhonHTipas21/SDKify/commit/a373743b0ac2bc1e3053eeeb160e7535cfbddf8c))
* **formatter:** implement PrettierFormatter to format generated SDK files ([ac569f5](https://github.com/JhonHTipas21/SDKify/commit/ac569f5e10baf9bc8e74543ad524b469392c48df))
* implement AI enrichment layer and AST post-processing (Phase 1) ([8ba4230](https://github.com/JhonHTipas21/SDKify/commit/8ba4230afa92455c30e56d58003debb16d27e183))
* implement automated smoke test generation with MSW and Vitest (Phase 2) ([b666309](https://github.com/JhonHTipas21/SDKify/commit/b666309fdf1675b38c1f67928bcd14b1cbb001af))
* implement CLI runner and complete E2E project integration (Phase 3) ([821a4d4](https://github.com/JhonHTipas21/SDKify/commit/821a4d48a6c398d1e64a9456816d8ea686de7a6e))
* implement deterministic SDK generation pipeline (Phase 0) ([185fe9f](https://github.com/JhonHTipas21/SDKify/commit/185fe9f14f3a48527f47202461221791879680b2))
* **llm:** define LLMProvider interface for pluggable LLMs ([b1c1e86](https://github.com/JhonHTipas21/SDKify/commit/b1c1e86eeb9fcabc01c341f4e2cb3988cb192520))
* **llm:** implement AnthropicProvider strategy ([d3ec97a](https://github.com/JhonHTipas21/SDKify/commit/d3ec97a94d836f44373f2c6a263b420c7197a13d))
* **llm:** implement GroqProvider strategy ([c3169ce](https://github.com/JhonHTipas21/SDKify/commit/c3169ce8f7e1aeb2346176bb8450b15c1f7b8777))
* **llm:** implement LLMProviderFactory for dynamic provider creation ([0ba063b](https://github.com/JhonHTipas21/SDKify/commit/0ba063b86c7d25c8274da1b8589d6b7d5778d4a4))
* **llm:** implement OpenAIProvider strategy ([4d133dd](https://github.com/JhonHTipas21/SDKify/commit/4d133dd7bba4a4bf0e554aff0e64c7e4d002a1ff))
* **llm:** implement unified LLMEnricher supporting pluggable providers ([e75e5ed](https://github.com/JhonHTipas21/SDKify/commit/e75e5ede6ab86b6f84eaa49413d42e3cc339da89))
* **pipeline:** integrate PrettierFormatter into main SDK generation pipeline ([e02bba4](https://github.com/JhonHTipas21/SDKify/commit/e02bba4ccc2b2c56b7d1fee80c7669f5ddf5563d))
