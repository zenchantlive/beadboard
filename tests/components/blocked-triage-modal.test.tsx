import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

test('BlockedTriageModal - file exists and exports', async () => {
  const filePath = path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  assert.ok(fileContent.includes('export function BlockedTriageModal'), 'Should export BlockedTriageModal function');
  assert.ok(fileContent.includes('export interface BlockedTriageModalProps'), 'Should export BlockedTriageModalProps interface');
});

test('BlockedTriageModal - imports Dialog from shadcn', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('from "@/components/ui/dialog"') || fileContent.includes("from '@/components/ui/dialog'"), 'Should import Dialog components from shadcn');
});

test('BlockedTriageModal - imports deriveBlockedIds and buildBlockedByTree from kanban', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('deriveBlockedIds'), 'Should import deriveBlockedIds');
  assert.ok(fileContent.includes('buildBlockedByTree'), 'Should import buildBlockedByTree');
});

test('BlockedTriageModal - imports useArchetypePicker hook', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('useArchetypePicker'), 'Should import useArchetypePicker hook');
});

test('BlockedTriageModal - imports BeadIssue type', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('BeadIssue'), 'Should import BeadIssue type');
});

test('BlockedTriageModal - accepts isOpen, onClose, issues, projectRoot props', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('isOpen:'), 'Should have isOpen prop');
  assert.ok(fileContent.includes('onClose:'), 'Should have onClose prop');
  assert.ok(fileContent.includes('issues:'), 'Should have issues prop');
  assert.ok(fileContent.includes('projectRoot:'), 'Should have projectRoot prop');
});

test('BlockedTriageModal - uses useMemo for blockedIds computation', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('useMemo'), 'Should use useMemo for computing blockedIds');
});

test('BlockedTriageModal - computes blocked tasks using status=blocked AND deriveBlockedIds', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes("status === 'blocked'"), 'Should check explicit blocked status');
  assert.ok(fileContent.includes('deriveBlockedIds'), 'Should use deriveBlockedIds');
});

test('BlockedTriageModal - uses buildBlockedByTree for blocker chain display', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('buildBlockedByTree'), 'Should use buildBlockedByTree for blocker chains');
});

test('BlockedTriageModal - has local state for showing/hiding archetype picker per row', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('useState'), 'Should use useState');
  assert.ok(fileContent.includes('showPicker') || fileContent.includes('pickerOpen') || fileContent.includes('expandedRow'), 'Should have state for row picker visibility');
});

test('BlockedTriageModal - modal content is scrollable', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  assert.ok(fileContent.includes('overflow-y-auto') || fileContent.includes('overflowAuto') || fileContent.includes('scrollable'), 'Should have scrollable content');
});

test('BlockedTriageModal - reuses useArchetypePicker for row assignments', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/blocked-triage-modal.tsx'), 'utf-8');
  const useArchetypePickerCount = (fileContent.match(/useArchetypePicker/g) || []).length;
  assert.ok(useArchetypePickerCount >= 2, 'Should use useArchetypePicker hook');
});
