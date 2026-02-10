# Contributing

## Overview

This guide covers five sections:

1. Branches
2. Committing
3. Pull Requests
4. Versioning
5. Decisions

## Branch Naming

Branch names follow this format:

```
type/short-description
type/#-short-description
```

Branch name **types** are the same as [commit message types](#commit-messages).
However, the **format** has minor differences:

- use a `/` instead of `:`
- branch names may have an optional issue number

### Example Branch Names

```
feat/12-audio-player
fix/15-playback-stutter
chore/update-deps
docs/20-api-reference
```

## Committing

### Commit Messages

Commit messages follow the [Conventional Commits format](https://www.conventionalcommits.org/).

For **squash merge** PRs, your commits within a branch do not have to follow Conventional Commits.
They may be unstructured ("set up boilerplate", "try greedy approach", "add test", etc.).
However, it's still encouraged to follow Conventional Commits, as a PR may end up having multiple concerns and thus require a rebase merge to preserve distinct commits.
The **PR title** becomes the squash commit message, so the title **must** follow [Conventional Commits format](https://www.conventionalcommits.org/).

For **rebase merge** PRs, each commit must individually follow Conventional Commits format, since each commit lands on `main` as-is.

#### Types

| Type       | Description      | Version Bump |
| ---------- | ---------------- | ------------ |
| `build`    | Build, configs   | None         |
| `chore`    | Maintenance      | None         |
| `ci`       | CI/CD pipeline   | None         |
| `docs`     | Documentation    | None         |
| `feat`     | New feature      | MINOR        |
| `fix`      | Bug fix          | PATCH        |
| `perf`     | Performance      | None         |
| `refactor` | Modify structure | None         |
| `revert`   | Revert a commit  | None         |
| `style`    | Formatting       | None         |
| `test`     | Tests            | None         |

Scope is optional: `type(scope): description` (e.g., `feat(player): add seek bar`).

For breaking changes: add `!` after the type or scope (e.g., `feat!: redesign API` or `feat(auth)!: new login flow`).
This automatically bumps the MAJOR version.

[Version bumps](#versioning) follow [Semantic Versioning](https://semver.org/).

#### Examples

```
feat: add audio player component
feat(player): add seek bar
fix(audio): resolve playback stutter on Safari
docs: update setup instructions
chore: update dependencies
```

### Pre-commit Hook

A pre-commit hook runs automatically when you commit. It runs on **staged files only** and does the following:

1. **Auto-fixes** formatting (Prettier) and basic linting (import sorting)
2. **Checks** for lint errors (ESLint) and type errors (TypeScript)
3. **Runs tests**

If formatting or import sorting is off, the hook fixes it for you. If there are lint or type errors that can't be auto-fixed, the commit is blocked and you'll need to fix them manually.

You can skip the hook with `--no-verify` if needed:

```bash
git commit -m "wip" --no-verify
```

## Pull Requests

1. Create a branch from `main` with an [appropriate name](#branch-naming)
2. Make commits
3. Open a PR
4. If squash merging: **PR title** must follow Conventional Commits format
5. Fill out the PR template
6. Request review
7. After approval, merge using the appropriate [merge strategy](#merge-strategy)

PRs require 1 human approval before merging.

### Merge Strategy

Two merge strategies are allowed: **squash** and **rebase**.

| PR contains       | Strategy | Commit rule                       |
| ----------------- | -------- | --------------------------------- |
| One concern       | Squash   | PR title = commit message         |
| Multiple concerns | Rebase   | Each commit = conventional commit |

**Squash merge** (default): Use for single-concern PRs. The PR title becomes the commit message on `main`.

**Rebase merge**: Use when a PR contains multiple logical concerns (e.g., a feature and a decision record update).
Before merging:

1. Interactive rebase your branch to clean up commits
2. Each commit must follow [Conventional Commits format](#commit-messages)
3. Force push the cleaned-up branch
4. Merge via rebase

Merge commits are not allowed.

## Versioning

We use [Semantic Versioning](https://semver.org/) with [`commit-and-tag-version`](https://github.com/absolute-version/commit-and-tag-version) to automate releases.

```bash
bun release        # bumps version, updates CHANGELOG.md, creates tag
git push --follow-tags # pushes commit + tag to remote
```

Version bumps are derived from commit types:

- `!` (breaking change) → MAJOR
- `feat` → MINOR
- `fix` → PATCH
- All other types → no bump

## Decision Records

### About Decision Records

Decision records help us reach and document important decisions through a **structured** approach.
These records are not strictly required, but encouraged for decisions that are impactful, complex, or have long-term consequences.

The act of reaching a decision helps us explore the space of possibilities.
Afterwards, the decision records themselves constrain that space, while offering flexibility upon certain conditions.

_In other words_:
the process of crafting a decision record
illuminates a scenario
to achieve clarity
and the artifact resulting from this process
preserves the context to easily update a decision.

### New Decisions

When making a change that involves a new decision:

1. Make a copy of **the template directory**: `.dr/_template-decision`
2. Give a name to this directory which describes the decision concisely & semantically

The template files contain further instructions.
See [ADR Template](.dr/_template-decision/nothing.md) as the starting point.

### Updating Decisions

When the boundaries of a current decision have been crossed; or, to revise a previous decision:

1. Add any new variants as necessary
2. Update variant `status`: `accepted` or `rejected`
3. Update the filename of the `guide` and its content to reflect the newly accepted option
4. Commit with a [message](#commit-messages) of `type` = `docs` (e.g., `docs(decision): use React instead of Svelte`)
5. Open a PR with the updated decision record
