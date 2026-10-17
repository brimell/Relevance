# AGENTS.md — Hackathon Team Instructions

This file applies to every AI coding agent working in this repository. We are **three human teammates, each using a separate AI agent**. Agents do not share context, memory, or uncommitted work. Treat the repository and explicit messages from teammates as the source of truth.

## Mission

Ship a **working, demonstrable product** before the hackathon deadline.

Priorities, in order:
1. An end-to-end user journey that works reliably.
2. A clear, compelling demo that shows the product's value.
3. Correctness, integration, and basic security.
4. Polish and additional features only when the core flow is stable.

Prefer the smallest solution that works. Avoid speculative abstractions, unnecessary dependencies, rewrites, and infrastructure that will not improve the demo. Do not silently substitute mocks for real functionality; label any mock or simulated behaviour clearly.

## First steps for every agent

Before changing code:
1. Read this file, the README, and relevant project configuration.
2. Inspect the current code and Git status. Do not assume the repository matches previous chat context.
3. Confirm your assigned task, its owner, the files you expect to modify, and any dependencies on another teammate.
4. Identify existing interfaces and conventions before implementing anything.
5. If the task overlaps another owner's work, **stop and request coordination** rather than racing to edit the same files.

If a detail is missing, make a modest, reversible assumption and state it in your hand-off. Ask the human owner before making an architectural decision that affects multiple workstreams.

## Git and concurrent-agent safety

- **Do not work directly on `main`.** Use a short-lived branch such as `feature/<owner>-<task>`.
- If agents operate on the same machine, prefer **separate Git worktrees**. Separate branches alone do not isolate uncommitted files in a shared working directory.
- Run `git status` and inspect the relevant diff before editing and before committing.
- Commit small, coherent units with descriptive messages. Stage only your files; prefer `git add <paths>` over `git add .`.
- Pull/rebase or merge the latest shared branch before integration, resolving conflicts deliberately and checking affected behaviour.
- Never force-push shared branches, delete another person's branch, or run destructive commands such as `git reset --hard`, `git clean -fd`, or blanket file restores without explicit human authorisation.
- Do not amend or rewrite commits authored by another teammate.
- Merge to `main` only once the relevant owner has checked the change and the minimal validation passes. For urgent hackathon merges, a brief teammate acknowledgement is sufficient; avoid elaborate review bureaucracy.

If a conflict arises, preserve both versions, consult the owners, and resolve it with the intended integration behaviour in mind. Do not choose one side merely because it is newer.

## Implementation standards

- Follow the repository's existing stack, formatting, naming, and directory structure. Do not introduce a new framework or state-management system for convenience.
- Keep functions and components understandable. Prefer straightforward code over clever abstractions.
- Validate external inputs and handle failures on user-visible paths.
- Never hard-code credentials or commit `.env` secrets. Add required variable names to `.env.example` without values and document setup briefly.
- Add dependencies only when they solve a concrete problem; tell the human owner about significant installation, cost, or external-service requirements.
- Prefer free-tier or existing services unless the team explicitly approves spending.
- Do not make unapproved purchases, deploy paid infrastructure, or perform irreversible external actions.
- Avoid changing working functionality solely to make tests pass.

## Tests and definition of done

A task is done when:
1. The feature implements the agreed behaviour and can be exercised.
2. Relevant tests, type-checks, linters, or builds have been run where available.
3. Any new environment variables, commands, or setup steps are documented.
4. The change has been committed or a precise diff/branch is ready for review.
5. The human owner receives a short hand-off covering what changed, how it was tested, and what remains.

**Never claim to have run a test you did not run.** State failures, skipped checks, and unverified assumptions plainly. If the repository has no test suite, provide exact manual verification steps and exercise the affected user journey.

## Communication and hand-offs

Because AI agents cannot communicate with one another automatically, **humans relay decisions** using the team's shared chat, task tracker, or repository documentation.

Before starting a substantial task, communicate:
- **Task:** what you are building.
- **Owner/branch:** who owns it and where the work lives.
- **Files/interfaces:** expected touchpoints and dependencies.
- **Done when:** one or two observable acceptance criteria.

At hand-off, report:
- **Implemented:** concise summary and branch/commit.
- **Changed:** key files, endpoints, interfaces, or setup steps.
- **Verified:** commands run and actual results.
- **Outstanding:** blockers, assumptions, integration needs.

If blocked, surface the specific dependency early. Move to an independent task only after confirming it does not overlap another teammate's work.

## Integration and demo discipline

- Establish a runnable skeleton and deployable path early; integrate incrementally rather than merging everything at the end.
- Maintain one agreed **golden path**: the exact sequence of actions the judges should be able to perform.
- Protect that golden path from last-minute feature additions and risky refactors.
- Make development setup reproducible with a short README: prerequisites, install, environment variables, run, and test/deploy instructions.
- Keep a fallback for unreliable external APIs (for example, seeded demonstration data), but distinguish fallback behaviour from a live integration.
- Near the deadline, prioritise integration fixes, a clean starting state, error handling, and the demo over new features.

## Conflict-resolution order

When instructions conflict, follow:
1. Explicit current instructions from the human responsible for your task.
2. Agreed team-wide architectural/interface decisions.
3. This `AGENTS.md`.
4. Existing codebase conventions.

Do not interpret silence from other teammates as approval for a breaking shared change. Escalate such decisions to the humans.
