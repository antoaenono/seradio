---
author: @antoaenono
asked: 2026-02-07
decided: 2026-02-07
status: proposed
deciders: @antoaenono @TraeDWill
tags: [git, workflow, merge]
---

# ADR: Merge Strategy

## Scenario

Which merge strategies should we allow when merging PRs into `main`?

GitHub offers three strategies: squash merge, rebase merge, and merge commit.
Each has different implications for commit history, changelog automation, and contributor workflow.
PRs may contain a single logical concern or multiple (e.g., a feature and a decision record update),
which affects whether commits should be collapsed or preserved individually.

## Drivers

- Clean, linear commit history on `main`
- Each commit on `main` follows Conventional Commits format
- Automated changelog and version bumps depend on parseable commits
- PRs sometimes contain multiple logical concerns (feature + docs, feature + decision record)
- Low friction for contributors
- Minimize merge strategy decisions per PR

## Non-Drivers

- Preserving individual in-branch commit history (messy WIP commits are fine to lose)

## Choice

Allow both squash merge and rebase merge

### Why

In the context of **choosing which merge strategies to allow on PRs**,
facing **multi-concern PRs that need distinct conventional commits**,
we decided **to allow rebase merge alongside squash merge**,
to achieve **accurate commit attribution while keeping linear history**,
accepting **contributors must choose which strategy to use and rebase requires clean commits**.

### How

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

### Consequences

- CONTRIBUTING.md updated to document both strategies
- Contributors must judge whether a PR is single or multi-concern
- Rebase PRs require all commits to follow Conventional Commits (not just the PR title)
- GitHub repo settings must enable both squash and rebase merge options
- Linear history preserved (no merge commits)
- Changelog and version bumps remain accurate across multi-concern PRs

### Evidence

- Squash + rebase is a common dual-strategy in open source projects
- Not enough information: how often contributors will need rebase in practice is unknown

### Reconsider

- observe: Contributors consistently misuse rebase (messy commits landing on `main`).
  respond: Add CI validation that checks each commit in rebase PRs follows Conventional Commits. If still a problem, revert to squash-only.
- observe: Rebase is never used: all PRs are single-concern.
  respond: Remove rebase option and simplify back to squash-only.
- observe: Team wants merge commits for traceability back to PRs.
  respond: Evaluate adding merge commits as a third strategy.

## Options

### Nothing (all strategies)

#### Good

- Good, because zero overhead: no rules to learn
- Good, because maximum flexibility for contributors

#### Bad

- Bad, because inconsistent commit history on `main`
- Bad, because merge commits create non-linear history
- Bad, because commits on `main` may not follow Conventional Commits
- Bad, because changelog and versioning automation may break

### Squash Only

#### Good

- Good, because one simple rule: all PRs squash merge
- Good, because no decision needed per PR
- Good, because PR title is always the commit message
- Good, because linear history guaranteed

#### Bad

- Bad, because multi-concern PRs produce a single conflated commit
- Bad, because changelog can misattribute changes
- Bad, because forces splitting work into separate PRs

### Merge Only

#### Good

- Good, because preserves full branch commit history
- Good, because merge commit provides clear PR boundary in history
- Good, because traceability back to PRs via merge commit

#### Bad

- Bad, because non-linear history (branching graph)
- Bad, because branch commits may not follow Conventional Commits
- Bad, because noisy history with WIP and fixup commits

### Rebase Only

#### Good

- Good, because linear history guaranteed
- Good, because each commit lands individually on `main`

#### Bad

- Bad, because every commit must follow Conventional Commits (high discipline)
- Bad, because no squash option for messy single-concern branches
- Bad, because loses PR boundary in history (no merge commit, no squash)

### Squash + Rebase

#### Good

- Good, because squash handles single-concern PRs cleanly
- Good, because rebase allows multi-concern PRs to land as distinct conventional commits
- Good, because linear history maintained in both cases

#### Bad

- Bad, because contributors must choose which strategy to use
- Bad, because rebase requires discipline to produce clean conventional commits
- Bad, because two rules to learn

## More Info

- [CONTRIBUTING.md](../../CONTRIBUTING.md) (current PR merge instructions)
