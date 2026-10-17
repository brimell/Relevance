# AGENTS.md — Hackathon Team Instructions

This file applies to every AI coding agent working in this repository. We are **four human teammates, each using a separate AI agent**. Agents do not share context, memory, or uncommitted work. Treat the repository and explicit messages from teammates as the source of truth.

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
- After completing each change, create a commit containing that change before moving on to another change.
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

## Website design exclusions

- Do not use purple and blue gradients: Especially gradient-filled hero backgrounds
- Do not use unnecessary scroll animations: Sections fading, sliding or zooming into view
- Do not use scroll-jacking: Animations or transitions that interfere with normal scrolling
- Do not use decorative animated lines: Lines tracing paths through the page while scrolling
- Do not use disappearing hover elements: Navigation or buttons fading away on hover
- Do not use moving buttons: Buttons changing position or shifting under the pointer
- Do not use excessive hover effects: Cards moving, expanding or rotating without purpose
- Do not use low-contrast text: Pale grey text that sacrifices legibility
- Do not use weak information hierarchy: Every component competing for equal attention
- Do not use inconsistent visual styling: Unrelated effects, shapes and colours within one page
- Do not use glassmorphism everywhere: Translucent, blurred panels and floating glass cards
- Do not use excessive rounded corners: Every card, input and button using large radii
- Do not use bento grids for every section: Uniform grids of cards replacing thoughtful composition
- Do not use glowing orbs and background blobs: Blurred coloured circles behind hero content
- Do not use generic ai imagery: Robot heads, brains, neural networks and circuit illustrations
- Do not use overused gradient text: Headlines with purple, pink or blue gradient fills
- Do not use generic three-step sections: Repeated How it works → three identical cards
- Do not use unnecessary badges: AI-powered, Next generation, Introducing and similar pills
- Do not use excessive pill buttons: Fully rounded buttons regardless of brand style
- Do not use overabundant drop shadows: Every element appearing elevated or floating
- Do not use default typography everywhere: Using Inter with no considered type hierarchy
- Do not use generic lucide icon grids: Rows of identical-looking icons with vague claims
- Do not use meaningless metrics: Unsupported figures and invented testimonials
- Do not use fake activity indicators: Decorative live statuses without real data
- Do not use generic marketing language: Revolutionise your workflow, Supercharge productivity
- Do not use unnecessary animations: Constant pulsing, bouncing, spinning and shimmer effects
- Do not use oversized empty hero sections: Large headline and little useful information above the fold
- Do not use decorative dashboard mock-ups: Beautiful but fictitious charts that explain nothing

Prioritise clear hierarchy, readable text, real product demonstrations, consistent styling, native scrolling and functional interactions.

# Relevance — Website Design Language

> **Instructions for all coding agents working on the Relevance local web GUI.** Treat this section as the visual and interaction specification. Follow it when creating or modifying pages, components, styles, loading states and copy. The product brief remains the source of truth for features and architecture.

## 1. Product identity

**Relevance** is a quiet, technically credible research companion for developers. It watches a GitHub repository, finds pertinent academic papers, explains their implications for specific code, and publishes important discoveries through a GitHub bot. The local website is the user's **research workbench**: a place to inspect evidence, initiate scans and control what the bot reports.

**Core idea:** *The research that matters finds you.*

**Desired feel:** focused, analytical, precise, calm, modern, and slightly editorial. Think a well-designed developer tool crossed with an academic reading desk. It should feel at home beside GitHub and a code editor, but it must have its own identity.

**Avoid:** a generic AI chatbot, marketing landing-page aesthetics, neon cyberpunk, gratuitous gradients, glassmorphism, oversized cards, emoji, decorative blobs, excessive shadows, and breathless AI language. The product's intelligence should be visible through the quality of its findings, not through glowing ornaments.

## 2. Visual principles

