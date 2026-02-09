# Guide: Decision Records - ADRs

We utilize Decision Records when appropriate.

## ADRs

A Decision Record (ADR) is incrementally adoptable - you don't always need one.
On the other hand, ADR may be the first commit of any body of work.
Even if ADR remains `proposed`, one is not restricted from beginning implementation.

## PRs

When to create a Pull Request:

- immediately after scaffolding ADR & each option, tag a reviewer for feedback on the decision
- or, wait until after implementation (as usual)

## Revisions

Revise existing ADRs in place - update files, let git history track evolution.
Don't create new ADR directory to override a previous decision.

## Nothing Option

There is always a `nothing` variant for the "do nothing" option.
