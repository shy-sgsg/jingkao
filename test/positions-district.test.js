import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortPositions } from '../src/data/positions.js';

test('district filter returns only positions assigned to the selected district', () => {
  const changping = { year: 2026, code: '526012901', districtId: 'changping' };
  const yanqing = { year: 2025, code: '526012901', districtId: 'yanqing' };
  const unassigned = { year: 2025, code: 'unknown', districtId: null };

  assert.deepEqual(
    filterAndSortPositions([changping, yanqing, unassigned], { districtId: 'yanqing' }),
    [yanqing],
  );
});
