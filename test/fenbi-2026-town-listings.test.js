import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2026 Yangfang and Baishan positions preserve the exact Fenbi page-162 fields', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const expected = [
    {
      code: '231264401',
      unit: '北京市昌平区阳坊镇',
      department: '综合行政执法队',
      title: '综合行政执法岗',
      recruitCount: 1,
      education: '本科及以上',
      majorText: '不限',
      majorCriteria: undefined,
    },
    {
      code: '231264602',
      unit: '北京市昌平区百善镇',
      department: '综合行政执法队',
      title: '综合行政执法岗',
      recruitCount: 1,
      education: '硕士研究生及以上',
      majorText: '研究生：法学（03），理学（07），工学（08）',
      majorCriteria: { graduate: ['03', '07', '08'] },
    },
  ];

  for (const fields of expected) {
    const position = positions.find((row) => row.code === fields.code);
    assert.ok(position, `missing Fenbi-listed position ${fields.code}`);
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(position[key], value, `${fields.code} ${key}`);
    assert.equal(position.year, 2026);
    assert.equal(position.eligibilityComplete, false);
    assert.equal(position.requirements, undefined);
    assert.deepEqual(position.sources, ['fenbi-2026-page-162']);
    assert.equal(position.sourceLevel, 'secondary');
    assert.ok(published.positions.some((row) => row.code === fields.code), `${fields.code} missing from website data`);
  }

  const source = sources.find((row) => row.sourceId === 'fenbi-2026-page-162');
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.url, 'https://www.fenbi.com/page/positions/1/438923?page=162&quickPick=%7B%22examId%22%3A438923%7D');
  assert.match(source?.notes, /其他资格条件.*未核验/);
});
