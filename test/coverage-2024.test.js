import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2024 Changping position rows cover the visible 95-position, 197-recruit mirror list', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'))
    .filter((position) => Number(position.year) === 2024);
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

  assert.equal(positions.length, 95);
  assert.equal(new Set(positions.map((position) => position.code)).size, 95);
  assert.equal(positions.reduce((sum, position) => sum + (position.recruitCount || 0), 0), 197);
  assert.ok(positions.every((position) => position.sourceLevel === 'secondary'));
  assert.ok(positions.every((position) => position.eligibilityComplete !== true));
  assert.ok(positions.every((position) => position.sources.includes('huatu-2024-list')));
  assert.ok(positions.every((position) => position.code && position.unit && position.title && position.education && position.majorText));

  const policeJobs = positions.filter((position) => position.unit === '北京市公安局昌平分局');
  assert.equal(policeJobs.length, 2);
  assert.equal(policeJobs.reduce((sum, position) => sum + position.recruitCount, 0), 55);
  assert.ok(policeJobs.every((position) => position.orgType === '垂直/驻区'));
  assert.equal(sourceById.get('huatu-2024-list')?.url, 'https://ah.huatu.com/zw/bjgwy/changpingzw/2024.html');
  assert.equal(sourceById.get('huatu-2024-list')?.reportedPositionCount, 95);
  assert.equal(sourceById.get('huatu-2024-list')?.reportedRecruitCount, 197);
  assert.equal(sourceById.get('gwyzwb-2024-list')?.reportedPositionCount, 93);
  assert.equal(sourceById.get('gwyzwb-2024-list')?.reportedRecruitCount, 142);
});
