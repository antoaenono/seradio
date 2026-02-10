---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: accepted
deciders: @antoaenono @TraeDWill
tags: [git, workflow, versioning, releases]
---

# ADR: Versioning

## Scenario

We need a strategy for creating releases of our project.
This involves tagging a commit, bumping versions, generating changelogs, etc.

## Pressures

### More

1. [M1] Changelog visibility
2. [M2] Release timing control

### Less

1. [L1] Release effort
2. [L2] Tooling complexity

## Chosen Option

commit-and-tag-version - manual-trigger, one command

## Why

In the context of **automating version bumps and changelog generation**,
facing **the need for low-ceremony releases with developer control**,
we decided **to use commit-and-tag-version**,
to achieve **one-command releases that generate changelogs from conventional commits**,
accepting **that someone must remember to run it**.

## Points

### For

- [L1] Single command handles version bump, changelog, and tag
- [M1] Changelog generated locally; visible before pushing
- [L2] Lightweight - no CI integration required
- [M2] Developer controls when to release

### Against

- [L1] Someone must remember to run it

## Consequences

- `commit-and-tag-version` added to devDependencies
- `bun release` is the only command to remember
- Changelog is auto-generated from commit messages
- Developer decides when to release (not automated on CI)
- Team learns the manual release workflow

## How

A single command bumps the version, updates the changelog, and creates a git tag.

```bash
bun release            # bumps version, updates CHANGELOG.md, creates tag
git push --follow-tags # pushes commit + tag to remote
```

package.json script:

```json
{
  "release": "commit-and-tag-version"
}
```

The tool:

1. reads conventional commit messages since the last tag
2. determines the version bump
3. updates `package.json`
4. generates `CHANGELOG.md`
5. and creates a git commit & tag

## Reconsider

- observe: Releases are forgotten or inconsistent.
  respond: Upgrade to `semantic-release` for fully automated CI releases.
- observe: The team wants fully automated releases on merge to main.
  respond: Upgrade to `semantic-release` or `release-please`.

## More Info

- [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)
- [Semantic Versioning](https://semver.org/)
- Depends on: [Conventional Commits decision](../commit-message/conventional.md)
