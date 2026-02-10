---
author: @antoaenono
asked: 2026-02-07
decided: 2026-02-07
status: accepted
deciders: @antoaenono @TraeDWill
tags: [git, workflow, merge]
---

# ADR: Merge Strategy

## Scenario

Which merge strategies should we allow when merging PRs into `main`?

## Pressures

### More

1. [M1] Linear history
2. [M2] Commit convention compliance
3. [M3] Changelog accuracy
4. [M4] Multi-concern PR support

### Less

1. [L1] Decision overhead per PR
2. [L2] Workflow complexity
3. [L3] Commit cleanup burden

## Chosen Option

Allow both squash merge and rebase merge

## Why

In the context of **choosing which merge strategies to allow on PRs**,
facing **multi-concern PRs that need distinct conventional commits**,
we decided **to allow rebase merge alongside squash merge**,
to achieve **accurate commit attribution while keeping linear history**,
accepting **contributors must choose which strategy to use and rebase requires clean commits**.

## Points

### For

- [M1] Linear history maintained in both cases
- [M2] Squash enforces PR title; rebase enforces each commit
- [M3] Changelog and version bumps remain accurate across multi-concern PRs
- [M4] Rebase allows multi-concern PRs to land as distinct conventional commits

### Against

- [L1] Contributors must choose which strategy to use per PR
- [L2] PR title must follow Conventional Commits format (for squash)
- [L2] Each commit must follow Conventional Commits format (for rebase)
- [L2] Must learn interactive rebase workflow
- [L3] Rebase requires cleaning up commits before merging

## Consequences

- Contributors must judge whether a PR is single or multi-concern
- Rebase PRs require all commits to follow Conventional Commits
- Linear history preserved (no merge commits)
- Changelog and version bumps remain accurate across multi-concern PRs

## How

**Default: squash merge** for single-concern PRs (most PRs).

- PR title must follow Conventional Commits format
- All commits squashed into one

**Rebase merge** for multi-concern PRs.

- Each commit in the PR must individually follow Conventional Commits format
- Contributor rebases their branch to produce clean, distinct commits before merging
- Each commit lands individually on `main`

When to use which:

| PR type           | Strategy | Commit rule                       |
| ----------------- | -------- | --------------------------------- |
| Single concern    | Squash   | PR title = commit message         |
| Multiple concerns | Rebase   | Each commit = conventional commit |

## Reconsider

- observe: Contributors consistently misuse rebase (messy commits landing on `main`).
  respond: Add CI validation that checks each commit in rebase PRs follows Conventional Commits. If still a problem, revert to squash-only.
- observe: Rebase is never used: all PRs are single-concern.
  respond: Remove rebase option and simplify back to squash-only.
- observe: Team wants merge commits for traceability back to PRs.
  respond: Evaluate adding merge commits as a third strategy.

## More Info
