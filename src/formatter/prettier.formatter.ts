import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";

/**
 * PrettierFormatter attempts to format a list of TypeScript source files
 * using the locally installed Prettier binary. If Prettier is not available
 * in the project's node_modules, the step is silently skipped.
 */
export class PrettierFormatter {
  /**
   * Format a directory of TypeScript files using Prettier if available.
   * @param targetDir Root directory of files to format
   */
  static format(targetDir: string): void {
    if (!fs.existsSync(targetDir)) {
      console.warn(`[SDKify] Formatter: target directory does not exist: ${targetDir}`);
      return;
    }

    const prettierBin = path.join(targetDir, "node_modules", ".bin", "prettier");
    const globalPrettierBin = PrettierFormatter.resolveGlobalPrettier();

    const bin = fs.existsSync(prettierBin) ? prettierBin : globalPrettierBin;

    if (!bin) {
      console.log(`[SDKify] Prettier not found. Skipping code formatting step.`);
      return;
    }

    try {
      childProcess.execSync(`"${bin}" --write "${targetDir}/src/**/*.ts" "${targetDir}/tests/**/*.ts"`, {
        stdio: "ignore",
      });
      console.log(`[SDKify] Prettier formatted source files in: ${targetDir}`);
    } catch (error: any) {
      console.warn(`[SDKify] Prettier formatting failed: ${error.message}. Continuing without formatting.`);
    }
  }

  /**
   * Attempts to locate a globally installed prettier binary.
   */
  private static resolveGlobalPrettier(): string | null {
    try {
      const result = childProcess.execSync("which prettier", { encoding: "utf-8" }).trim();
      return result || null;
    } catch {
      return null;
    }
  }
}
