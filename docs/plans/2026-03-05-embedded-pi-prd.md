# BeadBoard Embedded Pi PRD

**Date:** 2026-03-05
**Status:** PRD + active implementation reference
**Branch:** `docs/embedded-pi-prd`
**Owner:** Pi
**Scope:** Canonical planning document for embedded Pi in BeadBoard. This document supersedes ad hoc notes for this feature and should be treated as the single source of truth for implementation planning and review.
**Implementation roadmap / shipped status:** `docs/plans/2026-03-05-embedded-pi-roadmap.md`

---

## 0. Why this document exists

BeadBoard already has a meaningful multi-agent coordination product surface:

- activity/timeline view (replaces deprecated sessions hub concept)
- a mailbox model with categories like `HANDOFF`, `BLOCKED`, and `INFO`
- an agent registry
- reservations and liveness
- mission/swarm concepts
- archetypes and templates
- a graph view, social/task view, and contextual inspectors
- a runtime manager and global install model

What it does **not** yet do is let the user launch a real agent from the frontend and have that agent actually execute work under BeadBoard's runtime and UI model.

This PRD defines how **Pi** should become BeadBoard's first embedded execution runtime.

This document started as a planning-only PRD. It is still the canonical product/architecture target, but implementation has now begun.

For shipped work and remaining gaps, see:
- `docs/plans/2026-03-05-embedded-pi-roadmap.md`

As of 2026-03-06, the project has already shipped a meaningful Embedded Pi foundation, including:
- managed Pi bootstrap/runtime plumbing
- embedded project orchestrator session creation
- frontend prompt submission from the left panel
- realtime runtime telemetry in the app
- chat-style orchestrator transcript foundation in the left panel
- BeadBoard-aware tool execution from the embedded orchestrator

This PRD remains the canonical target state; the roadmap tracks what has already been done versus what still remains.

---

## 1. Product summary

BeadBoard should evolve from a coordination-and-visibility layer into a coordination-plus-execution layer.

In v1, the first execution runtime will be **Pi**.

BeadBoard should ship with a **BeadBoard-owned embedded Pi system** that:

- runs under BeadBoard's runtime manager
- is installed and versioned as part of BeadBoard's global runtime
- maintains project-scoped state and context
- exposes a long-lived **orchestrator Pi** per project
- can spawn **worker Pi instances** to perform actual work
- maps BeadBoard **archetypes** to real executable agent types
- uses BeadBoard **templates** as the default recommended launch structure
- integrates into BeadBoard's existing UI instead of bolting on a parallel product

Pi in BeadBoard should not feel like “an assistant tab.”
It should feel like BeadBoard gained a native execution substrate.

The BeadBoard frontend should ultimately act as a client of the host-resident `bb` daemon rather than the owner of runtime execution.

---

## 2. Core product thesis

### 2.1 What BeadBoard already is
BeadBoard is not merely a task board. It is already a control plane for:

- work topology
- agent coordination
- task ownership and reservations
- structured handoffs
- mission/swarm composition
- graph-aware planning
- real-time operational visibility

### 2.2 What is missing
Today, a user can shape work, assign archetypes, inspect missions, and coordinate agent-like structures in the UI, but cannot launch a real autonomous worker from the frontend to do the work.

The current user workaround is effectively:

1. invoke an external coding agent manually
2. tell it to use the BeadBoard driver skill
3. tell it what task to work on
4. watch the coordination data appear back inside BeadBoard

That means BeadBoard already has the **coordination shell**, but the actual execution loop lives outside the product.

### 2.3 What embedded Pi changes
Embedded Pi brings execution *into* the BeadBoard operating model.

After this feature, the user should be able to:

- launch work from the frontend anywhere there is work
- talk to the project's long-lived orchestrator
- ask the orchestrator to dispatch worker agents
- let the orchestrator choose archetypes and worker instances
- observe worker lifecycle and decisions in BeadBoard's native surfaces
- steer or intervene without leaving BeadBoard

---

## 3. Goals

