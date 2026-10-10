import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('Fangshan candidate rows preserve recoverable source lineage and year totals', () => {
  const rows = dataset.positions.filter((position) => position.districtId === 'fangshan');
  const byYear = Object.fromEntries([2024, 2025, 2026].map((year) => {
    const yearRows = rows.filter((position) => position.year === year);
    return [year, {
      positions: yearRows.length,
      recruits: yearRows.reduce((sum, position) => sum + position.recruitCount, 0),
    }];
  }));

  assert.deepEqual(byYear, {
    2024: { positions: 105, recruits: 199 },
    2025: { positions: 131, recruits: 241 },
    2026: { positions: 97, recruits: 206 },
  });
  assert.equal(new Set(rows.map((position) => `${position.year}:${position.code}`)).size, rows.length);
  assert.ok(rows.every((position) => position.sourceLevel === 'secondary'));
  assert.ok(rows.every((position) => position.verification === '待官方逐码复核'));
  assert.ok(rows.every((position) => position.sources.some((sourceId) => sourceId.startsWith('fangshan-'))));
});