1. **Evidence first.** Paper titles, provenance, publication dates, affected files and explanations take precedence over decoration or synthetic scores.
2. **Quiet proactivity.** The interface surfaces discoveries without demanding attention. Reserve prominent emphasis for genuinely important findings.
3. **Developer-native.** Code paths, GitHub issue references, commit SHAs and arXiv identifiers should look and behave like first-class objects.
4. **Dense but legible.** Optimise for desktop use and efficient scanning; avoid enormous spacing and cards containing one sentence.
5. **Progressive disclosure.** Show the conclusion and why it matters in a feed row; reveal detailed evidence and suggested actions in a side panel or detail view.
6. **Trust over theatre.** Distinguish facts reported in a paper from the model's inference about a repository. Never fabricate certainty or imply the AI ran experiments it did not run.
7. **Two surfaces, one system.** The local GUI and GitHub bot refer to the same findings and statuses. Use recognisable GitHub conventions where helpful without cloning GitHub's UI.

## 3. Theme and colour tokens

**Default: dark mode.** The interface should resemble a serious research/development workspace rather than a consumer app. Support light mode if feasible, using the same semantic tokens; do not delay core functionality to build a theme switcher.

Use semantic CSS variables, not ad hoc hex values scattered through components.

```css
:root,
[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0D1117;
  --surface: #151B23;
  --surface-raised: #1B2330;
  --surface-hover: #222D3B;
  --border: #303B4A;
  --border-subtle: #25303D;
  --text: #E6EDF3;
  --text-secondary: #A8B3C2;
  --text-muted: #8592A3;
  --accent: #83D5B2;
  --accent-hover: #A2E6C8;
  --accent-surface: #18352E;
  --accent-text: #0D211B;
  --link: #8CBFFA;
  --success: #83D5B2;
  --warning: #F2C879;
  --danger: #F18F91;
  --info: #8CBFFA;
  --focus: #A2E6C8;
}

[data-theme="light"] {
  color-scheme: light;
  --bg: #F7F9FA;
  --surface: #FFFFFF;
  --surface-raised: #F0F4F5;
  --surface-hover: #E9EFF1;
  --border: #CFD9DE;
  --border-subtle: #E1E8EB;
  --text: #17242C;
  --text-secondary: #465966;
  --text-muted: #627480;
  --accent: #167B5C;
  --accent-hover: #11664C;
  --accent-surface: #E2F4EC;
  --accent-text: #FFFFFF;
  --link: #155E9A;
  --success: #167B5C;
  --warning: #966009;
  --danger: #B73E47;
  --info: #155E9A;
  --focus: #167B5C;
}
```

**Colour usage rules:**
- Use the green/mint accent sparingly: primary CTA, selected navigation item, active scan indicator and a small number of high-confidence highlights.
- Blue is for links, not a second competing brand colour.
- Use warning amber for uncertainty or attention; red only for failures and destructive actions.
- Most screens should be composed of neutral surfaces, typography, borders and whitespace.
- Never encode status through colour alone: always include a label and/or icon.
- Avoid gradients unless a very subtle one is used on an optional marketing/empty-state illustration; none are needed for the MVP.

## 4. Typography

