import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2026 street and town mirror rows preserve their published codes and source pages', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expected = [
    ['231263201', '北京市昌平区城北街道', '综合行政执法岗', 2, 'gwyzwb-2026-org-31'],
    ['231263301', '北京市昌平区城南街道', '综合行政执法岗', 2, 'gwyzwb-2026-org-32'],
    ['231263302', '北京市昌平区城南街道', '政法专项岗', 1, 'gwyzwb-2026-org-32'],
    ['231263801', '北京市昌平区龙泽园街道', '城市管理岗', 1, 'gwyzwb-2026-org-45'],
    ['231263802', '北京市昌平区龙泽园街道', '综合行政执法岗', 1, 'gwyzwb-2026-org-45'],
    ['231263601', '北京市昌平区回龙观街道', '综合行政执法岗', 2, 'gwyzwb-2026-org-35'],
    ['231263901', '北京市昌平区东小口镇', '政法专项岗', 1, 'gwyzwb-2026-org-37'],
    ['231263902', '北京市昌平区东小口镇', '城乡建设岗', 1, 'gwyzwb-2026-org-37'],
    ['231263903', '北京市昌平区东小口镇', '综合行政执法岗', 1, 'gwyzwb-2026-org-37'],
    ['231263904', '北京市昌平区东小口镇', '综合管理岗', 2, 'gwyzwb-2026-org-37'],
    ['231264001', '北京市昌平区沙河镇', '农业推广岗', 1, 'gwyzwb-2026-org-38'],
    ['231264002', '北京市昌平区沙河镇', '综合行政执法岗', 2, 'gwyzwb-2026-org-38'],
    ['241264101', '北京市昌平区南口镇', '综合管理岗', 2, 'gwyzwb-2026-org-39'],
    ['241264701', '北京市昌平区流村镇', '统计管理岗', 1, 'gwyzwb-2026-org-42'],
    ['231264801', '北京市昌平区小汤山镇', '政法专项岗', 1, 'gwyzwb-2026-org-43'],
    ['231264802', '北京市昌平区小汤山镇', '社区建设岗', 1, 'gwyzwb-2026-org-43'],
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
    assert.equal(row.eligibilityComplete, false, `${code} must remain a partial candidate row`);
    assert.ok(row.sources.includes(sourceId), `${code} source link`);
    assert.ok(published.positions.some((position) => position.code === code), `${code} must be in the website data`);
    assert.equal(sourceById.get(sourceId)?.level, 'secondary', `${code} source level`);
  }

  assert.equal(positions.filter((position) => expected.some(([code]) => position.code === code)).length, 16);
  const longzeyuanSpecialRole = positions.find((position) => position.code === '231263802');
  assert.equal(longzeyuanSpecialRole.education, '本科或硕士研究生');
  assert.equal(longzeyuanSpecialRole.majorText, '本科：法学类（0301），公共管理类（1204）；研究生：法学（0301），法律（0351），公共管理学（1204），公共管理（1252）');
  assert.deepEqual(longzeyuanSpecialRole.majorCriteria, { undergraduate: ['0301', '1204'], graduate: ['0301', '0351', '1204', '1252'] });
  assert.ok(longzeyuanSpecialRole.sources.includes('gwyzwb-2026-org-45'));
  assert.equal(sourceById.get('gwyzwb-2026-org-45')?.url, 'https://bj.gwyzwb.com/changping/2026_45.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-35')?.url, 'https://bj.gwyzwb.com/changping/2026_35.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-37')?.url, 'https://bj.gwyzwb.com/changping/2026_37.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-38')?.url, 'https://bj.gwyzwb.com/changping/2026_38.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-39')?.url, 'https://bj.gwyzwb.com/changping/2026_39.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-42')?.url, 'https://bj.gwyzwb.com/changping/2026_42.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-43')?.url, 'https://bj.gwyzwb.com/changping/2026_43.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-31')?.url, 'https://bj.gwyzwb.com/changping/2026_31.html');
  assert.equal(sourceById.get('gwyzwb-2026-org-32')?.url, 'https://bj.gwyzwb.com/changping/2026_32.html');
});
