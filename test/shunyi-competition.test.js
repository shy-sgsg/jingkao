import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

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
  assert.equal(shunyiPositions.length, 33, 'the local positions are a source-backed subset, not the full directory');
  assert.equal(shunyiPositions.reduce((sum, item) => sum + item.recruitCount, 0), 58);
  for (const source of districtSources) {
    const rows = shunyiPositions.filter((item) => item.sources.includes(source.sourceId));
    assert.equal(rows.length, source.reportedPositionCount, `${source.sourceId} visible page rows`);
    assert.equal(rows.reduce((sum, item) => sum + item.recruitCount, 0), source.reportedRecruitCount, `${source.sourceId} hires`);
  }

  const expected = [
    ['221457001', '北京市顺义区教育委员会（北京市顺义区人民政府教育督导室）', '财务管理岗', 1, 134],
    ['221457002', '北京市顺义区教育委员会（北京市顺义区人民政府教育督导室）', '规划建设岗', 1, 133.5],
    ['221457101', '北京市顺义区民政局', '综合管理岗', 1, 130.25],
    ['221457201', '北京市顺义区司法局', '执法监督岗', 1, 130.5],
    ['821459001', '北京市顺义区投资促进服务中心', '产业促进岗', 1, 131],
    ['231459302', '北京市顺义区胜利街道', '综合管理岗', 2, 129],
    ['231460002', '北京市顺义区北石槽镇', '经济发展岗', 1, 127.5],
    ['221457301', '北京市顺义区财政局', '预算管理岗', 2, 127.5],
    ['221457503', '北京市顺义区住房和城乡建设委员会（北京市顺义区住房保障办公室、北京市顺义区人民政府房屋征收办公室）', '综合管理岗', 2, 127.25],
    ['221457901', '北京市顺义区文化和旅游局（北京市顺义区文物局）', '综合管理岗', 1, 127.25],
    ['221457701', '北京市顺义区水务局', '综合管理岗', 1, 127],
    ['821458901', '北京市顺义区地震局', '地震管理岗', 2, 129.25],
    ['821456801', '北京市顺义区档案馆', '档案管理岗', 2, 126.25],
    ['821456701', '中共北京市顺义区委党校（顺义区行政学院）', '综合管理岗', 3, 125.75],
    ['231458202', '北京市顺义区市场监督管理局（北京市顺义区知识产权局）', '监督管理岗', 1, 125.25],
    ['221458204', '北京市顺义区市场监督管理局（北京市顺义区知识产权局）', '执法办案岗1', 2, 131.5],
    ['221458002', '北京市顺义区卫生健康委员会（中共北京市顺义区委卫生健康工作委员会）', '卫生监督执法岗', 2, 122.5],
    ['821457401', '北京市顺义区人力资源和社会保障局', '案件审理岗', 1, 122.25],
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
    && item.positionCode === null).length, 5, 'ambiguous or absent codes must stay unlinked');
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

test('Shunyi Fenbi pages 2-8 link all additional local applicant counts and keep them distinct from qualified snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expectedByPage = {
    2: [
      ['221457002', 40, 1], ['221457101', 33, 1], ['221457201', 31, 1], ['221457301', 30, 2],
      ['821457401', 6, 1], ['821457501', 22, 2], ['221457502', 8, 1],
    ],
    3: [['221457503', 86, 2], ['221457701', 47, 1], ['221457901', 131, 1]],
    4: [['221458002', 4, 2], ['221458204', 40, 2]],
    5: [
      ['221458301', 29, 1], ['221458501', 48, 1], ['221458502', 84, 2], ['221458801', 30, 2],
      ['221458802', 9, 2], ['821458901', 30, 2], ['821459001', 15, 1],
    ],
    6: [['231459301', 97, 2], ['231459302', 64, 2]],
    7: [['231460001', 18, 1], ['231460002', 16, 1]],
    8: [['526012803', 0, 1], ['231458202', 4, 1]],
  };

  let applicantsTotal = 0;
  let recruitsTotal = 0;
  let importedCount = 0;
  for (const [page, rows] of Object.entries(expectedByPage)) {
    const sourceId = `shunyi-2026-fenbi-page-${page}`;
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} source exists`);
    assert.match(source.url, new RegExp(`page=${page}&region=174`));
    assert.equal(source.districtId, 'shunyi');

    for (const [code, applicants, recruits] of rows) {
      importedCount += 1;
      applicantsTotal += applicants;
      recruitsTotal += recruits;
      const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
      assert.ok(position, `position ${code} exists`);
      assert.equal(position.districtId, 'shunyi', `${code} district`);
      assert.equal(position.recruitCount, recruits, `${code} planned recruits`);

      const observation = dataset.observations.find((item) => item.year === 2026
        && item.positionCode === code && item.sourceId === sourceId);
      assert.equal(observation?.observationType, 'registration_snapshot', `${code} remains a reported-count reference`);
      assert.equal(observation?.applicantsRegistered, applicants, `${code} reported applicant count`);
      assert.equal(observation?.applicantsQualified, null, `${code} is not relabeled as a qualification count`);
      assert.equal(observation?.observedAt, null, `${code} has no source-reported timestamp`);

      const evidence = getPositionCompetitionEvidence(position, {
        observations: dataset.observations,
        scoreRows: dataset.scoreRows,
      });
      assert.equal(evidence.registeredCompetitionRatio, applicants / recruits, `${code} reported-count ratio`);
      assert.ok(evidence.registrationSourceIds.includes(sourceId), `${code} links to its Fenbi page`);
    }
  }

  assert.equal(importedCount, 25);
  assert.equal(applicantsTotal, 922);
  assert.equal(recruitsTotal, 36);

  const positions = dataset.positions.filter((item) => item.year === 2026 && item.districtId === 'shunyi');
  const evidenceRows = positions.map((position) => getPositionCompetitionEvidence(position, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  }));
  assert.equal(positions.length, 33);
  assert.ok(evidenceRows.every((item) => item.registeredCompetitionRatio !== null));
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null).length, 24);
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null && item.registeredCompetitionRatio !== null).length, 24);

  const culturePosition = positions.find((item) => item.code === '221457901');
  const cultureEvidence = getPositionCompetitionEvidence(culturePosition, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  });
  assert.equal(cultureEvidence.registeredCompetitionRatio, 131);
  assert.equal(cultureEvidence.qualifiedCompetitionRatio, 47);
  assert.equal(cultureEvidence.cutoffScore, 127.25);
});
