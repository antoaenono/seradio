---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: proposed
deciders: @antoaenono @TraeDWill
tags: [process, decisions, documentation]
---

# ADR: Decision Records

## Scenario

Need a way to communicate and reach decisions for this project.

When decisions are made implicitly during implementation,
changing course after the work is done is expensive.

## Drivers

- Visibility of decisions to entire team
- Understand the reasoning behind choices, not just the outcome
- Decisions must be able to be updated as time goes on
- Low friction: process shouldn't slow down a small team
- Onboarding: a new teammate or outsider should be able to reconstruct the project's history
- Optionally and incrementally adoptable
- Encourages collaboration and focus on the right work from the start

## Choice

ADRs — structured decision records in the repo

### Why

In the context of **needing a way to communicate and reach decisions**,
facing **fragmented knowledge and decisions lost in communication threads**,
we decided **to use Architecture Decision Records (ADRs)**,
to achieve **a findable, structured decision history with documented alternatives and tradeoffs**,
accepting **extra files to maintain and process overhead for a small team**.

### How

ADRs are for decisions worth documenting; routine changes and small fixes don't need them.
When a decision warrants an ADR, it gets a directory under `.dr/` with a file per option.
Each file is a self-contained document with scenario, drivers, the choice, reasoning, consequences, and all options listed for comparison.

```
.dr/
  branch-name/
    nothing.md
    type-description.md
    user-type-description.md
  commit-message/
    nothing.md
    conventional.md
    gitmoji.md
```

Each variant (Markdown file) follows a template.

### Consequences

- `.dr/` directory added to the repo with structured decision files
- Every decision gets multiple variant files: one per option considered
- Rejected alternatives are preserved with reasoning
- Team members can read the full decision space, not just the outcome
- New teammates read the ADR directory to understand why the project looks the way it does
- Overhead: someone must write the ADR files

### Evidence

- ADRs are a well-established practice: Michael Nygard introduced them in 2011, widely adopted in enterprise and open-source

### Reconsider

- observe: ADR files go stale and nobody updates them.
  respond: Downgrade to PRs for less ceremony. Keep existing ADRs as historical artifacts.
- observe: Team finds the per-variant file structure too verbose.
  respond: Simplify to single-file ADRs or downgrade to PRs.

## Options

### Nothing

#### Good

- Good, because zero overhead
- Good, because nothing to learn or maintain
- Good, because no friction when making decisions

#### Bad

- Bad, because decisions are invisible and ephemeral
- Bad, because team members learn outcomes but not reasoning
- Bad, because onboarding has no artifact to reference
- Bad, because decisions get relitigated when nobody remembers the original reasoning

### PRs

#### Good

- Good, because decisions live where the code changes happen
- Good, because no extra files or tooling
- Good, because already part of the GitHub workflow
- Good, because lightweight: just a PR template

#### Bad

- Bad, because decisions are scattered across PRs
- Bad, because no way to compare alternatives that weren't chosen
- Bad, because hard to find "the PR where we decided X"

### ADRs

#### Good

- Good, because decisions are structured, findable, and revisitable
- Good, because rejected alternatives are documented with reasoning
- Good, because team members learn the decision-making process, not just the outcome
- Good, because onboarding artifact: read the ADRs, understand the project

#### Bad

- Bad, because extra files to create and maintain
- Bad, because process overhead for a small team
- Bad, because ADRs can go stale if not revisited

### RFCs

#### Good

- Good, because structured async discussion before commitment
- Good, because well-established process in large open-source projects
- Good, because forces thorough thinking through detailed design section

#### Bad

- Bad, because designed for large async communities, not small co-located teams
- Bad, because heaviest writing burden of all options
- Bad, because discussion lives in PR comments, separate from the document itself

## More Info

- [Michael Nygard's ADR blog post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