### 3.1 Product goals
- Make BeadBoard capable of launching real autonomous work from the frontend
- Preserve BeadBoard's existing coordination semantics instead of bypassing them
- Make embedded Pi feel native to the app, not like an external plugin panel
- Treat archetypes as real execution concepts, not just UI labels
- Make templates the default recommended orchestration structure
- Make orchestration explainable and inspectable
- Preserve extensibility so BeadBoard can support runtimes other than Pi later

### 3.2 Technical goals
- Run Pi under the existing BeadBoard runtime-manager/global-runtime model
- Keep BeadBoard runtime ownership global, but state/project context project-scoped
- Define a stable BeadBoard-to-Pi contract instead of exposing raw Pi internals to the frontend
- Use one long-lived orchestrator Pi per project
- Support multiple worker Pi instances per project
- Integrate worker lifecycle into BeadBoard sessions, timeline, and mail/coordination surfaces
- Define a clean runtime abstraction for future non-Pi runtimes

### 3.3 UX goals
- Let users launch Pi anywhere there is work
- Preserve existing UI strengths instead of fighting them
- Avoid overloading the right panel with full agent conversation responsibilities
- Give the orchestrator a persistent home that fits the app's shell
- Keep agent execution visible through ambient telemetry and native UI state

---

## 4. Non-goals for v1

- Supporting multiple execution runtimes on day one
- Making every Pi conversation exposed directly as raw Pi protocol UI
- Replacing BeadBoard's existing coordination semantics with Pi-native abstractions
- Treating agent execution as a separate standalone page/app inside BeadBoard
- Finalizing a perfect permanent naming ontology for all agent instances
- Solving all long-term memory/persona/runtime policy customization in v1
- Building implementation in this session

---

## 5. Foundational constraints

### 5.1 This must fit BeadBoard as it exists
The design must work with the existing BeadBoard shell and interaction patterns, including:

- `UnifiedShell`
- left panel navigation
- middle-panel views (`social`, `graph`, etc.)
- right panel contextual inspection
- activity/timeline conversation model
- mission inspector and swarm controls
- URL-state-driven app behavior
- runtime-manager/global install strategy

### 5.2 Do not treat Pi as the product abstraction
Pi is the first execution runtime, not the top-level product model.

BeadBoard's frontend should speak in BeadBoard concepts:
- projects
- missions
- tasks
- archetypes
- templates
- agent types
- agent instances
- sessions
- launch policies

Pi should sit behind a BeadBoard-owned runtime boundary.

### 5.3 Extensibility is the highest-order architectural value
Jordan explicitly stated that extensibility is critically important to the app in general.

Therefore:
- archetypes must matter to execution
- runtime abstraction must exist even if only Pi is supported initially
- launch policy should not hard-code a small finite forever-roster model
- UI and data models should separate agent type, agent instance, and runtime backend

---

## 6. Canonical runtime model

### 6.1 Runtime ownership
BeadBoard owns the runtime globally.

Embedded Pi should run as part of the BeadBoard-managed runtime installed under the existing global runtime model:
- `~/.beadboard/runtime/<version>`
- stable launch via BeadBoard's command shims and runtime metadata

### 6.2 State scope
Although runtime ownership is global, the embedded Pi system should use **project-scoped state and context**.

That means:
- project-specific orchestrator state
- project-specific worker sessions
- project-specific launch history
- project-specific task/mission awareness
- project-specific mail/coordination mapping

### 6.3 V1 runtime support policy
V1 should support **Pi only**, but the architecture must leave room for other runtimes later.

Therefore BeadBoard should plan for:
- a runtime adapter/driver boundary
- runtime-specific spawn and session handling
- a future where Pi is the first runtime, not the final only runtime

---

## 7. Canonical agent model

### 7.1 Long-lived orchestrator
Each project should have **one long-lived orchestrator Pi**.

The orchestrator is responsible for:
- receiving launch requests
- interpreting task/mission/template context
- selecting archetypes
- deciding when to duplicate worker types
- deciding when to deviate from templates
- emitting explanations and approval requests
- monitoring worker progress and coordination state

### 7.2 Archetypes as executable agent types
Archetypes should correspond to real executable agent types.

This is a critical product decision.
Archetypes are not merely descriptive metadata or frontend labels. They should define launchable worker categories.

