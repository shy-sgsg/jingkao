import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('Tongzhou candidate rows preserve row-level lineage and recovered totals by year', () => {
  const rows = dataset.positions.filter((position) => position.districtId === 'tongzhou');
  const byYear = Object.fromEntries([2024, 2025, 2026].map((year) => {
    const yearRows = rows.filter((position) => position.year === year);
    return [year, {
      positions: yearRows.length,
      recruits: yearRows.reduce((sum, position) => sum + position.recruitCount, 0),
    }];
  }));

  assert.deepEqual(byYear, {
    2024: { positions: 86, recruits: 166 },
    2025: { positions: 82, recruits: 212 },
    2026: { positions: 70, recruits: 134 },
  });
  assert.equal(new Set(rows.map((position) => `${position.year}:${position.code}`)).size, rows.length);
  assert.ok(rows.every((position) => position.sourceLevel === 'secondary'));
  assert.ok(rows.every((position) => position.verification === '待官方逐码复核'));
  assert.ok(rows.every((position) => position.crossVerified === false));
  assert.ok(rows.every((position) => position.eligibilityComplete === false));
  assert.ok(rows.every((position) => position.sources.some((sourceId) => sourceId.startsWith('tongzhou-'))));
  const codedMajor = rows.find((position) => position.year === 2024 && position.code === '121148101');
  assert.ok(codedMajor.majorCriteria.graduate.includes('0101'));
});
