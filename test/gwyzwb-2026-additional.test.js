import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateEligibility } from '../src/data/decision.js';

const projectRoot = new URL('../', import.meta.url);

test('additional 2026 unit-page rows are available in the site with their source links', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expected = [
    ['232502801', '北京市公安局昌平分局', '一线执法岗', 10, 'gwyzwb-2026-org-1'],
    ['232502802', '北京市公安局昌平分局', '专业岗', 5, 'gwyzwb-2026-org-1'],
    ['221261601', '北京市昌平区生态环境局', '综合管理岗', 2, 'gwyzwb-2026-job-221261601'],
    ['829910403', '北京市统计局', '专业统计岗', 1, 'gwyzwb-2026-org-4'],
    ['121260901', '中共北京市昌平区委机构编制委员会办公室', '综合管理岗', 1, 'gwyzwb-2026-org-9'],
    ['821261001', '中共北京市昌平区委党校', '综合管理岗', 2, 'gwyzwb-2026-org-10'],
    ['221261301', '北京市昌平区司法局', '政法专项岗', 2, 'gwyzwb-2026-org-13'],
    ['821261401', '北京市昌平区财政局', '考评综合岗', 1, 'gwyzwb-2026-org-14'],
    ['821261402', '北京市昌平区财政局', '财务管理岗', 2, 'gwyzwb-2026-org-14'],
    ['221261801', '北京市昌平区城市管理委员会', '综合管理岗', 1, 'gwyzwb-2026-org-18'],
    ['221261802', '北京市昌平区城市管理委员会', '行政执法岗1', 1, 'gwyzwb-2026-org-18'],
    ['221261804', '北京市昌平区城市管理委员会', '行政执法岗', 1, 'gwyzwb-2026-org-18'],
  ];

  for (const [code, unit, title, recruitCount, sourceId] of expected) {
    const row = positions.find((position) => position.code === code);
    assert.ok(row, `missing candidate position ${code}`);
    assert.equal(row.year, 2026, `${code} year`);
    assert.equal(row.unit, unit, `${code} unit`);
    assert.equal(row.title, title, `${code} title`);
    assert.equal(row.recruitCount, recruitCount, `${code} recruitment count`);
    assert.ok(row.education, `${code} education`);
    assert.ok(row.majorText, `${code} major text`);
    assert.equal(row.eligibilityComplete, false, `${code} must retain incomplete eligibility status`);
    assert.ok(row.sources.includes(sourceId), `${code} source link`);
    assert.ok(published.positions.some((position) => position.code === code), `${code} must be published to the site data`);
    assert.equal(sourceById.get(sourceId)?.level, 'secondary', `${code} must not be upgraded to official`);
  }

  assert.equal(new Set(expected.map(([code]) => code)).size, 12);
  assert.equal(positions.filter((position) => expected.some(([code]) => position.code === code)).length, 12);
  assert.deepEqual(
    ['gwyzwb-2026-org-1', 'gwyzwb-2026-org-4', 'gwyzwb-2026-org-9', 'gwyzwb-2026-org-10', 'gwyzwb-2026-org-13', 'gwyzwb-2026-org-14', 'gwyzwb-2026-org-18', 'gwyzwb-2026-job-221261601'].map((sourceId) => [sourceId, sourceById.get(sourceId)?.url]),
    [
      ['gwyzwb-2026-org-1', 'https://bj.gwyzwb.com/changping/2026_1.html'],
      ['gwyzwb-2026-org-4', 'https://bj.gwyzwb.com/changping/2026_4.html'],
      ['gwyzwb-2026-org-9', 'https://bj.gwyzwb.com/changping/2026_9.html'],
      ['gwyzwb-2026-org-10', 'https://bj.gwyzwb.com/changping/2026_10.html'],
      ['gwyzwb-2026-org-13', 'https://bj.gwyzwb.com/changping/2026_13.html'],
      ['gwyzwb-2026-org-14', 'https://bj.gwyzwb.com/changping/2026_14.html'],
      ['gwyzwb-2026-org-18', 'https://bj.gwyzwb.com/changping/2026_18.html'],
      ['gwyzwb-2026-job-221261601', 'https://bj.gwyzwb.com/2026/1221.html'],
    ],
  );

  const ecologyRole = positions.find((position) => position.code === '221261601');
  assert.deepEqual(ecologyRole.requirements, { graduationStatus: '应届毕业生' });
  assert.equal(evaluateEligibility(ecologyRole, { degree: '硕士研究生', majorCode: '0830', graduationStatus: '应届毕业生' }).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility(ecologyRole, { degree: '硕士研究生', majorCode: '0830', graduationStatus: '非应届 / 社会人员' }).status, '信息不足');
});
