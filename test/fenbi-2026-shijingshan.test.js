import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2026 Shijingshan Fenbi listing imports all 45 candidate rows without overstating verification', async () => {
  const data = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const positions = data.positions.filter((row) => row.year === 2026 && row.sources.includes('fenbi-2026-shijingshan-list'));
  const districtRows = data.positions.filter((row) => row.year === 2026 && row.districtId === 'shijingshan');
  const source = data.sources.find((row) => row.sourceId === 'fenbi-2026-shijingshan-list');

  assert.equal(positions.length, 45);
  assert.equal(new Set(positions.map((row) => row.code)).size, 45);
  assert.equal(positions.reduce((sum, row) => sum + row.recruitCount, 0), 95);
  assert.equal(districtRows.length, 45);
  assert.ok(positions.every((row) => row.sourceLevel === 'secondary'));
  assert.ok(positions.every((row) => row.crossVerified === false));
  assert.ok(positions.every((row) => row.eligibilityComplete === false));
  assert.ok(positions.every((row) => row.workLocation === '北京 北京市 石景山区'));
  assert.ok(positions.every((row) => ['石景山区', '石景山分局', '石景山运输管理分局'].includes(row.districtMatch)));
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.reportedPositionCount, 45);
  assert.equal(source?.reportedRecruitCount, 95);
});
