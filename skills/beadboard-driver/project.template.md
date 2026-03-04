# Project Driver Template

Use this file to define project-specific operating notes for agents using the BeadBoard Driver skill.

## Project Identity

- Project name:
- Repository root:
- Primary language/runtime:
- Primary package manager:

## BeadBoard Relationship

- BeadBoard host/UI location:
- Project registration identifier (if used):
- Notes about how this project appears in BeadBoard UI:

## Scope and Authority

- User controls project scope selection in BeadBoard UI.
- Agents do not change scope.
- Agent execution context in this repo:

## Command Baseline

- Install command:
- Build command:
- Typecheck command:
- Lint command:
- Test command:
- Smoke command (optional):

## Verification Policy Overrides

- Required gates for this project:
- Known slow gates and timeout guidance:
- Evidence format expected in bead notes:

## Environment Constraints

- OS/platform expectations:
- Required environment variables:
- Secrets handling guidance:
- Known path/shell quirks:

## Known Workarounds

Document only stable, repeatable workarounds.

1. Trigger:
   - Symptom:
   - Workaround:
   - Verification:
   - Owner:

2. Trigger:
   - Symptom:
   - Workaround:
   - Verification:
   - Owner:

## Coordination Defaults

- Default role/archetype mapping used by this project:
- Default handoff style:
- Blocker escalation policy:
- Ack expectations for blocker/handoff messages:

## Safety Guardrails

- Forbidden commands/actions for this repo:
- Files/paths requiring explicit reservation before edit:
- External systems that require human approval:

## Session Closeout Checklist

- [ ] Bead status/assignee updated
- [ ] Verification commands executed and recorded
- [ ] Artifacts attached/linked
- [ ] Memory review performed
- [ ] Follow-up beads created (if needed)

## Change Log

- YYYY-MM-DD: Initial project template completed.
