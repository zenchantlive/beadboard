# ADR: BeadBoard Daemon Attachment Model

- Date: 2026-03-05
- Status: Accepted
- Scope: Host-resident daemon topology for BeadBoard runtime execution

## Context

BeadBoard is evolving from a coordination surface into a coordination-plus-execution product. The product now needs a durable runtime anchor that survives browser reloads, keeps project runtime state on the user's machine, and can eventually serve both local and remote frontends.

Earlier embedded runtime scaffolding inside the Next app is useful as a transition, but it is not the target architecture.

## Decision

BeadBoard will use a **user-owned, host-resident `bb` daemon** as the execution anchor.

This means:

- each user runs their own BeadBoard daemon on their own machine
- the daemon is long-lived while the host machine is on
- runtime ownership stays with the user and the user's environment
- the frontend attaches to daemon state and control APIs instead of owning execution directly
- this is **not a centralized hosted runtime** model for the current product architecture

## Attachment model

The canonical relationship is:

1. the user starts `bb daemon start`
2. the daemon becomes the durable runtime anchor for project execution
3. a frontend attaches to daemon APIs and event streams
4. the frontend acts as a client/control surface, not the runtime owner

The phrase **frontend attaches to daemon** is intentional. It applies whether the frontend is:

- running locally on the same machine
- deployed remotely by the user
- eventually deployed in a different frontend environment that still points at the same daemon

## Local vs remote frontend

Near-term implementation may use local co-residency and in-process attachment seams for simplicity.

Long-term architecture still treats the frontend and daemon as distinct roles:

- **daemon** = execution, orchestration, durable runtime state
- **frontend** = interaction, inspection, control, visualization

Remote attachment is therefore an extension of the same architecture, not a different one.

## Non-decision: later B2B hosting

A future B2B deployment may run `bb` on a cloud VM. That is a separate later PRD and does not change the current architectural standard:

- current product direction is still user-owned daemon first
- later hosted or VM-backed deployment must build on the same daemon attachment contract rather than replacing it with a centralized runtime assumption

## Consequences

- daemon lifecycle becomes a first-class CLI/runtime concern
- Next.js runtime routes should evolve into daemon-backed adapters
- the frontend must gradually become a daemon client rather than an in-app runtime owner
- Pi integration should sit behind a BeadBoard-owned daemon/runtime boundary
- persistence, reconnect behavior, and event streaming should attach to the daemon contract rather than ephemeral browser state