Implication:
- creating more archetypes creates more agent types BeadBoard can use
- archetypes become part of execution topology, not just planning UI

### 7.3 Worker instances
Actual executing workers should be **runtime instances** of archetype-backed agent types.

If an archetype-backed worker is already busy and more capacity is needed, BeadBoard should create an additional worker instance of that archetype.

This gives a clear scaling model:
- archetype = stable executable type
- worker instance = concrete runtime spawn of that type

### 7.4 Identity model
The design must distinguish between at least three layers:

1. **Archetype / agent type**
   - stable
   - user-facing
   - reusable
   - configurable

2. **Worker instance**
   - runtime-bound
   - task/mission attached
   - duplicate-able
   - ephemeral or long-lived by policy

3. **Conversation/session**
   - communication surface
   - may outlive a single UI focus state
   - must be represented in BeadBoard's session model

These must not collapse into one muddy concept.

---

## 8. Template policy

### 8.1 Default rule
Templates are **highly recommended by default**.

The orchestrator should treat the selected or implied template as the preferred launch structure unless it clearly does not make sense.

### 8.2 Orchestrator flexibility
The orchestrator should be allowed to deviate from the template when necessary.
Examples:
- task graph reality conflicts with template assumptions
- required archetype is unavailable or duplicated incorrectly by default template
- concurrency need exceeds template composition
- blocker/graph state requires a different rollout order

### 8.3 Deviation policy
Template deviations must:
- always be explained and recorded
- sometimes require confirmation

#### Explanation policy
Every significant deviation should write one canonical structured record that can be rendered in multiple surfaces.

#### Confirmation policy
If the deviation is large or materially changes the launch composition:
- ask for confirmation unless auto mode is enabled

### 8.4 Canonical rendering surfaces for deviations
One canonical structured record should feed:
- timeline / activity surfaces
- social/graph/activity conversation surfaces
- mission/swarm inspectors
- any future orchestration-specific views

---

## 9. Pi configuration model

### 9.1 BeadBoard-owned Pi, not personal Pi
The embedded Pi system must be fully separate from the user's personal Pi config.

This means it must not rely on:
- `~/.pi/agent/` as production BeadBoard runtime identity
- personal Pi extensions/skills as BeadBoard runtime config
- personal Pi sessions as BeadBoard state

BeadBoard needs its own:
- Pi runtime/config root
- identity files
- extensions
- skills
- session/state directories

### 9.2 Layered config policy
Archetypes should be allowed to influence Pi behavior, but in a layered and controlled way.

Recommended layering:
1. BeadBoard global runtime defaults
2. project/orchestrator defaults
3. archetype-level overrides
4. task/mission-specific launch parameters

### 9.3 Allowed archetype influence
Archetypes should be able to shape at least:
- system prompt / identity fragments
- tool access policy
- preferred model / reasoning level
- task-launch posture
- safe behavioral hints

But this should be constrained by guardrails and fallback defaults.

---

## 10. UI architecture

## 10.1 Existing UI constraint
BeadBoard already has a meaningful UI shell with:
- left panel navigation and epic structure
- middle-panel work views
- right-panel contextual inspection
- existing drawers and inspector patterns

The embedded Pi design must fit this existing shell.

## 10.2 Primary UI principle
Pi spawning should be available **anywhere there is work**.

That includes at minimum:
- task cards
- graph nodes
- epic contexts
- swarm/mission views
- blocked/triage interactions
- activity view contexts

## 10.3 Left sidebar proposal
The strongest current planning direction is:

### Left sidebar becomes dual-mode
The left sidebar should support:
- **Epic / navigation mode**
- **Main orchestrator chat mode**

This aligns with the app better than forcing the orchestrator into the right panel.

### Why this is preferable
The right panel is already needed for rich contextual detail. Making it the primary home of full Pi conversation would overload it and force tradeoffs between inspection and execution.

The left panel, by contrast, is a better place for:
- control-plane interaction
- long-lived orchestrator chat
- dispatch and steering
- project-level planning and spawn coordination

### Compact/expanded behavior
The left rail's orchestrator mode should be compact by default but expandable into a richer thread in the same surface.

