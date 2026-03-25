# Phase 1: Worker Spawning - Manual E2E Test

**Date:** 2026-03-06
**Status:** Ready for manual testing

---

## Prerequisites

1. ✅ Dev server is running (user has it running)
2. ✅ Pi SDK is available (`bb daemon bootstrap-pi` should have been run)
3. ✅ All code changes are committed and applied

---

## Test Scenarios

### Scenario 1: Basic Worker Spawn

**Steps:**
1. Open BeadBoard in browser (http://localhost:3000)
2. Open left panel (orchestrator mode)
3. Send this prompt to orchestrator:
   ```
   Spawn a worker to read the README.md file and tell me what it says.
   ```
4. Observe the response and check:
   - [ ] Orchestrator calls `bb_spawn_worker` tool
   - [ ] Worker spawns with task context
   - [ ] `worker.spawned` event appears in runtime console (with "Worker" badge)
   - [ ] Worker event shows task ID: "read-the-readme.md-file-and-tell-me-what-it-says"
   - [ ] Worker status tool response is shown

**Expected Result:** Worker appears in console with "Worker" badge, shows "WORKING" status.

---

### Scenario 2: Worker Status Check

**Steps:**
1. From left panel, send:
   ```
   Check the status of the worker you just spawned.
   ```
2. Observe:
   - [ ] Orchestrator calls `bb_worker_status` tool
   - [ ] Worker status is displayed with correct emoji
   - [ ] Shows "WORKING", "COMPLETED", or "FAILED" as appropriate
   - [ ] Task ID matches the spawned task

**Expected Result:** Current worker status shown with helpful message.

---

### Scenario 3: Worker Completion

**Steps:**
1. Wait for the worker to complete (should happen within ~30 seconds for README read)
2. Observe:
   - [ ] `worker.updated` or `worker.completed` event appears
   - [ ] If completed: shows "COMPLETED" with ✅ emoji
   - [ ] Result summary is shown (first 200 chars)
   - [ ] Worker no longer shows as "WORKING"

**Expected Result:** Worker successfully completes and result is displayed.

---

### Scenario 4: Multiple Workers

**Steps:**
1. Send prompt to orchestrator:
   ```
   Spawn 3 workers in parallel:
   - Worker 1: Read package.json
   - Worker 2: List all files in src/
   - Worker 3: Read .env.example file
   ```
2. Observe:
   - [ ] Three separate `worker.spawned` events appear
   - [ ] All three workers show "WORKING" status
   - [ ] Each worker has a unique ID
   - [ ] Task contexts are correct for each

**Expected Result:** Multiple workers run in parallel, each with unique identity and task.

---

### Scenario 5: Worker with Archetype

**Steps:**
1. Send prompt to orchestrator:
   ```
   Spawn a worker with archetype "coder" to add a new test file.
   ```
2. Observe:
   - [ ] Worker spawns with "Archetype: coder" in the detail
   - [ ] Worker system prompt includes the archetype context

**Expected Result:** Worker behavior is guided by archetype (though actual behavior is same - this is v1).

---

### Scenario 6: Worker Error Handling

**Steps:**
1. Send prompt to orchestrator with invalid task:
   ```
   Spawn a worker to read a file that does not exist: /nonexistent/path/to/file.txt
   ```
2. Observe:
   - [ ] Worker attempts the task
   - [ ] Worker fails and reports error
   - [ ] `worker.failed` event appears with ❌ emoji
   - [ ] Error message explains what went wrong

**Expected Result:** Worker failures are captured and reported clearly.

---

### Scenario 7: Runtime Console Worker Badge

**Steps:**
1. Spawn a worker
2. Look at runtime console (bottom panel)
3. Observe:
   - [ ] Worker events have a purple "Worker" badge
   - [ ] Orchestrator events do NOT have the badge
   - [ ] Badge says "Worker Agent Event" on hover

**Expected Result:** Visual distinction between orchestrator and worker events is clear.

---

### Scenario 8: Left Panel Chat Integration

**Steps:**
1. Observe the orchestrator conversation in left panel
2. During worker spawn, check:
   - [ ] Tool calls appear inline (like they do for `bb_dolt_read`)
   - [ ] Worker spawn response includes worker ID
   - [ ] Chat remains readable and not cluttered

**Expected Result:** Orchestrator chat surface handles worker interactions natively.

---

## Success Criteria

A scenario passes when:
- Worker events appear in runtime console
- Worker events have "Worker" badge
- Status changes (spawning → working → completed) are visible
- Tool calls are logged and returned to orchestrator
- Multiple workers can run in parallel
- Worker completion/failure is captured

---

## Bug Report Form

If any test fails, capture:
```
Test Scenario: [number]
Steps Taken: [what you did]
Expected Result: [what should happen]
Actual Result: [what actually happened]
Error Messages: [any errors in console]
Screenshot/Notes: [any additional details]
```

---

## After Testing

Once all scenarios pass:
1. Review success criteria in `docs/plans/2026-03-06-phase-1-worker-spawning.md`
2. Update roadmap to mark Phase 1 as complete
3. Move to Phase 2: Archetype-backed execution configs
