import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEligibilityChecks } from '../src/ui/eligibility.js';

test('eligibility view distinguishes an unverified mismatch from an authoritative failure', () => {
  const eligibility = {
    requirementChecks: [
      { field: 'politicalStatus', label: '政治面貌', expected: '中共党员', actual: '群众', status: 'mismatch' },
    ],
  };
  const secondary = renderEligibilityChecks(eligibility, { sourceLevel: 'secondary', eligibilityComplete: false });
  const official = renderEligibilityChecks(eligibility, { sourceLevel: 'official', eligibilityComplete: true });

  assert.match(secondary, /与当前收录条件不一致/);
  assert.match(secondary, /待官方核验/);
  assert.doesNotMatch(secondary, /明确不符合/);
  assert.match(official, /明确不符合/);
});

test('eligibility view does not treat an absent structured restriction as unlimited', () => {
  const html = renderEligibilityChecks({ requirementChecks: [] }, { sourceLevel: 'secondary', eligibilityComplete: false });

  assert.match(html, /没有结构化身份限制记录/);
  assert.match(html, /不代表“无限制”/);
});