## 10.4 Middle panel proposal
The middle panel should remain the main work surface.

Epic selection/filtering should be available directly in the middle-panel flow on all views, so that using the left sidebar for orchestrator interaction does not destroy structural task scoping.

## 10.5 Right panel proposal
The right panel should remain focused on contextual detail, including:
- task thread detail
- mission detail
- command feed detail
- swarm/mission inspector detail
- worker-specific or task-specific contextual insight

The right panel should not be the default main home for orchestrator chat.

## 10.6 Bottom console proposal
A bottom console is still useful, but not as the primary conversation home.

It should act as a **runtime telemetry console** and show things like:
- orchestrator decisions
- worker spawn events
- launch attempts
- template deviations
- approval-needed events
- worker failure/completion status
- runtime/system messages

So the shell becomes:
- **left** = orchestrator / navigation
- **middle** = work views
- **right** = contextual detail
- **bottom** = live runtime console/telemetry

This is the most holistic shell model currently identified.

---

## 11. Conversation model

### 11.1 Conversation should not be a separate app
The embedded Pi system should not feel like a disconnected chat assistant page.

Conversation should be integrated into existing BeadBoard structures.

### 11.2 Three conversation scopes
The design should support at least three scopes of interaction:

1. **Orchestrator conversation**
   - project-level
   - launch, dispatch, policy, explanation, intervention

2. **Worker conversation**
   - task- or mission-local
   - status, steering, redirect, review, intervention

3. **System/execution event stream**
   - not freeform conversation
   - runtime console and event surfaces

### 11.3 Sessions hub role
The sessions hub should become the deeper social/agent conversation and monitoring surface.

Main shell launch controls start/focus agent work, while sessions hub provides:
- deep conversation history
- worker monitoring
- handoff inspection
- worker redirection and coordination review

---

## 12. Spawn model

### 12.1 Default launch behavior
The primary launch path should be **orchestrator-mediated**.

The default flow is:
1. user acts on a task/mission/epic/swarm from the frontend
2. BeadBoard packages context and sends a request to the orchestrator
3. orchestrator uses template-first logic and current graph/task state
4. orchestrator chooses archetypes and worker count
5. orchestrator requests worker creation through the runtime layer
6. BeadBoard reflects the resulting worker instances back into native surfaces

### 12.2 Direct launch behavior
Manual/direct worker launch should also be possible as a lower-level mode for power users and debugging.

### 12.3 Launch should be local to work surfaces
The user should be able to start agent work from anywhere work appears.

That means launch affordances should exist in:
- social/task cards
- DAG/graph nodes
- swarm views
- mission inspectors
- sessions contexts
- blocked triage contexts

### 12.4 Launch should package context automatically
The app should not require the user to manually restate task context in natural language every time.

A launch event should automatically include relevant state like:
- task id
- epic/mission context
- template id
- archetype hints
- graph blockers/unlocks
- project root
- current coordination/mailbox status if relevant

---

## 13. Surface-by-surface UX behavior

### 13.1 Social/task cards
Social/task cards should support:
- inspect/select (default click)
- explicit agent-launch affordance
- ask orchestrator
- assign archetype and execute
- blocked/unblocked context-aware actions

Task click should remain inspect-first. Pi launch should be an explicit secondary action.

### 13.2 DAG / graph view
Graph view should support Pi launch especially well because users are reasoning over dependency structure there.

Likely launch actions:
- ask orchestrator about this node
- unblock this chain
- start implementation
- review this branch
- investigate dependency bottleneck

Graph launches should include graph-context packaging.

### 13.3 Swarm / mission views
Swarm and mission views should be orchestrator-native surfaces.

These are where users are most likely to:
- apply templates
- deploy archetype mixes
- launch mission execution
- add/duplicate workers
- reason about mission structure

### 13.4 Sessions hub
Sessions hub should primarily support:
- monitoring running agents
- steering existing workers
- intervention and communication
- reading handoffs/blockers/info messages
- inspecting agent history

### 13.5 Timeline / activity surfaces
These should support reactive interactions like:
- retry failed launch
- inspect decision explanation
- re-open conversation from runtime event
- ask orchestrator to explain or re-plan

