# Phase 7 - Tests and Verification

**Status:** Planning
**Created:** 2026-03-07
**Goal:** Add comprehensive tests for embedded Pi runtime and agent system

---

## Test Categories

### 1. Unit Tests

**Runtime Path Resolution:**
- `pi-runtime-detection.test.ts` - SDK detection, path resolution
- `bb-pi-bootstrap.test.ts` - bootstrap process

**Event Projection:**
- `embedded-daemon.test.ts` - event emission, deduplication
- `orchestrator-chat.test.ts` - message projection

**Worker Session:**
- `worker-session-manager.test.ts` - spawn, status, lifecycle

### 2. Contract Tests

**Adapter Schemas:**
- Pi SDK adapter input/output contracts
- Runtime event schema validation

### 3. Integration Tests

**Orchestrator Flow:**
- Session creation
- Prompt submission
- Tool execution
- Response handling

**Worker Flow:**
- Worker spawn
- Bead claim/update/close
- Result retrieval

### 4. UI Tests

**Left Panel:**
- Chat rendering
- Message projection
- Error display

---

## Implementation Plan

### Step 1: Unit Test Setup
- Configure test runner (Jest or Vitest)
- Create test utilities for mocking Pi SDK

**Files:**
- `tests/setup.ts`
- `tests/mocks/pi-sdk.ts`

### Step 2: Runtime Unit Tests
- Test path detection
- Test bootstrap process
- Test event deduplication

### Step 3: Worker Unit Tests
- Test spawn flow
- Test status tracking
- Test result collection

### Step 4: Integration Tests
- Test full orchestrator flow
- Test worker-to-bead workflow

---

## Blocked Items

None identified.

---

## Success Criteria

- [ ] Unit tests for runtime components pass
- [ ] Unit tests for worker session manager pass
- [ ] Integration tests for orchestrator flow pass
- [ ] Integration tests for worker flow pass

---

## Estimated Effort

4-5 hours
