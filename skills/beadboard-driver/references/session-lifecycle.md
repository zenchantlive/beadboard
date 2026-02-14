# Session Lifecycle

## 1) Start Session

1. Run preflight.
2. Resolve bb path and confirm `bd` availability.
3. Generate unique session agent name.
4. Register agent identity.

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
