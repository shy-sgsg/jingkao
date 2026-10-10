import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';

test('2026 Shunyi cutoff samples attach only to exact year, unit, title, and code matches', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'cgzj-2026-shunyi-cutoff-sample';
  const districtSources = dataset.sources.filter((item) => item.sourceId.startsWith('gwyzwb-2026-shunyi-page-')
    || item.sourceId === 'gwyzwb-2026-shunyi-culture-tourism'
    || item.sourceId === 'gwyzwb-2026-shunyi-investment-center');
  const shunyiPositions = dataset.positions.filter((item) => item.year === 2026 && item.districtId === 'shunyi');
  const directory = dataset.sources.find((item) => item.sourceId === 'gwyzwb-2026-shunyi-index');
  assert.equal(directory?.reportedPositionCount, 88);
  assert.equal(directory?.reportedRecruitCount, 138);
  assert.equal(shunyiPositions.length, 23, 'the local positions are a source-backed subset, not the full directory');
  assert.equal(shunyiPositions.reduce((sum, item) => sum + item.recruitCount, 0), 41);
  for (const source of districtSources) {
    const rows = shunyiPositions.filter((item) => item.sources.includes(source.sourceId));
    assert.equal(rows.length, source.reportedPositionCount, `${source.sourceId} visible page rows`);
    assert.equal(rows.reduce((sum, item) => sum + item.recruitCount, 0), source.reportedRecruitCount, `${source.sourceId} hires`);
  }

  const expected = [
    ['221457001', '北京市顺义区教育委员会（北京市顺义区人民政府教育督导室）', '财务管理岗', 1, 134],
    ['221457002', '北京市顺义区教育委员会（北京市顺义区人民政府教育督导室）', '规划建设岗', 1, 133.5],
    ['821459001', '北京市顺义区投资促进服务中心', '产业促进岗', 1, 131],
    ['231459302', '北京市顺义区胜利街道', '综合管理岗', 2, 129],
    ['231460002', '北京市顺义区北石槽镇', '经济发展岗', 1, 127.5],
    ['221457503', '北京市顺义区住房和城乡建设委员会（北京市顺义区住房保障办公室、北京市顺义区人民政府房屋征收办公室）', '综合管理岗', 2, 127.25],
    ['221457901', '北京市顺义区文化和旅游局（北京市顺义区文物局）', '综合管理岗', 1, 127.25],
    ['221457701', '北京市顺义区水务局', '综合管理岗', 1, 127],
    ['625014901', '北京市顺义区人民检察院', '检察业务岗', 4, 109.75],
    ['221458301', '北京市顺义区体育局', '综合管理岗', 1, 109.5],
    ['221458501', '北京市顺义区园林绿化局', '综合管理岗', 1, 108.75],
    ['526012801', '北京市顺义区人民法院', '法官助理岗', 8, 107.5],
    ['221458802', '北京市顺义区城市管理综合行政执法局', '行政执法岗2', 2, 106.75],
    ['231459301', '北京市顺义区胜利街道', '行政执法岗', 2, 100],
  ];

  for (const [code, unit, title, recruits, score] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} should be available for comparison`);
    assert.equal(position.unit, unit, `${code} unit`);
    assert.equal(position.title, title, `${code} title`);
    assert.equal(position.recruitCount, recruits, `${code} planned recruits`);
    assert.equal(position.districtId, 'shunyi', `${code} district`);

    const rows = dataset.scoreRows.filter((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === sourceId);
    assert.equal(rows.length, 1, `${code} should have one linked cutoff row`);
    assert.equal(rows[0].score, score);
    assert.equal(rows[0].mappingConfidence, 'high');
  }

  const sample = dataset.scoreSamples.find((item) => item.sourceId === sourceId);
  assert.equal(sample?.samplePositions, 29, 'only the 29 visible rows are represented');
  assert.equal(sample?.minimum, 100);
  assert.equal(sample?.maximum, 134);
  assert.equal(dataset.scoreRows.filter((item) => item.year === 2026 && item.sourceId === sourceId).length, 29);
  assert.equal(dataset.scoreRows.filter((item) => item.year === 2026 && item.sourceId === sourceId
    && item.positionCode === null).length, 15, 'ambiguous or absent codes must stay unlinked');
});

test('2026 Shunyi Culture and Tourism registration snapshots preserve four dated qualified-count observations', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const code = '221457901';
  const expected = [
    ['eoffcn-2026-snapshot-20251118-0900', '2025-11-18 09:00', 25, 'position-level'],
    ['eoffcn-2026-snapshot-20251118-1800', '2025-11-18 18:00', 47, 'position-level'],
    ['eoffcn-2026-snapshot-20251119-0900', '2025-11-19 09:00', 47, 'unit-level'],
    ['eoffcn-2026-snapshot-20251119-1800', '2025-11-19 18:00', 76, 'unit-level'],
  ];

  for (const [sourceId, observedAt, qualified, scope] of expected) {
    const row = dataset.observations.find((item) => item.year === 2026 && item.sourceId === sourceId
      && (scope === 'position-level' ? item.positionCode === code : item.unit === '北京市顺义区文化和旅游局（北京市顺义区文物局）'));
    assert.equal(row?.scope, scope);
    assert.equal(row?.positionCode, scope === 'position-level' ? code : null);
    assert.equal(row?.observedAt, observedAt);
    assert.equal(row?.applicantsQualified, qualified);
    assert.equal(row?.recruitCount, 1);
    assert.equal(row?.qualifiedCompetitionRatio, qualified);
  }
});
