---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: proposed
deciders: @antoaenono @TraeDWill
tags: [git, workflow, versioning, releases]
---

# ADR: Versioning

## Scenario

We need a strategy for creating releases of our project.
This involves tagging a commit, bumping versions, generating changelogs, etc.

## Drivers

- Automated process that doesn't burden team
- Works with our squash merge and rebase merge + conventional commits workflow
- Follows semantic versioning

## Non-Drivers

- Release cadence (release whenever ready, not on a fixed schedule)

## Choice

commit-and-tag-version — manual-trigger, one command

### Why

In the context of **automating version bumps and changelog generation**,
facing **the need for low-ceremony releases with developer control**,
we decided **to use commit-and-tag-version**,
to achieve **one-command releases that generate changelogs from conventional commits**,
accepting **that someone must remember to run it**.

### How

A single command bumps the version, updates the changelog, and creates a git tag.

```bash
bun release        # bumps version, updates CHANGELOG.md, creates tag
git push --follow-tags # pushes commit + tag to remote
```

package.json script:

```json
{
  "release": "commit-and-tag-version"
}
```

The tool reads conventional commit messages since the last tag, determines the version bump, updates `package.json`, generates `CHANGELOG.md`, and creates a git commit & tag.

### Consequences

- `commit-and-tag-version` added to devDependencies
- `bun release` is the only command to remember
- Changelog is auto-generated from commit messages
- Developer decides when to release (not automated on CI)
- Team learns the manual release workflow

### Evidence

- commit-and-tag-version is a well-maintained fork of standard-version with active community
- Depends on conventional commits being adopted: those are proposed

### Reconsider

- observe: Releases are forgotten or inconsistent.
  respond: Upgrade to `semantic-release` for fully automated CI releases.
- observe: The team wants fully automated releases on merge to main.
  respond: Upgrade to `semantic-release` or `release-please`.

## Options

### Nothing

#### Good

- Good, because zero dependencies
- Good, because nothing to learn

#### Bad

- Bad, because manual version bumps are error-prone
- Bad, because changelog drifts or gets skipped
- Bad, because no connection between commits and versions

### commit-and-tag-version

#### Good

- Good, because single command bumps version + changelog + tag
- Good, because developer controls when to release
- Good, because lightweight: no CI integration required
- Good, because changelog is generated from conventional commits

#### Bad

- Bad, because someone must remember to run it
- Bad, because release timing is inconsistent
- Bad, because release commit lands directly on the branch: no PR, no review

### semantic-release

#### Good

- Good, because fully automated: no human step
- Good, because version bump, changelog, tag, and GitHub release happen on merge to main
- Good, because release is always in sync with commits
- Good, because enforces conventional commits end-to-end

#### Bad

- Bad, because requires CI configuration (GitHub Actions)
- Bad, because less visible: releases happen "magically"
- Bad, because harder to debug when something goes wrong
- Bad, because juniors don't learn the manual release process
- Bad, because commit + tag happen in CI: no PR, no review step

### release-please

#### Good

- Good, because automated release PRs show what's about to ship
- Good, because human reviews and merges the release PR
- Good, because changelog is visible and reviewable before release
- Good, because release goes through the same PR process as all other changes

#### Bad

- Bad, because extra PR noise in the repo
- Bad, because more complex CI setup than semantic-release
- Bad, because Google-specific tooling with smaller community

## More Info

- [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)
- [Semantic Versioning](https://semver.org/)
- Depends on: [Conventional Commits decision](../commit-message/conventional.md)
