import * as fs from "fs";
import * as path from "path";

export class NpmPackager {
  /**
   * Packages the generated files into a structured npm module.
   * @param sdkRootDir The root output directory for the SDK (contains package.json, tsconfig.json, src/)
   * @param specInfo Metadata about the OpenAPI spec used to name and describe the package
   */
  async package(
    sdkRootDir: string, 
    specInfo: { title: string; version: string; description?: string }
  ): Promise<void> {
    const pkgName = specInfo.title.toLowerCase().replace(/[^a-z0-9-]/g, "-") + "-sdk";

    // Ensure directory exists
    if (!fs.existsSync(sdkRootDir)) {
      fs.mkdirSync(sdkRootDir, { recursive: true });
    }

    // 1. Generate package.json in the SDK root
    const packageJson = {
      name: pkgName,
      version: specInfo.version || "1.0.0",
      description: specInfo.description || `Auto-generated TypeScript SDK for ${specInfo.title}`,
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      type: "module",
      scripts: {
        build: "tsc",
        test: "vitest run",
      },
      dependencies: {
        "@hey-api/client-fetch": "^0.2.0",
      },
      devDependencies: {
        "typescript": "^5.4.5",
        "vitest": "^1.6.0",
        "msw": "^2.3.0",
      },
      files: [
        "dist",
        "src",
        "tests",
      ],
    };

    fs.writeFileSync(
      path.join(sdkRootDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
      "utf-8"
    );

    // 2. Generate tsconfig.json in the SDK root
    const tsconfigJson = {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        declaration: true,
        sourceMap: true,
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };

    fs.writeFileSync(
      path.join(sdkRootDir, "tsconfig.json"),
      JSON.stringify(tsconfigJson, null, 2),
      "utf-8"
    );

    // 3. Generate basic README.md
    const readmeContent = `# ${specInfo.title} TypeScript SDK

Auto-generated TypeScript SDK for the ${specInfo.title}. Powered by SDKify.

## Installation

\`\`\`bash
npm install ${pkgName}
\`\`\`

## Getting Started

\`\`\`typescript
import { client } from '${pkgName}';

// Configure the client
client.setConfig({
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
});
\`\`\`
`;

    fs.writeFileSync(path.join(sdkRootDir, "README.md"), readmeContent, "utf-8");
  }
}
