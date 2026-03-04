# Session Lifecycle

## 1) Start Session

1. Run environment diagnosis.
2. Run preflight.
3. Resolve bb path and confirm `bd` availability.
4. Generate unique session agent name.
5. Register agent identity.
6. Confirm you are operating in the assigned target repository.
7. Do not change project scope (scope is user-controlled in BeadBoard UI).

## 2) Pick and Claim Work

1. `bd ready`
2. `bd show <id>`
3. `bd update <id> --status in_progress --claim`

## 3) Coordinate During Work

1. Reserve sensitive scopes before edits.
2. Send structured mail for blockers and handoffs.
3. Read and acknowledge required messages.

## 4) Verify and Close

1. Run required gates (typecheck/test/lint).
2. Build readiness report with checks + artifacts.
3. Post notes to bead.
4. Close bead with explicit reason.

## 5) Session End Hygiene

1. Release reservations.
2. Ensure no unresolved blocker mail is pending for your bead.
3. Hand off context if stopping before close.