---

## 14. Communication architecture

### 14.1 Frontend should not speak raw Pi
The frontend should communicate with a BeadBoard-owned runtime/service layer, not directly with raw Pi internals.

### 14.2 Recommended communication path
**Frontend → BeadBoard server/runtime layer → embedded Pi runtime(s)**

This allows BeadBoard to:
- preserve its own product abstractions
- own session and runtime routing
- normalize event shapes for the frontend
- swap or add runtimes later

### 14.3 Canonical BeadBoard concepts the frontend should send
The frontend should request things in BeadBoard-native terms, such as:
- launch mission from template
- ask orchestrator about task
- spawn worker of archetype X on task Y
- duplicate reviewer archetype instance
- steer worker session
- stop worker
- approve template deviation

### 14.4 Canonical event categories BeadBoard should emit back
The BeadBoard runtime should emit BeadBoard-native events like:
- orchestrator planning
- spawn requested
- worker started
- worker idle/working/blocked/completed/failed
- deviation proposed
- deviation approved/rejected
- mailbox/handoff generated
- session updated

---

## 15. Data model additions (conceptual)

The PRD does not finalize exact schemas, but implementation should likely add or formalize concepts equivalent to:

- **agent type**
  - archetype-backed executable definition

- **agent instance**
  - runtime worker/orchestrator instance

- **runtime backend**
  - Pi in v1, others later

- **launch request**
  - frontend or orchestrator-originated execution request

- **launch plan**
  - computed orchestration decision set

- **template deviation record**
  - structured explanation and approval state

- **runtime event**
  - execution lifecycle event for telemetry/timeline/sessions

- **session binding**
  - mapping between worker/orchestrator and BeadBoard's session/social surfaces

---

## 16. Presence, liveness, and status model

Presence should come from runtime state, not just whether a chat is open.

Recommended runtime presence states include:
- idle
- planning
- launching
- working
- waiting
- blocked
- completed
- failed
- stale

These presence signals should appear in:
- sessions hub
- mission/swarm views
- task/social cards where relevant
- graph node overlays where relevant
- right-panel contextual views
- bottom telemetry console

---

## 17. Naming policy

### 17.1 What should be stable
Stable user-facing concepts should be:
- archetype/agent type
- orchestrator identity per project

### 17.2 What can vary
Worker instances may duplicate when needed and should not create permanent conceptual chaos.

The implementation should prefer a naming and display model where:
- the stable archetype identity is visible
- duplicates are understandable as instances of that archetype

The exact final naming scheme is not resolved in this PRD, but the conceptual distinction is mandatory.

---

## 18. Risks and failure modes

### 18.1 UI overload risk
If the feature tries to jam full agent conversation into the already-busy right panel, the app will become harder to use rather than more powerful.

**Mitigation:** left-side orchestrator + right-side contextual detail + bottom telemetry.

### 18.2 Archetypes staying “fake” risk
If archetypes do not actually map to execution concepts, the runtime model and UI model will drift apart.

**Mitigation:** archetypes explicitly become executable agent types.

### 18.3 Runtime/model lock-in risk
If Pi-specific assumptions are baked directly into frontend semantics, later runtime extensibility becomes painful.

**Mitigation:** BeadBoard-native runtime adapter boundary.

### 18.4 Unexplained orchestration risk
If the orchestrator silently deviates from templates or spawns unexpected workers, trust drops.

**Mitigation:** canonical structured explanation + approval flow.

### 18.5 Identity pollution risk
If every worker spawn becomes a confusing permanent identity, sessions and agent surfaces become noisy.

**Mitigation:** separate agent type from agent instance.

---

## 19. Implementation workstreams

This section enumerates what must be designed and built later. It is intentionally comprehensive.

### Workstream A — Runtime integration
- define BeadBoard-owned embedded Pi runtime root and process model
- integrate with BeadBoard runtime manager
- define orchestrator process lifecycle
- define worker spawn lifecycle
- define health/restart/shutdown behavior

### Workstream B — Pi config system
- design BeadBoard-specific Pi config root
- define orchestrator identity/config
- define worker archetype-to-Pi config mapping
- define layered override model
- define project-scoped state directories

