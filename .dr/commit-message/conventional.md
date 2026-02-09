---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: proposed
deciders: @antoaenono @TraeDWill
tags: [git, workflow, commits]
---

# ADR: Commit Messages

## Scenario

We could use a commit message convention.
Without one, commit messages are inconsistent and are difficult to scan and parse in the git history.

## Drivers

- Readable commit history
- Low friction for team
- Automated changelog generation
- Versioning bumps derivable from commits

## Choice

Conventional Commits (`type: description`)

### Why

In the context of **standardizing commit messages across the team**,
facing **the need for readable history and automated versioning**,
we decided **to use Conventional Commits**,
to achieve **parseable commit messages that drive changelogs and version bumps**,
accepting **a small learning curve for the type prefixes**.

### How

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) format.

For **squash merge** PRs, branch commits may be freeform; they get squashed on merge.
It's still encouraged to follow the format (they get automatically dumped into squashed commit body), but it's not enforced.

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

Breaking changes add `!` after the type or scope (e.g., `feat!: redesign API` or `feat(auth)!: new login flow`) and bump MAJOR.

Examples:

```
feat: add audio player component
feat(player): add seek bar
fix(audio): resolve playback stutter on Safari
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

### Consequences

- Types shared with branch naming convention
- CI will enforce PR titles against the format
- Changelog and version bumps can be automated (see versioning decision)
- Squash merge allows local commits to be freeform, but PR titles are enforced
- Rebase merge PRs require every commit to follow the convention
- Team must learn type prefixes

### Evidence

- Conventional Commits spec has mass adoption: 1B+ npm downloads across tooling ecosystem

### Reconsider

- observe: The team finds the format too rigid.
  respond: Downgrade to `Nothing` by removing CI validation.
- observe: Rebase merge PRs become the norm rather than the exception.
  respond: Enforce convention on all commits, not just PR titles. Update tooling and CI accordingly.

## Options

### Nothing

#### Good

- Good, because zero overhead
- Good, because nothing to learn or enforce

#### Bad

- Bad, because commit history is unreadable
- Bad, because no automated changelog or version bumps
- Bad, because inconsistent messages across the team

### Conventional Commits

#### Good

- Good, because widely adopted standard with tooling support
- Good, because enables automated changelog and version bumps
- Good, because types align with branch naming convention
- Good, because squash merge means only PR titles need the format on most PRs

#### Bad

- Bad, because team must learn the type prefixes
- Bad, because rigid format can feel heavy for small changes

### Gitmoji

#### Good

- Good, because visual: emojis are scannable in git log
- Good, because fun and expressive

#### Bad

- Bad, because emojis are hard to type without tooling
- Bad, because less tooling support than conventional commits
- Bad, because types don't align with branch naming convention
- Bad, because harder to parse programmatically

## More Info

- [Conventional Commits spec](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits cheatsheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)
