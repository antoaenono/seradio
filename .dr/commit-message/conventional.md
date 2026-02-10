---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: accepted
deciders: @antoaenono @TraeDWill
tags: [git, workflow, commits]
---

# ADR: Commit Messages

## Scenario

What commit message convention should we use?

## Pressures

### More

1. [M1] Readability
2. [M2] Consistency
3. [M3] Branch convention alignment
4. [M4] Changelog automation
5. [M5] Version bump automation
6. [M6] Portability across projects/teams

### Less

1. [L1] Cognitive load
2. [L2] Length of commit message

## Chosen Option

Conventional Commits (`type: description`)

## Why

In the context of **standardizing commit messages across the team**,
facing **the need for readable history and automated versioning**,
we decided **to use Conventional Commits**,
to achieve **parseable commit messages that drive changelogs and version bumps**,
accepting **a small learning curve for the type prefixes**.

## Points

### For

- [M1] Easily scannable `git log`
- [M2] Everyone's commits follow the same format
- [M3] Types align with branch naming convention
- [M4] Enables automated changelog generation
- [M5] Version bumps derivable from commit types
- [M6] Conventional Commits is widely adopted

### Against

- [L1] Team must learn the type prefixes
- [L2] Type and scope add non-trivial length
- [L2] Scope requires per-project convention on top of the spec

## Consequences

- Types shared with branch naming convention
- Changelog and version bumps can be automated
- Team must learn type prefixes
- Team must agree on scopes

## How

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) format.

For **squash merge** PRs, branch commits may be freeform; they get squashed on merge.
It's still encouraged to follow the format
(they get automatically dumped into squashed commit body on a PR),
but it's not enforced.

For **rebase merge** PRs, each commit must individually follow Conventional Commits format, since each commit lands on `main` as-is.
See [merge strategy decision](../merge-strategy/squash-rebase.md).

```
type(scope): short description
```

Scope is optional. Use it to clarify what area of the codebase is affected.

Types:

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

Breaking changes add `!` after the type or scope and bump MAJOR version.

Examples:

```
feat(player): add audio player component
fix(audio): resolve playback stutter on Safari
feat!(auth): use OAuth2
docs: update setup instructions
chore: update dependencies
```

Optional body explains why, with lines under 80 characters:

```
feat(auth)!: add OAuth2 login flow

Password-based auth is being deprecated. Add OAuth2 as the primary
authentication method with Google and GitHub providers.

BREAKING CHANGE: Auth config now requires oauthProviders array.
```

## Reconsider

- observe: The team finds the format too rigid.
  respond: Downgrade to `Nothing` by removing CI validation.
- observe: Rebase merge PRs become the norm rather than the exception.
  respond: Enforce convention on all commits, not just PR titles. Update tooling and CI accordingly.

## More Info

- [Conventional Commits spec](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits cheatsheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)
