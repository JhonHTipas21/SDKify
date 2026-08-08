import * as fs from "fs";
import * as path from "path";
import { SDKConfig } from "../interfaces/config.interface.js";
import { SDKifyError } from "../errors/sdkify.error.js";

export class ConfigReader {
  /**
   * Reads and parses the config file. If a custom path is specified but not found, it throws.
   * @param configPath Custom configuration file path (optional)
   */
  static read(configPath?: string): SDKConfig {
    const targetPath = configPath || path.join(process.cwd(), "sdkify.config.json");

    if (!fs.existsSync(targetPath)) {
      if (configPath) {
        throw new SDKifyError(`Config file not found at: ${configPath}`);
      }
      return {};
    }

    try {
      const rawContent = fs.readFileSync(targetPath, "utf-8");
      const parsedConfig = JSON.parse(rawContent) as SDKConfig;

      // Basic validation
      if (parsedConfig.useAI !== undefined && typeof parsedConfig.useAI !== "boolean") {
        throw new SDKifyError("Invalid configuration: 'useAI' must be a boolean.");
      }

      return parsedConfig;
    } catch (error: any) {
      if (error instanceof SDKifyError) throw error;
      throw new SDKifyError(`Failed to parse configuration file: ${error.message}`);
    }
  }
}
