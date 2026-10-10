import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('Fengtai position candidates preserve row-level sources and visible coverage by year', () => {
  const rows = dataset.positions.filter((position) => position.districtId === 'fengtai');
  const byYear = Object.fromEntries([2024, 2025, 2026].map((year) => {
    const yearRows = rows.filter((position) => position.year === year);
    return [year, {
      positions: yearRows.length,
      recruits: yearRows.reduce((sum, position) => sum + position.recruitCount, 0),
    }];
  }));

  assert.deepEqual(byYear, {
    2024: { positions: 2, recruits: 3 },
    2025: { positions: 10, recruits: 66 },
    2026: { positions: 26, recruits: 92 },
  });
  assert.equal(new Set(rows.map((position) => `${position.year}:${position.code}`)).size, rows.length);
  for (const row of rows) {
    assert.equal(row.sourceLevel, 'secondary');
    assert.equal(row.verification, '待官方逐码复核');
    assert.ok(row.sources.some((sourceId) => sourceId.startsWith('fengtai-')));
  }
});
