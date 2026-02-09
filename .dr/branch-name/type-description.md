---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: proposed
deciders: @antoaenono @TraeDWill
tags: [git, workflow, branching]
---

# ADR: Branch Naming

## Scenario

We could use a branch naming convention.
Without one, branch names are arbitrary (`fixing-it`, `stuff`, `wip-ting`) and carry no semantic meaning.
It's hard to tell what a branch is for, which can be cleaned up, or how they relate to issues and PRs.

## Drivers

- Readability at a glance via `git branch`
- Consistency across team
- Minimal cognitive load to remember the convention
- Low friction (shouldn't slow anyone down or make branching more difficult)
- Alignment with commit message conventions (Conventional Commits)

## Choice

`type/description` with optional issue number

### Why

In the context of **needing a branch naming convention**,
facing **inconsistent branch names that carry no semantic meaning**,
we decided **to use `type/description` with optional issue number**,
to achieve **at-a-glance branch purpose and alignment with conventional commit types**,
accepting **a small learning curve for the team**.

### How

Branches follow `type/description` or `type/#-description`. Types mirror conventional commits.

```bash
git checkout -b feat/12-audio-player
git checkout -b fix/15-playback-stutter
git checkout -b chore/update-deps
git checkout -b docs/20-api-reference
```

Types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

Include the GitHub issue number when one exists.

### Consequences

- Branch type matches PR title type (both use Conventional Commit types)
- Can filter branches by type (`git branch | grep feat/`)
- Issue number in branch name links to GitHub issue automatically
- Team must learn the type prefixes (same ones used for commits)

### Evidence

- Conventional commit types are widely adopted
- `type/description` is a common branch naming pattern in open-source projects

### Reconsider

- observe: Team finds the convention too rigid or annoying.
  respond: Drop back to `nothing`.
- observe: Team grows and we need to distinguish branches by author.
  respond: Upgrade to `user/type/description`.

## Options

### Nothing

#### Good

- Good, because zero overhead
- Good, because nothing to learn or enforce
- Good, because no friction when creating branches

#### Bad

- Bad, because branch names carry no semantic meaning
- Bad, because can't filter or sort branches by type
- Bad, because PR list (from GitHub web interface) gives no context at a glance
- Bad, because harder to correlate branches with issues

### type/description

#### Good

- Good, because branch type matches conventional commit types
- Good, because easy to filter branches by type (`git branch | grep feat/`)
- Good, because optional issue number links branch to GitHub issue
- Good, because minimal overhead once learned
- Good, because can be enforced via pre-commit hooks or CI checks

#### Bad

- Bad, because requires the team to learn and follow a convention

### user/type/description

#### Good

- Good, because immediately clear who owns the branch
- Good, because easy to filter your own branches (`git branch | grep antoaenono/`)
- Good, because includes all benefits of `type/description`
- Good, because can be enforced via pre-commit hooks or CI checks

#### Bad

- Bad, because longer branch names (more overhead than `type/description`)
- Bad, because redundant with GitHub's branch author info

## More Info

- [Conventional Commits](https://www.conventionalcommits.org/)
