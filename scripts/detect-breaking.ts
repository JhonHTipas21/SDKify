import { Project, InterfaceDeclaration, TypeAliasDeclaration } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

/**
 * Structural Diff script to detect breaking changes between two generated SDKs.
 * Usage: npx tsx scripts/detect-breaking.ts --old <path/to/old/src> --new <path/to/new/src>
 */

const args = process.argv.slice(2);
const oldIndex = args.indexOf("--old");
const newIndex = args.indexOf("--new");

if (oldIndex === -1 || newIndex === -1) {
  console.error("Usage: detect-breaking.ts --old <path> --new <path>");
  process.exit(1);
}

const oldDir = args[oldIndex + 1];
const newDir = args[newIndex + 1];

const oldTypesFile = path.join(oldDir, "types.gen.ts");
const newTypesFile = path.join(newDir, "types.gen.ts");

if (!fs.existsSync(oldTypesFile)) {
  // If there's no old types file, there's nothing to break
  process.exit(0);
}

const project = new Project();
const oldSource = project.addSourceFileAtPath(oldTypesFile);
const newSource = fs.existsSync(newTypesFile) ? project.addSourceFileAtPath(newTypesFile) : null;

if (!newSource) {
  console.error(`BREAKING: The file types.gen.ts was entirely removed.`);
  process.exit(1);
}

let hasBreakingChanges = false;
const report: string[] = [];

// 1. Check Interfaces
const oldInterfaces = new Map<string, InterfaceDeclaration>();
oldSource.getInterfaces().forEach((iface) => oldInterfaces.set(iface.getName(), iface));

const newInterfaces = new Map<string, InterfaceDeclaration>();
newSource.getInterfaces().forEach((iface) => newInterfaces.set(iface.getName(), iface));

for (const [name, oldIface] of oldInterfaces.entries()) {
  if (!newInterfaces.has(name)) {
    hasBreakingChanges = true;
    report.push(`- Interface '${name}' was removed.`);
    continue;
  }

  const newIface = newInterfaces.get(name)!;
  const oldProps = oldIface.getProperties();
  const newProps = newIface.getProperties();

  const newPropNames = new Set(newProps.map(p => p.getName()));

  for (const prop of oldProps) {
    if (!newPropNames.has(prop.getName())) {
      hasBreakingChanges = true;
      report.push(`- Property '${prop.getName()}' was removed from interface '${name}'.`);
    }
  }
}

// 2. Check Type Aliases
const oldTypeAliases = new Map<string, TypeAliasDeclaration>();
oldSource.getTypeAliases().forEach((alias) => oldTypeAliases.set(alias.getName(), alias));

const newTypeAliases = new Map<string, TypeAliasDeclaration>();
newSource.getTypeAliases().forEach((alias) => newTypeAliases.set(alias.getName(), alias));

for (const [name, oldAlias] of oldTypeAliases.entries()) {
  if (!newTypeAliases.has(name)) {
    hasBreakingChanges = true;
    report.push(`- Type alias '${name}' was removed.`);
  }
}

if (hasBreakingChanges) {
  console.error("STRUCTURAL BREAKING CHANGES DETECTED:");
  console.error(report.join("\n"));
  process.exit(1);
} else {
  console.log("No structural breaking changes detected.");
  process.exit(0);
}
