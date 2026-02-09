---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: accepted
deciders: @antoaenono @TraeDWill
tags: [git, workflow, branching]
---

# ADR: Branch Naming

## Scenario

What branch naming convention should we use?

## Pressures

### More

1. [M1] Readability
2. [M2] Consistency
3. [M3] Traceability to issues
4. [M4] Traceability to commits/PRs
5. [M5] Filterability
6. [M6] Portability across projects/teams
7. [M7] Commit convention alignment

### Less

1. [L1] Cognitive load
2. [L2] Length of branch name

## Chosen Option

`type/description` with optional issue number

## Why

In the context of **needing a branch naming convention**,
facing **inconsistent branch names that carry no semantic meaning**,
we decided **to use `type/description` with optional issue number**,
to achieve **at-a-glance branch purpose and alignment with conventional commit types**,
accepting **a small learning curve for the team**.

## Points

### For

- [M1] Single branch name conveys purpose at a glance
- [M1] Active work across project scannable from `git branch`
- [L1] Minimal overhead once learned, same types used for commits
- [M2] All branches follow the same pattern across the team
- [M3] Optionally include issue number to link branch to GitHub issue
- [M4] Branch type in PR header matches PR intent
- [M5] Easy to filter by type (`git branch | grep feat/`)
- [M6] Convention is widely adopted, transferable across projects/teams
- [M7] Same type vocabulary across branches, commits, and PRs (for squash merges)

### Against

- [L1] Team must learn the type prefixes

## Consequences

- Branches are self-describing and filterable
- One type vocabulary shared across branches, commits, and PRs
- Team needs to learn list of type prefixes

## How

Branches follow `type/description` or `type/#-description`.

Include the GitHub issue number when one exists.

Types mirror conventional commits: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

Example usage:

```bash
git checkout -b feat/12-audio-player
git checkout -b fix/15-playback-stutter
git checkout -b chore/update-deps
```

## Reconsider

- observe: Team finds the convention too rigid or annoying.
  respond: Drop back to `nothing`.
- observe: Team grows and we need to distinguish branches by author.
  respond: Upgrade to `user/type/description`.

## More Info

- [Conventional Commits](https://www.conventionalcommits.org/)
