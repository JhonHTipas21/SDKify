---
name: publish-sdk
description: Guide to package, version, publish, and rollback SDKify package distribution to GitHub Packages.
---
# SDKify Package Publishing Guide

This skill covers the release cycle, packaging checks, versioning constraints, and rollback procedures for SDKify.

## CI/CD Publishing Pipeline (publish.yml)

The publication workflow operates under strict validation stages:
1. **Tests & Linting**: Runs full typecheck, spec validation, and vitest test suite.
2. **Dry Run Packing**: Runs `npm pack --dry-run` to ensure no sensitive files (e.g. `.env`, fixtures, tests) are included in the package.
3. **Semantic Release**: Parses Conventional Commits from the git log on `main` to bump the version, generate changelogs, write release notes, and deploy.

## GitHub Packages Registry Configuration (.npmrc)

The publishing registry is targeted via `.npmrc`:
```ini
@jhonhtipas21:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```
In GitHub Actions, `NODE_AUTH_TOKEN` is mapped to `secrets.GITHUB_TOKEN` with write permissions to the package.

## Manual Release Trigger

If manual deployment is required:
1. Ensure your local branch is up-to-date and typechecks cleanly:
   ```bash
   npm run typecheck && npm run build
   ```
2. Create and push a semver tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions will trigger and build the release.

## Rollback Procedure

If a bad build gets published:
1. Revert the commit on the `main` branch.
2. Push the revert. `semantic-release` will parse the commit history, increment the version, and publish a new hotfix build.
3. If emergency manual publishing is required:
   ```bash
   # Manually update version in package.json (no tags to avoid collision)
   npm version <rollback-version> --no-git-tag-version
   npm publish
   ```
