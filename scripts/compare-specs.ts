#!/usr/bin/env node
/**
 * scripts/compare-specs.ts
 *
 * Semantic OpenAPI breaking-change detector.
 *
 * Usage:
 *   npx tsx scripts/compare-specs.ts --old <old-spec.yaml> --new <new-spec.yaml>
 *
 * Exit codes:
 *   0 — no changes detected
 *   1 — breaking or unknown changes detected (requires human review)
 *   2 — non-breaking changes only (suitable for auto-PR)
 *   3 — argument / parsing error
 *
 * Output: JSON to stdout  { breaking[], nonBreaking[], unknown[] }
 */

import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI, OpenAPIV3 } from "openapi-types";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "breaking" | "non-breaking" | "unknown";

interface Change {
  severity: Severity;
  path: string;
  message: string;
}

interface Report {
  breaking: Change[];
  nonBreaking: Change[];
  unknown: Change[];
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const oldFlag = args.indexOf("--old");
const newFlag = args.indexOf("--new");

if (oldFlag === -1 || newFlag === -1 || !args[oldFlag + 1] || !args[newFlag + 1]) {
  console.error("Usage: compare-specs.ts --old <path> --new <path>");
  process.exit(3);
}

const oldPath = args[oldFlag + 1];
const newPath = args[newFlag + 1];

for (const p of [oldPath, newPath]) {
  if (!fs.existsSync(p)) {
    console.error(`File not found: ${p}`);
    process.exit(3);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isV3(doc: OpenAPI.Document): doc is OpenAPIV3.Document {
  return "openapi" in doc && (doc as any).openapi?.startsWith("3");
}

function getOperations(
  doc: OpenAPIV3.Document
): Map<string, { method: string; path: string; op: OpenAPIV3.OperationObject }> {
  const map = new Map<string, { method: string; path: string; op: OpenAPIV3.OperationObject }>();
  const methods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

  for (const [urlPath, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of methods) {
      const op = (pathItem as any)[method] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;
      const key = op.operationId ?? `${method.toUpperCase()} ${urlPath}`;
      map.set(key, { method, path: urlPath, op });
    }
  }
  return map;
}

function resolveSchemaType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): string {
  if (!schema) return "unknown";
  if ("$ref" in schema) return schema.$ref;
  const s = schema as OpenAPIV3.SchemaObject;
  if (s.type) return s.type as string;
  if (s.allOf) return "allOf";
  if (s.oneOf) return "oneOf";
  if (s.anyOf) return "anyOf";
  return "unknown";
}

function getSchemaEnumValues(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): unknown[] {
  if (!schema || "$ref" in schema) return [];
  return (schema as OpenAPIV3.SchemaObject).enum ?? [];
}

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

function compareSpecs(oldDoc: OpenAPIV3.Document, newDoc: OpenAPIV3.Document): Report {
  const report: Report = { breaking: [], nonBreaking: [], unknown: [] };

  const add = (severity: Severity, path: string, message: string) =>
    report[severity === "breaking" ? "breaking" : severity === "non-breaking" ? "nonBreaking" : "unknown"].push({
      severity,
      path,
      message,
    });

  const oldOps = getOperations(oldDoc);
  const newOps = getOperations(newDoc);

  // 1. Endpoint / operation removed
  for (const [key, { method, path }] of oldOps.entries()) {
    if (!newOps.has(key)) {
      add("breaking", `${method.toUpperCase()} ${path}`, `Operation '${key}' was removed.`);
      continue;
    }

    const oldEntry = oldOps.get(key)!;
    const newEntry = newOps.get(key)!;
    const oldOp = oldEntry.op;
    const newOp = newEntry.op;

    // 2. HTTP method changed for same operationId
    if (oldEntry.method !== newEntry.method) {
      add(
        "breaking",
        `${oldEntry.method.toUpperCase()} ${oldEntry.path}`,
        `HTTP method changed from '${oldEntry.method.toUpperCase()}' to '${newEntry.method.toUpperCase()}'.`
      );
    }

    // 3. Path changed for same operationId
    if (oldEntry.path !== newEntry.path) {
      add(
        "breaking",
        `${oldEntry.method.toUpperCase()} ${oldEntry.path}`,
        `URL path changed from '${oldEntry.path}' to '${newEntry.path}'.`
      );
    }

    // 4. Parameters
    const oldParams = (oldOp.parameters ?? []) as OpenAPIV3.ParameterObject[];
    const newParams = (newOp.parameters ?? []) as OpenAPIV3.ParameterObject[];
    const newParamMap = new Map(newParams.map((p) => [`${p.in}:${p.name}`, p]));
    const oldParamMap = new Map(oldParams.map((p) => [`${p.in}:${p.name}`, p]));

    for (const [paramKey, oldParam] of oldParamMap.entries()) {
      if (!newParamMap.has(paramKey)) {
        add(
          "breaking",
          `${method.toUpperCase()} ${path} > param:${paramKey}`,
          `Parameter '${oldParam.name}' (in: ${oldParam.in}) was removed.`
        );
      } else {
        const newParam = newParamMap.get(paramKey)!;
        // type changed
        const oldType = resolveSchemaType(oldParam.schema as any);
        const newType = resolveSchemaType(newParam.schema as any);
        if (oldType !== newType) {
          add(
            "breaking",
            `${method.toUpperCase()} ${path} > param:${paramKey}`,
            `Parameter '${oldParam.name}' type changed from '${oldType}' to '${newType}'.`
          );
        }
        // enum narrowed or values removed
        const oldEnums = getSchemaEnumValues(oldParam.schema as any);
        const newEnums = getSchemaEnumValues(newParam.schema as any);
        if (oldEnums.length > 0 && newEnums.length > 0) {
          const removed = oldEnums.filter((v) => !newEnums.includes(v));
          if (removed.length > 0) {
            add(
              "breaking",
              `${method.toUpperCase()} ${path} > param:${paramKey}`,
              `Enum values removed from '${oldParam.name}': ${removed.join(", ")}.`
            );
          }
        }
      }
    }

    // New required parameter added — breaking
    for (const [paramKey, newParam] of newParamMap.entries()) {
      if (!oldParamMap.has(paramKey) && newParam.required) {
        add(
          "breaking",
          `${method.toUpperCase()} ${path} > param:${paramKey}`,
          `Required parameter '${newParam.name}' (in: ${newParam.in}) was added.`
        );
      } else if (!oldParamMap.has(paramKey) && !newParam.required) {
        add(
          "non-breaking",
          `${method.toUpperCase()} ${path} > param:${paramKey}`,
          `Optional parameter '${newParam.name}' (in: ${newParam.in}) was added.`
        );
      }
    }

    // 5. Request body required properties
    const oldRequestBody = oldOp.requestBody as OpenAPIV3.RequestBodyObject | undefined;
    const newRequestBody = newOp.requestBody as OpenAPIV3.RequestBodyObject | undefined;

    if (oldRequestBody && newRequestBody) {
      const oldJsonSchema = (
        oldRequestBody.content?.["application/json"]?.schema as OpenAPIV3.SchemaObject | undefined
      );
      const newJsonSchema = (
        newRequestBody.content?.["application/json"]?.schema as OpenAPIV3.SchemaObject | undefined
      );

      if (oldJsonSchema && newJsonSchema && !("$ref" in oldJsonSchema) && !("$ref" in newJsonSchema)) {
        const oldRequired = new Set(oldJsonSchema.required ?? []);
        const newRequired = new Set(newJsonSchema.required ?? []);

        // New required field added to request body — breaking for callers
        for (const field of newRequired) {
          if (!oldRequired.has(field)) {
            add(
              "breaking",
              `${method.toUpperCase()} ${path} > requestBody`,
              `Required field '${field}' added to request body schema.`
            );
          }
        }
        // Required field removed from request body — non-breaking
        for (const field of oldRequired) {
          if (!newRequired.has(field)) {
            add(
              "non-breaking",
              `${method.toUpperCase()} ${path} > requestBody`,
              `Previously required field '${field}' is no longer required in request body.`
            );
          }
        }
      }
    }

    // 6. Response schema — required property added to 2xx response — breaking for consumers
    for (const [statusCode, responseObj] of Object.entries(newOp.responses ?? {})) {
      if (!statusCode.startsWith("2")) continue;
      const oldResponseObj = ((oldOp.responses ?? {}) as any)[statusCode] as
        | OpenAPIV3.ResponseObject
        | undefined;
      const newResponseCast = responseObj as OpenAPIV3.ResponseObject;

      if (!oldResponseObj) continue;

      const oldSchema = oldResponseObj.content?.["application/json"]?.schema as
        | OpenAPIV3.SchemaObject
        | undefined;
      const newSchema = newResponseCast.content?.["application/json"]?.schema as
        | OpenAPIV3.SchemaObject
        | undefined;

      if (oldSchema && newSchema && !("$ref" in oldSchema) && !("$ref" in newSchema)) {
        const oldRequired = new Set(oldSchema.required ?? []);
        const newRequired = new Set(newSchema.required ?? []);

        for (const field of newRequired) {
          if (!oldRequired.has(field)) {
            // Consumers must handle the new field — classified as unknown (may break depending on strict parsing)
            add(
              "unknown",
              `${method.toUpperCase()} ${path} > response:${statusCode}`,
              `New required field '${field}' added to ${statusCode} response body. Consumers using strict parsing may break.`
            );
          }
        }
      }
    }

    // 7. Description-only changes → non-breaking
    if (
      oldOp.summary !== newOp.summary ||
      oldOp.description !== newOp.description
    ) {
      add(
        "non-breaking",
        `${method.toUpperCase()} ${path}`,
        `Documentation (summary/description) changed.`
      );
    }
  }

  // 8. New operations added — non-breaking
  for (const [key, { method, path }] of newOps.entries()) {
    if (!oldOps.has(key)) {
      add("non-breaking", `${method.toUpperCase()} ${path}`, `New operation '${key}' added.`);
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let oldDoc: OpenAPI.Document;
  let newDoc: OpenAPI.Document;

  try {
    oldDoc = await SwaggerParser.dereference(oldPath);
    newDoc = await SwaggerParser.dereference(newPath);
  } catch (err: any) {
    console.error(`Failed to parse specs: ${err.message}`);
    process.exit(3);
  }

  if (!isV3(oldDoc) || !isV3(newDoc)) {
    console.error("Only OpenAPI v3 specs are supported by this comparator.");
    process.exit(3);
  }

  const report = compareSpecs(oldDoc, newDoc);
  console.log(JSON.stringify(report, null, 2));

  const hasBreaking = report.breaking.length > 0;
  const hasUnknown = report.unknown.length > 0;
  const hasNonBreaking = report.nonBreaking.length > 0;
  const noChanges = !hasBreaking && !hasUnknown && !hasNonBreaking;

  if (noChanges) {
    process.exit(0);
  } else if (hasBreaking || hasUnknown) {
    process.exit(1);
  } else {
    // only non-breaking
    process.exit(2);
  }
}

main();
