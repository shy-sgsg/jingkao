import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('Xicheng candidate rows preserve row-level lineage and recovered totals by year', () => {
  const sourceDistrict = new Map(dataset.sources.map((source) => [source.sourceId, source.districtId]));
  const rows = dataset.positions.filter((position) =>
    position.sources.some((sourceId) => sourceDistrict.get(sourceId) === 'xicheng'));
  const totalsByYear = (items) => Object.fromEntries([2024, 2025, 2026].map((year) => {
    const yearRows = items.filter((position) => position.year === year);
    return [year, {
      positions: yearRows.length,
      recruits: yearRows.reduce((sum, position) => sum + position.recruitCount, 0),
    }];
  }));

  assert.deepEqual(totalsByYear(rows), {
    2024: { positions: 57, recruits: 135 },
    2025: { positions: 89, recruits: 310 },
    2026: { positions: 119, recruits: 361 },
  });
  assert.deepEqual(totalsByYear(dataset.positions.filter((position) => position.districtId === 'xicheng')), {
    2024: { positions: 57, recruits: 135 },
    2025: { positions: 89, recruits: 310 },
    2026: { positions: 116, recruits: 354 },
  });
  assert.equal(new Set(rows.map((position) => `${position.year}:${position.code}`)).size, rows.length);
  assert.ok(rows.every((position) => position.sourceLevel === 'secondary'));
  assert.ok(rows.every((position) => position.verification === '待官方逐码复核'));
  assert.ok(rows.every((position) => position.crossVerified === false));
  assert.ok(rows.every((position) => position.eligibilityComplete === false));
  assert.ok(rows.every((position) => position.sources.some((sourceId) => sourceId.startsWith('xicheng-'))));
  const unresolved = rows.filter((position) => position.districtId !== 'xicheng');
  assert.deepEqual(unresolved.map(({ year, code, recruitCount }) => ({ year, code, recruitCount })), [
    { year: 2026, code: '234104501', recruitCount: 5 },
    { year: 2026, code: '234104502', recruitCount: 1 },
    { year: 2026, code: '234104503', recruitCount: 1 },
  ]);
  const codedMajor = rows.find((position) => position.year === 2024 && position.code === '220217901');
  assert.ok(codedMajor.majorCriteria.graduate.includes('0701'));
});
