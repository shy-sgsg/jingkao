import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2026 North Seven position is represented with only the fields visible in Fenbi listing', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const position = positions.find((row) => row.code === '231264301');
  const source = sources.find((row) => row.sourceId === 'fenbi-2026-job-231264301');

  assert.ok(position, 'missing Fenbi-listed North Seven position');
  assert.equal(position.year, 2026);
  assert.equal(position.unit, '北京市昌平区北七家镇');
  assert.equal(position.title, '综合管理岗');
  assert.equal(position.department, '经济发展办公室（统计所）');
  assert.equal(position.recruitCount, 1);
  assert.equal(position.education, '本科及以上');
  assert.equal(position.majorText, '本科：经济学（02），理学（07），工学（08），农学（09）；研究生：经济学（02），理学（07），工学（08），农学（09）');
  assert.deepEqual(position.majorCriteria, { undergraduate: ['02', '07', '08', '09'], graduate: ['02', '07', '08', '09'] });
  assert.equal(position.eligibilityComplete, false);
  assert.equal(position.requirements, undefined);
  assert.match(position.eligibilityText, /其他资格条件.*待核验/);
  assert.deepEqual(position.sources, ['fenbi-2026-job-231264301']);
  assert.equal(position.sourceLevel, 'secondary');
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.url, 'https://www.fenbi.com/page/positions/1/438923?page=165&quickPick=%7B%22examId%22%3A438923%7D');
  assert.ok(published.positions.some((row) => row.code === '231264301'), 'position missing from generated website data');
});
