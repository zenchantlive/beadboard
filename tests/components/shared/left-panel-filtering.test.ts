import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldHideEpicEntry, type LeftPanelFilters } from '../../../src/components/shared/left-panel';

const defaultFilters: LeftPanelFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  preset: 'all',
  hideClosed: true,
};

test('does not hide epics with no children when hideClosed is the only active toggle', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 0,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, false);
});

test('hides epics with only closed children when hideClosed is enabled', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 4,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});

test('hides epic with children when query filter excludes all children', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 3,
    isSelected: false,
    filters: { ...defaultFilters, query: 'nonexistent' },
  });

  assert.equal(hidden, true);
});

test('keeps selected epic visible even when no children match filters', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 5,
    isSelected: true,
    filters: { ...defaultFilters, status: 'blocked' },
  });

  assert.equal(hidden, false);
});

test('hides closed epic even when it has no children', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'closed',
    matchedChildrenCount: 0,
    totalChildrenCount: 0,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});

test('hides closed selected epic when hideClosed is enabled', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'closed',
    matchedChildrenCount: 2,
    totalChildrenCount: 2,
    isSelected: true,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});