### Workstream C — Runtime adapter/API layer
- define BeadBoard-to-Pi adapter contract
- normalize request/response/event shapes for frontend
- abstract runtime backend for future non-Pi support

### Workstream D — Agent model and data model
- formalize agent type vs agent instance vs session
- formalize template deviation record
- formalize runtime events and state transitions
- connect runtime state to sessions hub/timeline/mission surfaces

### Workstream E — Orchestrator logic
- define template-first orchestration behavior
- define deviation heuristics
- define approval thresholds and auto mode behavior
- define archetype duplication policy

### Workstream F — Frontend launch UX
- add launch affordances anywhere there is work
- add orchestrator mode to left sidebar
- restore middle-panel epic flow where needed
- integrate contextual launch actions into social/graph/swarm/sessions surfaces

### Workstream G — Conversation UX
- define orchestrator conversation surface in left sidebar
- define worker conversation/focus behavior in activity panel and contextual panels
- define how conversations and runtime events interact

### Workstream H — Bottom runtime console
- define runtime console data model and UX
- stream spawn/planning/approval/failure/completion messages there
- connect to timeline/state model

### Workstream I — Contract/spec documentation
- create frontend/runtime/RPC interface spec
- create event contract spec
- create session continuity and restart behavior spec
- create implementation-phase design docs if needed

### Workstream J — Verification plan
- prove launch from frontend
- prove orchestrator spawning workers
- prove sessions/timeline integration
- prove template deviation explanation/confirmation
- prove project-scoped orchestrator behavior

---

## 20. Proposed implementation phases

### Phase 0 — Documentation and contract alignment
- approve this PRD
- identify related docs/ADRs that need to align later
- define contract/spec deliverables

### Phase 1 — Runtime substrate
- add runtime adapter boundary
- add embedded Pi runtime ownership under BeadBoard runtime manager
- establish project-scoped orchestrator

### Phase 2 — Agent model and contract
- implement archetype-backed agent-type model
- add worker instance lifecycle
- define event model

### Phase 3 — Frontend launch plumbing
- add launch affordances to existing work surfaces
- wire left orchestrator panel mode
- wire bottom runtime console

### Phase 4 — Sessions and observability integration
- make orchestrator/workers first-class in sessions/timeline/surfaces
- show presence and runtime state everywhere appropriate

### Phase 5 — Template-first orchestration behavior
- implement template-based launch planning
- implement deviation logging and confirmation behavior

### Phase 6 — Direct/manual controls and hardening
- manual direct worker launch
- duplicate worker controls
- stop/retry/intervene flows
- reliability and UX polish

---

## 21. Verification and test strategy

This feature must be implemented with a rigorous, evidence-first test strategy.

No implementation phase should be considered complete based on demos, screenshots, or manual spot checks alone. Each major workstream must ship with automated verification at the correct level of the stack, plus targeted manual validation for cross-surface UX behavior.

### 21.1 Test philosophy
- prefer failing tests before implementation for behavior changes where practical
- test contracts at the BeadBoard boundary, not Pi internals alone
- verify both happy path and failure path behavior
- verify restart/reconnect/reload scenarios, not just first-run behavior
- verify multi-surface consistency: launch in one surface must appear correctly in others
- verify that explanation, approval, and deviation logic is observable and auditable
- verify runtime isolation from personal Pi config

### 21.2 Required automated test layers

#### A. Unit tests
Unit tests must cover pure logic and deterministic policy code, including:
- runtime path resolution and project-scoped state path derivation
- archetype-to-agent-type mapping
- layered config merge logic
- template selection and deviation classification logic
- approval threshold logic
- runtime event normalization and state transition reducers
- display labeling logic for agent types vs instances

#### B. Contract tests
Contract tests must validate the BeadBoard-owned runtime adapter boundary, including:
- launch request schema validation
- orchestrator spawn request contract
- worker lifecycle event schema
- session binding event contract
- template deviation record shape
- approval request / approval response flow
- error payload contract for runtime failures and timeouts

These tests must protect BeadBoard's product-facing API from accidental Pi-specific leakage.

