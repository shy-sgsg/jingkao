import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionCoverageMatrix, filterScoreRowsByScope } from '../src/data/positions.js';

test('decision coverage matrix keeps all districts and distinguishes no sample from zero jobs', () => {
  const districts = [
    { id: 'haidian', name: '海淀区' },
    { id: 'dongcheng', name: '东城区' },
  ];
  const positions = [
    { districtId: 'haidian', year: 2026, recruitCount: 3, sourceLevel: 'secondary' },
    { districtId: 'haidian', year: 2026, recruitCount: null, sourceLevel: 'secondary' },
  ];

  const matrix = buildDecisionCoverageMatrix(positions, districts, [2025, 2026]);

  assert.equal(matrix.length, 2);
  assert.deepEqual(matrix[0].years[2026], {
    positionCount: 2,
    recruitCount: 3,
    knownRecruitCount: 1,
    officialCount: 0,
    secondaryCount: 2,
    hasSample: true,
  });
  assert.deepEqual(matrix[1].years[2026], {
    positionCount: 0,
    recruitCount: null,
    knownRecruitCount: 0,
    officialCount: 0,
    secondaryCount: 0,
    hasSample: false,
  });
});

test('district-scoped score rows require a unique high-confidence position mapping', () => {
  const positions = [
    { districtId: 'haidian', year: 2026, code: 'H001', unit: '海淀单位', title: '综合管理' },
    { districtId: 'changping', year: 2026, code: 'C001', unit: '昌平单位', title: '综合管理' },
  ];
  const scoreRows = [
    { id: 'haidian', year: 2026, positionCode: 'H001', unit: '海淀单位', title: '综合管理', mappingConfidence: 'high' },
    { id: 'changping', year: 2026, positionCode: 'C001', unit: '昌平单位', title: '综合管理', mappingConfidence: 'high' },
    { id: 'unmatched', year: 2026, positionCode: '', unit: '海淀单位', title: '综合管理', mappingConfidence: 'low' },
    { id: 'wrong-year', year: 2025, positionCode: 'H001', unit: '海淀单位', title: '综合管理', mappingConfidence: 'high' },
  ];

  assert.deepEqual(
    filterScoreRowsByScope(scoreRows, positions, { districtId: 'haidian', year: '2026' }).map((row) => row.id),
    ['haidian'],
  );
  assert.deepEqual(
    filterScoreRowsByScope(scoreRows, positions, { districtId: 'all', year: '2026' }).map((row) => row.id),
    ['haidian', 'changping', 'unmatched'],
  );
});
