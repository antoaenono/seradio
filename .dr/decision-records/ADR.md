---
author: @antoaenono
asked: 2026-02-02
decided: 2026-02-02
status: accepted
deciders: @antoaenono @TraeDWill
tags: [process, decisions, documentation]
---

# ADR: Decision Records

## Scenario

How should we communicate and reach decisions for this project?

## Pressures

### More

1. [M1] Decision visibility
2. [M2] Decision quality
3. [M3] Front-loading decisions
4. [M4] Team alignment and collaboration
5. [M5] Onboarding quality

### Less

1. [L1] Process overhead
2. [L2] Writing burden
3. [L3] Time to decision

## Chosen Option

ADRs - structured decision records in the repo

## Why

In the context of **needing a way to communicate and reach decisions**,
facing **fragmented knowledge and decisions lost in communication threads**,
we decided **to use Architecture Decision Records (ADRs)**,
to achieve **a findable, structured decision history with documented alternatives and tradeoffs**,
accepting **extra files to maintain and process overhead for a small team**.

## Points

### For

- [M1] Decisions are structured, findable, and revisitable
- [M2] Structured format forces consideration of tradeoffs and alternatives
- [M3] Process encourages deciding before implementing
- [M4] Team reviews and agrees on decisions through the ADR process
- [M5] Onboarding artifact - read the ADRs, understand the project

### Against

- [L1] Adds to process overhead for a small team
- [L2] Extra files to create and maintain
- [L3] Writing and reviewing ADRs takes time before work can begin

## Consequences

- `.dr/` directory added to the repo with structured decision files
- Every decision gets multiple variant files, one per option considered
- Rejected alternatives are preserved with reasoning
- New teammates read the ADR directory to understand why the project looks the way it does
- Someone must write the ADR files

## How

ADRs are for decisions worth documenting; routine changes and small fixes don't need them.
When a decision warrants an ADR, it gets a directory under `.dr/` with a file per option.
Each file is a self-contained document with scenario, pressures, the choice, reasoning, consequences, and points for/against.

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

## Reconsider

- observe: ADR files go stale and nobody updates them.
  respond: Downgrade to PRs for less ceremony. Keep existing ADRs as historical artifacts.
- observe: Team finds the per-variant file structure too verbose.
  respond: Simplify to single-file ADRs or downgrade to PRs.

## More Info

- [Michael Nygard's ADR blog post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
