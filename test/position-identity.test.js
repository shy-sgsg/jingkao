import test from 'node:test';
import assert from 'node:assert/strict';
import * as positionData from '../src/data/positions.js';

const reusedCodePositions = [
  { year: 2026, code: '526012901', unit: '北京市昌平区人民法院' },
  { year: 2025, code: '526012901', unit: '北京市延庆区人民法院' },
];

test('position identity includes year when official codes are reused across exams', () => {
  assert.equal(positionData.positionIdentity(reusedCodePositions[0]), '2026:526012901');
  assert.equal(positionData.positionIdentity(reusedCodePositions[1]), '2025:526012901');
  assert.notEqual(
    positionData.positionIdentity(reusedCodePositions[0]),
    positionData.positionIdentity(reusedCodePositions[1]),
  );
});

test('year-scoped references select the matching position while legacy code references remain deterministic', () => {
  assert.equal(
    positionData.findPositionByReference(reusedCodePositions, '2025:526012901'),
    reusedCodePositions[1],
  );
  assert.equal(
    positionData.findPositionByReference(reusedCodePositions, '526012901'),
    reusedCodePositions[0],
  );
});

test('legacy saved position codes attach only to their original matching record', () => {
  assert.equal(
    positionData.hasPositionReference(['526012901'], reusedCodePositions[0], reusedCodePositions),
    true,
  );
  assert.equal(
    positionData.hasPositionReference(['526012901'], reusedCodePositions[1], reusedCodePositions),
    false,
  );
});