- **UI font:** `Inter`, falling back to `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Code/data font:** `JetBrains Mono`, falling back to `ui-monospace, SFMono-Regular, Consolas, monospace`.
- **Do not depend on remote font loading** for the locally hosted MVP. Use system fallbacks if fonts are not bundled.
- Body: **14px / 1.55**; secondary metadata: **12–13px / 1.45**; long-form finding explanations: **15px / 1.65**.
- Page title: **26–30px**, weight 600; section heading: **17–19px**, weight 600; card title: **14–16px**, weight 600.
- Prefer sentence case. Avoid all-caps except tiny overlines or technical abbreviations.
- Use tabular numerals for counts, timestamps and metrics. Use monospace for paths, hashes, arXiv IDs and commands—not entire paragraphs.
- Paper titles should be readable and allowed to wrap. Do not truncate the principal evidence just to preserve a uniform card height.

## 5. Layout and spacing

- Design desktop-first for a wide screen, while remaining usable on mobile.
- **Application shell:** left sidebar **224–240px** wide, fixed or sticky; main content fluid; optional right-hand detail drawer **360–440px**.
- **Content max-width:** approximately **1440px** for dashboards; reading/detail content **760–900px** for comfortable line length.
- **Spacing scale:** `4, 8, 12, 16, 24, 32, 48px`. Default internal component padding: **16px**; larger panels: **20–24px**.
- **Radii:** controls **6px**, cards/panels **10px**, modal/dialog **12px**. Do not use pill-shaped containers indiscriminately.
- **Borders:** generally 1px `var(--border-subtle)`; use a stronger border for selected/focused elements.
- **Shadows:** minimal. Prefer layered surfaces and borders; reserve shadows for floating menus and drawers.
- Prefer compact lists or rows for research feeds over a grid of oversized cards. A single row should usually show title, source, why it matters, and status.
- At widths below **1024px**, collapse the detail drawer into an overlay; below **768px**, collapse sidebar navigation and stack complex layouts. No horizontal overflow in ordinary reading views.

## 6. Navigation and information architecture

The MVP should have a persistent left navigation with the **Relevance** wordmark at the top and the currently selected repository prominently displayed.

Primary navigation:
1. **Overview** — repository summary, last scan, new findings, monitoring status.
2. **Discoveries** — searchable/filterable feed of research findings.
3. **Project profile** — what Relevance understands about the repository: methods, topics, assumptions, key files.
4. **Activity** — recent scans, GitHub publication events and errors (may be a compact panel for MVP).
5. **Settings** — monitored topics, GitHub publishing preferences, installation guidance.

Use the word **Discoveries** in navigation and **Findings** for individual evaluated paper-to-code matches. Do not create separate overlapping pages for "Papers", "Research", "Insights" and "Discoveries".

**Top bar:** repository name (`owner/repo`), branch if relevant, last scan timestamp, monitoring state, and a primary **Run scan** button. Keep the action in the same place across pages.

## 7. Core component patterns

### Discovery row / finding card

Every finding should contain, in this approximate order:

1. **Paper title** (links to arXiv) and compact publication metadata (authors if available, date, arXiv ID).
2. **Finding type:** `Potential improvement`, `Challenges an assumption`, or `New technique`.
3. **Why it matters:** one or two specific sentences relating the paper to this repository.
4. **Affected files:** linked paths such as `src/retrieval.py`; only show files actually identified in repository analysis.
5. **Suggested action:** one concrete, testable next step.
6. **Actions:** `View evidence`, `Open on GitHub` (when published), `Save`, `Dismiss`.

Prefer an evidence-based label such as **Strong match**, **Worth reviewing** or **Exploratory** to a spurious "97% relevance" score. If a numeric score is exposed, label it as a *model ranking score*, never a measured probability of correctness.

### Finding detail

Use a right-side drawer on desktop or a dedicated page when explanations are long. Sections:
- **Summary** — what the paper reports.
- **Why Relevance flagged it** — the inferred connection to the repository.
- **Evidence** — paper URL, abstract excerpt or quoted claim with attribution, source file links, relevant snippets when available.
- **Suggested experiment** — how the developer could validate the idea.
- **Publication status** — whether this finding was included in a GitHub issue, with a direct link.

Label inferential claims clearly, e.g. **"Possible application"**, **"Hypothesis"**, or **"Needs verification"**. Do not state that a paper disproves code unless the evidence actually supports that conclusion.

### Project profile

Present a concise **"What Relevance understands"** summary, followed by compact sections for `Objectives`, `Methods`, `Research topics`, `Key files` and `Assumptions`. Offer a clear indication that this is AI-generated and may be incomplete. If editing is implemented, make overrides visibly user-controlled.

### Scan progress

Use a small, truthful status timeline: `Queued → Reading repository → Finding papers → Evaluating matches → Publishing (if enabled) → Complete`. Stages must reflect actual backend state; do not simulate progress percentages. Include start time, errors and retry affordance. The primary button becomes **Scanning…** while active and cannot trigger duplicate jobs.

### GitHub status

Use explicit states: `Not connected`, `Connected`, `Publishing enabled`, `Published`, `Not published`, `Failed`. A published finding links to its real GitHub issue. Never display a fabricated issue number or URL.

## 8. Interaction and behaviour

- The dashboard should be **readable before interaction**. No onboarding modal should obscure useful content by default.
- Primary user flow: **Select repository → Run scan → Review discoveries → Inspect evidence → Open GitHub issue**.
- Default discovery sort: **newest high-quality findings first**; offer filters for finding type, status and date.
- A dismissed finding remains recoverable through a filter; dismissal should not silently erase history.
- Provide a clear success/error response after save, dismiss, scan and publishing actions. Use unobtrusive toasts for noncritical feedback; inline messages for failures needing action.
- Confirm destructive or irreversible actions, but not ordinary reversible filtering and saving.
- External links should be visibly external and open safely; do not make an entire row unexpectedly navigate to a different site.
- Show timestamps consistently in the user's local time, with the full date/time available on hover or in detail.
- Empty states should be specific: **No repositories connected**, **No scans yet**, **No strong matches found**, **Feed unavailable**, and **GitHub publishing disabled** are different states and need different guidance.
- A result with no trustworthy evidence should be omitted or clearly marked as speculative rather than dressed up as a confident discovery.

## 9. Motion and visual feedback

- Transitions: **120–200ms**, subtle ease-out for hover, focus, drawer opening and status changes.
- Prefer skeletons for initial list loading, small spinners for explicit actions, and a real stage indicator for scans.
- Avoid pulsing gradients, animated particle fields, auto-playing illustrations, simulated typing, and constant motion.
- Respect `prefers-reduced-motion: reduce` by disabling nonessential animations.
- Do not use animation as a substitute for communicating state in text.

## 10. Accessibility and usability

- Target **WCAG 2.2 AA** contrast and interaction practices.
- All actions must be keyboard operable with a clearly visible focus ring.
- Use semantic landmarks, headings, buttons, links and form labels. Do not implement buttons as clickable `div` elements.
- Minimum comfortable hit target: **40 × 40px** where practicable; never make tiny icons the sole way to perform important actions.
- Provide accessible names for icon-only controls and announce asynchronous scan results with appropriate live regions.
- Do not rely on hover to reveal essential information.
- Preserve useful text wrapping for long paper titles, repository names and file paths; apply safe overflow handling to code paths.
- Ensure mobile drawers and dialogs trap/manage focus correctly and close with Escape.

## 11. Icons, imagery and brand treatment

- Use **Lucide** line icons at **16–20px**, consistent stroke weight. Good candidates: `github`, `book-open`, `search`, `radar`, `file-code`, `git-pull-request`, `external-link`, `clock`, `check-circle`, `alert-triangle`, `settings`.
- Avoid emoji in product UI. Avoid generic robot-head or magic-wand illustrations.
- Wordmark: **Relevance**, typeset in the UI font at weight 650–700 with tight tracking. An optional simple mark can evoke a **signal meeting a document** or a **small focused crosshair**; it must work in monochrome at favicon size.
- Use diagrams, code excerpts and real paper metadata as the main visual interest. No stock photography is needed.
- A very restrained mint dot or signal mark may indicate active monitoring. It must not suggest that the system is continuously scanning when it is idle.

## 12. Copywriting and terminology

Write like a competent research colleague: **concise, precise, restrained**. British English. Prefer concrete verbs and qualified claims.

| Use | Avoid |
|---|---|
| `3 new findings` | `Your AI-powered discoveries are here!` |
| `This paper may be relevant to your retrieval pipeline.` | `Revolutionary research will transform your code.` |
| `Run scan` | `Unleash AI` |
| `Why this matters` | `AI magic` |
| `Suggested experiment` | `Guaranteed optimisation` |
| `Last checked 14 minutes ago` | `Monitoring everything in real time` |
| `No strong matches found` | `Nothing to see here!` |

**Never imply:** that the bot has validated a paper's empirical results, proved a performance improvement, read a full paper when it only ingested an abstract, or continuously monitored a feed when polling happens periodically.

## 13. Recommended implementation conventions

- Use **Next.js + React + TypeScript + Tailwind CSS**, matching the project brief. Use CSS variables as the semantic source of truth; map them to Tailwind theme tokens rather than hardcoding colours in JSX.
- Prefer a small, consistent component set: `AppShell`, `Sidebar`, `TopBar`, `RepositorySwitcher`, `FindingRow`, `FindingDetail`, `StatusBadge`, `ScanProgress`, `EmptyState`, `ProjectProfile`, `FilterBar`, `Toast`.
- Use a shared icon library, shared spacing and shared typography. Do not introduce a second UI kit or conflicting design language without team agreement.
- Components must handle **loading, empty, success and error** states with realistic content lengths.
- Build against the backend's shared finding schema. Do not invent fields, statuses, issue URLs, citations or confidence metrics in the UI.
- Keep API/network logic outside presentational components. Use reusable typed data models and centralised API helpers.
- Do not expose GitHub App credentials or private tokens to client-side code.
- Prefer server-derived status over optimistic claims for scan completion or GitHub publication.
- Test the core path at **1440px desktop**, **1024px laptop** and **390px mobile**.

## 14. Reference screen composition

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Relevance        owner/repository                    Last scan: 10:42   [Run scan]  │
├─────────────────┬───────────────────────────────────────────────────────────────────┤
│ Overview        │ Discoveries                                      [Filter] [Sort] │
│ Discoveries  •3 │                                                   3 new findings │
│ Project profile │ ┌───────────────────────────────────────────────────────────────┐ │
│ Activity        │ │ Potential improvement                            Strong match │ │
│ Settings        │ │ Paper title and publication metadata                           │ │
│                 │ │ Why it matters for src/retrieval.py ...                         │ │
│                 │ │ [View evidence]  [Open on GitHub]  [Save]  [Dismiss]            │ │
│                 │ └───────────────────────────────────────────────────────────────┘ │
│                 │ ┌───────────────────────────────────────────────────────────────┐ │
│                 │ │ Challenges an assumption                          Review      │ │
│                 │ │ Another paper title ...                                        │ │
│                 │ └───────────────────────────────────────────────────────────────┘ │
└─────────────────┴───────────────────────────────────────────────────────────────────┘
```

The illustration describes hierarchy, not exact pixel placement. Prefer a polished, functioning implementation over decorative fidelity.

## 15. Definition of done for UI contributions

Before marking a UI task complete, check that:

- [ ] The page follows the shared tokens, typography, spacing and navigation patterns.
- [ ] A user can tell **which repository** is being viewed and **when** it was last scanned.
- [ ] Every finding clearly separates the paper's claims from Relevance's inference.
- [ ] Paper links, affected file links and GitHub issue links are real or explicitly absent.
- [ ] Loading, empty and error states are implemented.
- [ ] Keyboard focus, labels and contrast are usable.
- [ ] The layout works on desktop and narrow screens without broken overflow.
- [ ] No needless animations, gradients, filler copy or fabricated data have been introduced.
- [ ] The interface reflects the **same shared findings and scan state** as the GitHub bot.

**Final rule:** Relevance should feel like an instrument for making better engineering decisions, not a showcase for AI-generated decoration. When in doubt, remove ornament and make the evidence clearer.