#### C. Integration tests
Integration tests must validate server/runtime behavior across real module boundaries, including:
- project orchestrator creation and reuse
- worker spawn under orchestrator control
- duplicate worker spawn for busy archetypes
- launch from task context with packaged metadata
- launch from graph context with dependency metadata
- template application and recorded deviation generation
- session creation and runtime event persistence/mapping
- stop/retry/reconnect behavior

#### D. UI component/integration tests
UI tests must cover the shell and critical interaction surfaces, including:
- left sidebar epic mode ↔ orchestrator mode switching
- launch affordance visibility on task cards, graph nodes, swarm surfaces, and sessions surfaces
- right panel remaining contextual while orchestrator lives elsewhere
- bottom console showing runtime telemetry events in order
- activity panel reflecting running orchestrator/worker state
- approval-needed UI for major deviations
- deep-link/URL-state restoration of relevant surfaces

#### E. End-to-end tests
End-to-end tests must cover complete user journeys, including:
- launch work from a task card through orchestrator-mediated spawn
- launch work from graph node with dependency-aware context
- launch a mission/template flow that creates multiple workers
- orchestrator deviation requiring approval, then approval continuing execution
- worker failure surfacing in console, sessions, and contextual UI
- browser refresh / reconnect while orchestrator and workers continue running
- switching projects without cross-project state contamination

### 21.3 Required failure-path coverage
The test suite must explicitly cover at least these failure modes:
- Pi runtime unavailable at launch time
- orchestrator crash and restart
- worker spawn failure
- worker timeout / stale worker state
- malformed or partial runtime events
- lost frontend connection / SSE reconnect
- duplicate event delivery / idempotency handling
- approval request issued, then expired or rejected
- project path missing or invalid
- BeadBoard runtime accidentally attempting to read personal Pi config

### 21.4 Required cross-surface consistency assertions
Tests must assert that a single runtime action is reflected consistently across multiple surfaces. At minimum:
- launch from social card appears in bottom console, activity panel, and relevant contextual detail
- launch from graph node updates graph presence state, sessions state, and runtime console
- deviation record appears identically in timeline/activity, sessions context, and mission/swarm context
- worker completion/failure updates all subscribed surfaces consistently

### 21.5 Required non-functional verification
The implementation must include verification for:
- runtime isolation from personal Pi config and sessions
- project-scoped state isolation between two active projects
- orchestrator persistence across page reloads and frontend reconnects
- acceptable event latency for launch/state transitions under normal local development conditions
- graceful degradation when runtime is unhealthy

### 21.6 Manual validation checklist
Automated coverage is mandatory, but manual validation is still required for:
- shell ergonomics across left/middle/right/bottom surfaces
- readability of orchestration explanations and deviation prompts
- whether the orchestrator feels native rather than bolted-on
- whether the right panel remains useful while agents are active
- whether launch-anywhere interactions feel coherent across views

### 21.7 Definition of done for testing
No implementation phase is done unless:
- new behavior is covered by automated tests at the appropriate layer
- failure-path tests exist for the new runtime behavior
- cross-surface propagation is verified where applicable
- manual validation checklist items for that phase have been exercised
- all relevant tests pass in CI on the branch before merge

---

## 22. Acceptance criteria for the feature direction

A future implementation should not be considered complete unless all of the following are true:

### Runtime + architecture
- BeadBoard owns a Pi runtime under its runtime-manager model
- each project has one long-lived orchestrator Pi
- worker Pi instances can be spawned under orchestrator control
- runtime architecture leaves room for future non-Pi backends

### Agent model
- archetypes map to real executable agent types
- duplicate worker instances of an archetype can be created when needed
- agent type, agent instance, and session are distinct concepts in the design

### UX + product behavior
- user can initiate Pi launch anywhere there is work
- orchestrator has a persistent native home in the shell
- right panel remains useful for contextual detail
- runtime telemetry is visible continuously in a bottom console or equivalent
- activity panel reflects real runtime-backed agent activity

### Orchestration behavior
- templates are used by default
- orchestrator may deviate when needed
- deviations are always explained
- major deviations require confirmation unless auto mode is enabled

