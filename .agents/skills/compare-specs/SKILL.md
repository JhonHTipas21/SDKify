---
name: compare-specs
description: Instructions for comparing OpenAPI specifications semantically to detect breaking, non-breaking, and unknown changes.
---
# OpenAPI Spec Semantic Comparison

This skill defines the process of checking for backward-compatibility regressions in OpenAPI specs using the semantic comparator script.

## The Comparator Script (compare-specs.ts)

The comparator parses specs using `@apidevtools/swagger-parser` and evaluates structural changes:
- **Breaking Changes**: Endpoint/operation removal, parameter removal, type modification (parameter or schema), enum value removals, or adding new required request parameters.
- **Non-breaking Changes**: Description changes, new endpoints, adding optional parameters.
- **Unknown Changes**: Adding new required fields to a response (which might crash strict parsers).

## Execution Command

Run the comparison using `tsx`:
```bash
npx tsx scripts/compare-specs.ts --old <path-to-old-spec> --new <path-to-new-spec>
```

## Exit Code Meanings

The script exits with specific codes to guide workflows:
- **`0`**: No changes detected between the two spec files.
- **`1`**: Breaking or unknown changes detected. This requires human review.
- **`2`**: Non-breaking changes only. Safe for automated PR updates.
- **`3`**: Argument or parse error (e.g., malformed OpenAPI file).

## Action Strategies

- **Exit code 0**: Complete the task successfully without taking further action.
- **Exit code 1**: Open a GitHub issue detailing the structural alterations with the label `breaking-change`. Do not publish automatically.
- **Exit code 2**: Regenerate the SDK using the new spec, and create a Pull Request with the updated SDK codebase.
