import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2025 Changping positions reconcile to the reviewed 91-position, 177-recruit mirror', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'))
    .filter((position) => Number(position.year) === 2025);
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

  assert.equal(positions.length, 91);
  assert.equal(new Set(positions.map((position) => position.code)).size, 91);
  assert.equal(positions.reduce((sum, position) => sum + (position.recruitCount || 0), 0), 177);
  assert.ok(positions.some((position) => position.code === '221264501'), 'include the fifth 昌平区城市管理委员会 role');
  assert.ok(positions.every((position) => position.sourceLevel === 'secondary'));
  assert.ok(positions.every((position) => position.code && position.unit && position.title && position.education && position.majorText));
  assert.ok(positions.every((position) => position.eligibilityComplete !== true), 'mirror summaries must not become complete official eligibility');
  assert.equal(positions.filter((position) => position.crossVerified === true).length, 90);
  assert.equal(positions.find((position) => position.code === '221264501')?.crossVerified, false);
  assert.ok(positions.some((position) => position.orgType === '垂直/驻区'));
  assert.equal(sourceById.get('huatu-2025-list')?.url, 'https://huangshan.huatu.com/zw/bjgwy/changpingzw/');
  assert.equal(sourceById.get('gwyzwb-2025-list')?.reportedPositionCount, 91);
  assert.equal(sourceById.get('gwyzwb-2025-list')?.reportedRecruitCount, 177);
  for (const position of positions.filter((row) => row.crossVerified)) {
    assert.ok(position.sources.includes('huatu-2025-list'));
    assert.ok(position.sources.some((sourceId) => sourceId.startsWith('gwyzwb-2025-org-')));
  }
  const singleSourcePosition = positions.find((position) => position.code === '221264501');
  assert.ok(singleSourcePosition.sources.some((sourceId) => sourceId.startsWith('gwyzwb-2025-org-')));
  assert.ok(!singleSourcePosition.sources.includes('huatu-2025-list'));
});

test('2025 official position provenance points to the attachment linked by the official announcement', async () => {
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const built = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const officialUrl = 'https://www.beijing.gov.cn/gongkai/rsxx/gwyzk/202411/P020241112454583305784.xls';
  const officialSource = sources.find((source) => source.sourceId === 'beijing-2025-jobfile');
  const builtSource = built.sources.find((source) => source.sourceId === 'beijing-2025-jobfile');

  assert.equal(officialSource?.url, officialUrl);
  assert.equal(builtSource?.url, officialUrl);
});