### Product fit
- embedded Pi feels like a native extension of BeadBoard's operating model
- the feature does not read as “an assistant tab bolted onto a dashboard”

---

## 23. Open questions intentionally deferred

These are real questions, but they do not block approval of this PRD.

- exact worker instance naming/display policy
- exact schema definitions for runtime objects
- exact placement and visual style of bottom console
- exact keyboard/modeless interactions for orchestrator chat mode
- exact persistence policy for worker sessions across app/runtime restarts
- exact guardrails for archetype-level Pi overrides

These should be resolved in follow-on design/implementation planning, not by weakening the core architecture here.

---

## 24. Future: Unified Settings System (Phase 8+)

**Status:** Not started, deferred to post-Phase 7

### Overview

A comprehensive settings system for both CLI and frontend that gives users full control over BeadBoard's behavior, model providers, authentication, and runtime configuration.

### CLI Settings (`bb`)

Currently supports:
- `bb config set model <model-id>` - Set default model

**Needed:**
- Full settings file at `~/.beadboard/settings.json` or project-level `.beadboard/settings.json`
- Settings for:
  - Default provider (openai, anthropic, google, openrouter, etc.)
  - Default model per provider
  - API keys (or reference to auth.json)
  - Default archetype for workers
  - Default template preferences
  - Worker limits (max concurrent workers)
  - Timeout settings
  - Logging verbosity
  - Shell path (for Windows compatibility)
  - Runtime version preferences
- Commands:
  - `bb config list` - Show all settings
  - `bb config get <key>` - Get specific setting
  - `bb config set <key> <value>` - Set setting
  - `bb config unset <key>` - Reset to default
  - `bb config import <file>` - Import settings
  - `bb config export <file>` - Export settings

### Frontend Settings

**Needed:**
- Settings panel accessible from UI (gear icon or dedicated view)
- Sections:
  - **Provider/Model Selection**
    - Choose provider (OpenAI, Anthropic, Google, OpenRouter, etc.)
    - Choose model from provider
    - Set default for orchestrator vs workers
  - **Authentication**
    - Login/logout for each provider
    - API key management (add/edit/delete keys)
    - Secure storage (not in plaintext)
  - **Orchestrator Settings**
    - Default worker archetype
    - Max concurrent workers
    - Timeout preferences
    - Auto-spawn behavior
  - **UI Preferences**
    - Theme (dark/light/custom)
    - Default view (social/graph)
    - Console minimization preference
    - Notification settings
  - **Project Settings**
    - Project workspace path
    - Default project on load
    - Per-project overrides
  - **Runtime Settings**
    - Pi version
    - Bootstrap behavior (auto/manual)
    - Log level
    - Debug mode

### Settings Hierarchy

Priority order (highest wins):
1. Command-line flags (`--model`, `--provider`)
2. Project-level settings (`.beadboard/settings.json`)
3. User-level settings (`~/.beadboard/settings.json`)
4. Default values

### Security Considerations

- API keys should never be stored in plaintext in settings files
- Use system keychain where available (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux)
- Fallback to encrypted file storage if keychain unavailable
- Frontend should never expose full API keys (show masked version)

### Implementation Notes

- Settings should be accessible from both CLI and frontend
- Changes in frontend should reflect in CLI settings and vice versa
- Settings API should be consistent between both surfaces
- Consider using a schema-driven settings system for validation

### Why This Matters

- Users need to switch models/providers without editing config files manually
- Multi-provider support requires per-provider authentication
- Power users want fine-grained control over runtime behavior
- Teams may want project-level settings for consistency

---

## 24. Final recommendation

BeadBoard should adopt the following canonical direction:

- global BeadBoard-owned runtime
- project-scoped orchestrator and worker state
- one long-lived orchestrator Pi per project
- archetypes as real executable agent types
- duplicated worker instances when an archetype is already in use
- template-first orchestration
- logged and confirmable deviations
- launch affordances anywhere there is work
- left sidebar as orchestrator/epic dual-mode surface
- right panel preserved for contextual detail
- bottom console for runtime telemetry
- Pi-only runtime in v1 behind a future-extensible runtime abstraction

This is the most holistic, extensible, and BeadBoard-native planning direction identified in this session.
