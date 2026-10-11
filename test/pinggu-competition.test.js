import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';

test('Pinggu 2026 partial cutoff sample links unique position codes and keeps unresolved rows explicit', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'cgzj-2026-pinggu-cutoff-sample';
  const expected = [
    ['241370901', '北京市平谷区马坊镇', '经济管理岗', 1, 128],
    ['821369003', '北京市平谷区财政局', '绩效管理岗', 1, 126.5],
    ['821368802', '北京市平谷区住房和城乡建设委员会', '工程管理岗', 1, 125.5],
    ['821368902', '北京市平谷区人力资源和社会保障局', '社保综合岗', 2, 125],
    ['121368601', '中共北京市平谷区委政法委员会', '执法监督岗', 1, 124.75],
    ['121368501', '中共北京市平谷区委员会办公室', '综合管理岗', 2, 124.5],
    ['821370301', '北京市平谷区城市管理指挥中心', '数据分析岗', 1, 124.25],
    ['625015201', '北京市平谷区人民检察院', '检察业务岗', 4, 123.25],
    ['241371203', '北京市平谷区夏各庄镇', '综合管理岗', 2, 122],
    ['221369601', '北京市平谷区交通局', '行政执法岗', 2, 121.5],
    ['241370902', '北京市平谷区马坊镇', '综合执法岗', 1, 121.25],
    ['221369101', '北京市平谷区民政局', '综合管理岗', 1, 120],
    ['241371402', '北京市平谷区山东庄镇', '综合管理岗', 1, 120],
    ['221369701', '北京市平谷区商务局', '综合管理岗', 2, 110.75],
    ['241371801', '北京市平谷区刘家店镇', '综合管理岗', 2, 110.25],
    ['821370201', '北京市平谷区档案馆', '综合管理岗', 1, 109.5],
    ['241371501', '北京市平谷区大华山镇', '综合管理岗', 2, 109],
    ['241371301', '北京市平谷区南独乐河镇', '综合管理岗', 1, 108.5],
    ['241370502', '北京市平谷区滨河街道', '综合执法岗', 2, 104],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.url, 'https://www.cgzj.com/sk/12635.html');

  for (const [code, unit, title, recruits, score] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `2026 Pinggu position ${code} should be available`);
    assert.equal(position.unit, unit, `${code} unit`);
    assert.equal(position.title, title, `${code} title`);
    assert.equal(position.recruitCount, recruits, `${code} planned recruits`);
    assert.equal(position.districtId, 'pinggu', `${code} district`);

    const rows = dataset.scoreRows.filter((item) => item.year === 2026
      && item.sourceId === sourceId && item.positionCode === code);
    assert.equal(rows.length, 1, `${code} should have one exact cutoff row`);
    assert.equal(rows[0].score, score);
    assert.equal(rows[0].mappingConfidence, 'high');
  }

  const sample = dataset.scoreSamples.find((item) => item.sourceId === sourceId);
  const rows = dataset.scoreRows.filter((item) => item.year === 2026 && item.sourceId === sourceId);
  assert.equal(sample?.samplePositions, 30, 'only the 30 visible score rows are represented');
  assert.equal(sample?.minimum, 104);
  assert.equal(sample?.maximum, 128);
  assert.equal(rows.length, 30);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'high' && item.positionCode).length, 19);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'ambiguous' && !item.positionCode).length, 8);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'unmatched' && !item.positionCode).length, 3);
});

test('Pinggu 2026 registration snapshot links the dated qualified count to one exact position', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const code = '241369303';
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
  const row = dataset.observations.find((item) => item.year === 2026
    && item.sourceId === 'eoffcn-2026-snapshot-20251117-1800' && item.positionCode === code);

  assert.equal(position?.unit, '北京市平谷区市场监督管理局');
  assert.equal(position?.title, '监督管理岗');
  assert.equal(position?.recruitCount, 1);
  assert.equal(row?.scope, 'position-level');
  assert.equal(row?.observedAt, '2025-11-17 18:00');
  assert.equal(row?.applicantsQualified, 11);
  assert.equal(row?.recruitCount, 1);
  assert.equal(row?.qualifiedCompetitionRatio, 11);
});
