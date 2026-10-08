import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('newly reviewed 2026 mirror rows preserve the visible job fields and source provenance', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expected = [
    ['221262501', '北京市昌平区市场监督管理局', '行政执法岗', 2, 'gwyzwb-2026-org-25'],
    ['231262502', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['231262503', '北京市昌平区市场监督管理局', '知识产权岗', 1, 'gwyzwb-2026-org-25'],
    ['231262504', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['231262505', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['231262506', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['241262507', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['231262508', '北京市昌平区市场监督管理局', '综合管理岗', 1, 'gwyzwb-2026-org-25'],
    ['221262701', '北京市昌平区统计局', '综合统计岗', 1, 'gwyzwb-2026-org-27'],
    ['821262702', '北京市昌平区统计局', '综合统计岗', 2, 'gwyzwb-2026-org-27'],
    ['221262101', '北京市昌平区农业农村局', '综合行政执法岗1', 2, 'gwyzwb-2026-org-21'],
    ['221262102', '北京市昌平区农业农村局', '综合行政执法岗2', 2, 'gwyzwb-2026-org-21'],
    ['231263701', '北京市昌平区史各庄街道', '综合管理岗', 1, 'gwyzwb-2026-org-36'],
    ['231263702', '北京市昌平区史各庄街道', '政法专项岗', 1, 'gwyzwb-2026-org-36'],
    ['231263703', '北京市昌平区史各庄街道', '综合管理岗', 1, 'gwyzwb-2026-org-36'],
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
    assert.equal(row.eligibilityComplete, false, `${code} must not overstate full qualification coverage`);
    assert.ok(row.sources.includes(sourceId), `${code} must link to its source page`);
    assert.ok(published.positions.some((position) => position.code === code), `${code} must reach the website data`);
    assert.equal(sourceById.get(sourceId)?.level, 'secondary', `${code} source classification`);
  }

  assert.equal(new Set(expected.map(([code]) => code)).size, 15);
  assert.equal(positions.filter((position) => expected.some(([code]) => position.code === code)).length, 15);
  assert.deepEqual(
    ['gwyzwb-2026-org-25', 'gwyzwb-2026-org-27', 'gwyzwb-2026-org-21', 'gwyzwb-2026-org-36'].map((sourceId) => [sourceId, sourceById.get(sourceId)?.url]),
    [
      ['gwyzwb-2026-org-25', 'https://bj.gwyzwb.com/changping/2026_25.html'],
      ['gwyzwb-2026-org-27', 'https://bj.gwyzwb.com/changping/2026_27.html'],
      ['gwyzwb-2026-org-21', 'https://bj.gwyzwb.com/changping/2026_21.html'],
      ['gwyzwb-2026-org-36', 'https://bj.gwyzwb.com/changping/2026_36.html'],
    ],
  );
});
