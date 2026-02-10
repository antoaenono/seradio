---
author: @antoaenono
asked: 2025-01-27
decided: 2025-01-27
status: accepted
deciders: @antoaenono @TraeDWill
tags: [tooling, environment, package-manager]
---

# ADR: Package Manager

## Scenario

Which package manager should we use for dependency management, script running, and CI/CD?

## Pressures

### More

1. [M1] Speed
2. [M2] Developer productivity
3. [M3] Compatibility
4. [M4] Modern tooling exposure

### Less

1. [L1] Dependency count
2. [L2] Setup effort

## Chosen Option

Bun as the sole package manager and runtime

## Why

In the context of **choosing a package manager**,
facing **the choice between established and modern tooling**,
we decided **to use bun exclusively**,
to achieve **faster dev pipelines, fewer deps, and modern tooling exposure**,
accepting **that all team members must install bun**.

## Points

### For

- [M1] Installs 4-6x faster, tests run 1-2x faster
- [M2] All-in-one: runtime, bundler, test runner - no separate tools needed
- [M2] Runs TypeScript directly, no `tsc` build step for dev or prod
- [M2] `__dirname` and `__filename` as globals in ESM (no `fileURLToPath` workaround)
- [M4] Modern tooling, rapidly gaining adoption
- [L1] Replaces vitest, tsx from devDependencies

### Against

- [L2] Team must install bun (not bundled with Node)
- [M3] Close to 100% Node API compatibility but edge cases remain

## Consequences

- All team members must install bun
- GitHub Actions uses `oven-sh/setup-bun` instead of `setup-node`

## How

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Use bun for everything
bun install              # install deps
bun run dev              # run scripts
bun test                 # run tests
bun --watch src/main.ts  # dev server
```

## Reconsider

- observe: Bun introduces breaking changes or falls behind Node.js compatibility.
  respond: Migrate to npm or pnpm.
- observe: Team grows and bun installation becomes a friction point.
  respond: Evaluate pnpm as a middle ground.

## More Info

- [Bun documentation](https://bun.sh/docs)
- [Bun test runner](https://bun.sh/docs/cli/test)
- [Bun globals](https://bun.com/docs/runtime/globals)
