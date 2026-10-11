import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizePositionCoverage } from '../src/data/coverage.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('all visible 2026 Changping interview cutoffs are available as source-backed rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const rows = data.scoreRows.filter((row) => row.year === 2026 && row.sourceId === 'cgzj-2026-cutoff-sample');
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-cutoff-sample');

  assert.equal(rows.length, 31);
  assert.ok(rows.every((row) => Number.isFinite(row.score) && row.sourceId === source.sourceId));
  assert.equal(source.level, 'secondary');
  assert.equal(source.url, 'https://www.cgzj.com/sydw/12617.html');
  assert.deepEqual([Math.min(...rows.map((row) => row.score)), Math.max(...rows.map((row) => row.score))], [106.25, 139.5]);
  assert.equal(new Set(rows.map((row) => row.id)).size, 31);
});

test('score sample count and bounds are derived from its concrete score rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const rows = data.scoreRows.filter((row) => row.year === 2026);
  const samples = data.scoreSamples.filter((item) => item.year === 2026);

  assert.equal(samples.length, 16);
  assert.equal(samples.reduce((total, sample) => total + sample.samplePositions, 0), rows.length);
  for (const sample of samples) {
    const sourceRows = rows.filter((row) => row.sourceId === sample.sourceId);
    assert.equal(sample.samplePositions, sourceRows.length);
    assert.equal(sample.minimum, Math.min(...sourceRows.map((row) => row.score)));
    assert.equal(sample.maximum, Math.max(...sourceRows.map((row) => row.score)));
  }
  assert.equal(summarizePositionCoverage(data).find((row) => row.year === 2026).namedScoreExamples, rows.length);

  const fangshan = samples.find((sample) => sample.sourceId === 'cgzj-2026-fangshan-cutoff-sample');
  assert.equal(fangshan.samplePositions, 23);
  assert.equal(fangshan.sampleRecruits, 91);
  assert.deepEqual([fangshan.minimum, fangshan.maximum], [100.75, 136.25]);
  const fangshanRows = rows.filter((row) => row.sourceId === 'cgzj-2026-fangshan-cutoff-sample');
  assert.deepEqual(fangshanRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 11, ambiguous: 12, unmatched: 0 });

  const daxing = samples.find((sample) => sample.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  assert.equal(daxing.samplePositions, 31);
  assert.equal(daxing.sampleRecruits, 77);
  assert.deepEqual([daxing.minimum, daxing.maximum], [102.25, 136.25]);
  const daxingRows = rows.filter((row) => row.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  assert.deepEqual(daxingRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 19, ambiguous: 8, unmatched: 4 });

  const shijingshan = samples.find((sample) => sample.sourceId === 'cgzj-2026-shijingshan-cutoff-sample');
  assert.equal(shijingshan.samplePositions, 27);
  assert.equal(shijingshan.sampleRecruits, 40);
  assert.deepEqual([shijingshan.minimum, shijingshan.maximum], [98.75, 136]);
  const shijingshanRows = rows.filter((row) => row.sourceId === 'cgzj-2026-shijingshan-cutoff-sample');
  assert.deepEqual(shijingshanRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 26, ambiguous: 1, unmatched: 0 });

  const fengtai = samples.find((sample) => sample.sourceId === 'cgzj-2026-fengtai-cutoff-sample');
  assert.equal(fengtai.samplePositions, 9);
  assert.equal(fengtai.sampleRecruits, 112);
  assert.deepEqual([fengtai.minimum, fengtai.maximum], [52.15, 122]);
  assert.match(fengtai.notes, /标题\/H1.*106\.25.*52\.15/);
  const fengtaiRows = rows.filter((row) => row.sourceId === 'cgzj-2026-fengtai-cutoff-sample');
  assert.deepEqual(fengtaiRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 9, ambiguous: 0, unmatched: 0 });

  const huairou = samples.find((sample) => sample.sourceId === 'cgzj-2026-huairou-cutoff-sample');
  assert.equal(huairou.samplePositions, 25);
  assert.equal(huairou.sampleRecruits, 36);
  assert.deepEqual([huairou.minimum, huairou.maximum], [95.25, 129.75]);
  const huairouRows = rows.filter((row) => row.sourceId === 'cgzj-2026-huairou-cutoff-sample');
  assert.deepEqual(huairouRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 23, ambiguous: 0, unmatched: 2 });

  const miyun = samples.find((sample) => sample.sourceId === 'cgzj-2026-miyun-cutoff-sample');
  assert.equal(miyun.samplePositions, 28);
  assert.deepEqual([miyun.minimum, miyun.maximum], [95, 140.25]);
  assert.equal(miyun.notes.includes('不挂代码'), true);
  const miyunRows = rows.filter((row) => row.sourceId === 'cgzj-2026-miyun-cutoff-sample');
  assert.deepEqual(miyunRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 24, ambiguous: 4, unmatched: 0 });
});

test('Shijingshan position cards receive exact code-linked cutoff scores from the partial district table', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-shijingshan-cutoff-sample');
  const position = data.positions.find((row) => row.year === 2026 && row.code === '820844303');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(source.samplePositions, 27);
  assert.equal(source.sampleRecruits, 40);
  assert.equal(evidence.cutoffScore, 136);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-shijingshan-cutoff-sample']);
});

test('Daxing cutoff records link to unique 2026 positions and keep duplicate titles unassigned', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const sourceId = 'cgzj-2026-daxing-cutoff-sample';
  const linked = [
    ['2026-cgzj-daxing-06', '239910901', 130.75],
    ['2026-cgzj-daxing-07', '231568101', 130.5],
    ['2026-cgzj-daxing-08', '625015102', 130.25],
    ['2026-cgzj-daxing-09', '221565201', 130.25],
    ['2026-cgzj-daxing-11', '821566601', 130],
    ['2026-cgzj-daxing-12', '821565001', 129.75],
    ['2026-cgzj-daxing-15', '526013001', 128.75],
    ['2026-cgzj-daxing-16', '231568401', 127.5],
    ['2026-cgzj-daxing-18', '221565401', 126.75],
    ['2026-cgzj-daxing-19', '231568002', 126.5],
    ['2026-cgzj-daxing-24', '231567705', 125.75],
    ['2026-cgzj-daxing-27', '821565601', 125],
    ['2026-cgzj-daxing-28', '821565604', 124.75],
  ];

  for (const [rowId, code, cutoff] of linked) {
    const scoreRow = data.scoreRows.find((row) => row.id === rowId);
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    assert.ok(position, `position ${code} should be available for its cutoff record`);
    assert.equal(scoreRow?.sourceId, sourceId);
    assert.equal(scoreRow?.mappingConfidence, 'high');
    assert.equal(scoreRow?.positionCode, code);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: data.observations,
      scoreRows: data.scoreRows,
    });
    assert.equal(evidence.cutoffScore, cutoff, `position ${code} should show its matched cutoff`);
  }

  const ambiguous = [
    ['2026-cgzj-daxing-04', '北京市大兴区财政局', '综合管理岗', ['221565203', '821565202']],
    ['2026-cgzj-daxing-14', '北京市大兴区采育镇', '综合管理岗', ['231567701', '231567702', '231567703', '231567704']],
    ['2026-cgzj-daxing-23', '北京市大兴区榆垡镇', '综合管理岗', ['231567101', '231567102']],
    ['2026-cgzj-daxing-29', '北京市大兴区榆垡镇', '综合管理岗', ['231567101', '231567102']],
  ];
  for (const [rowId, unit, title, expectedCodes] of ambiguous) {
    const scoreRow = data.scoreRows.find((row) => row.id === rowId);
    const candidates = data.positions.filter((row) => row.year === 2026 && row.unit === unit && row.title === title);
    assert.deepEqual(candidates.map((row) => row.code).sort(), expectedCodes);
    assert.equal(scoreRow?.mappingConfidence, 'ambiguous');
    assert.equal(scoreRow?.positionCode, null);
    for (const candidate of candidates) {
      const evidence = getPositionCompetitionEvidence(candidate, {
        observations: data.observations,
        scoreRows: data.scoreRows,
      });
      assert.equal(evidence.cutoffScore, null, `ambiguous score ${rowId} must not leak to ${candidate.code}`);
    }
  }
});

test('Fengtai police post receives the exact 2026 interview cutoff exposed in the district table', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const position = data.positions.find((row) => row.year === 2026 && row.code === '232502201');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(evidence.cutoffScore, 52.15);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-fengtai-cutoff-sample']);
});

test('the 2026 street cutoff sample exposes exact Haidian, Mentougou, and Fengtai position cutoffs', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-street-cutoff-sample');
  const expected = [
    ['230637402', 138.25],
    ['230637602', 133],
    ['230637701', 129.75],
    ['230637703', 104.25],
    ['230638302', 101.5],
    ['240948402', 102.75],
    ['230742504', 104.5],
  ];

  assert.equal(source.samplePositions, 7);
  assert.equal(source.intervieweeCount, 262);
  for (const [code, score] of expected) {
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    const evidence = getPositionCompetitionEvidence(position, { scoreRows: data.scoreRows });
    assert.equal(evidence.cutoffScore, score, `${code} should expose its source-backed cutoff`);
    assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-street-cutoff-sample']);
  }
});

test('the 2026 Dongcheng cutoff table is captured and only uniquely matched jobs receive scores', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const sourceId = 'cgzj-2026-dongcheng-cutoff-sample';
  const rows = data.scoreRows.filter((row) => row.sourceId === sourceId);
  const sample = data.scoreSamples.find((item) => item.sourceId === sourceId);
  const expectedLinked = [
    ['220116602', 137.5],
    ['220118401', 137],
    ['230119601', 136.25],
    ['220117101', 134.75],
    ['820116801', 134.25],
    ['720119001', 133.75],
    ['230119802', 133.75],
    ['820116201', 133.5],
    ['230119501', 133.5],
    ['220116901', 132.75],
    ['220118001', 132.75],
    ['230119801', 132.75],
    ['220118301', 132.5],
    ['820118603', 132.5],
    ['820117202', 132.25],
    ['220116601', 132],
    ['220117401', 132],
    ['220117801', 131.5],
    ['820117004', 131.25],
    ['220117303', 131.25],
    ['220117505', 108.25],
    ['230119503', 103],
    ['232501801', 55.9],
  ];

  assert.equal(rows.length, 26);
  assert.equal(sample.samplePositions, 26);
  assert.deepEqual([sample.minimum, sample.maximum], [55.9, 137.5]);
  assert.equal(rows.filter((row) => row.mappingConfidence === 'high').length, 23);
  assert.equal(rows.filter((row) => row.mappingConfidence === 'ambiguous').length, 3);
  assert.ok(rows.every((row) => row.orgType), 'all table rows should retain the source-backed unit type for filtering');

  for (const [code, score] of expectedLinked) {
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    assert.ok(position, `position ${code} should be available for comparison`);
    const scoreRow = rows.find((row) => row.positionCode === code);
    assert.equal(scoreRow.orgType, position.orgType, `${code} should use its matched job's unit type`);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: data.observations,
      scoreRows: data.scoreRows,
    });
    assert.equal(evidence.cutoffScore, score, `${code} should expose its source-backed cutoff`);
    assert.deepEqual(evidence.cutoffSourceIds, [sourceId]);
  }

  const unresolved = rows.filter((row) => row.mappingConfidence === 'ambiguous');
  assert.ok(unresolved.every((row) => row.positionCode === null));
  assert.ok(unresolved.some((row) => row.title === '纪检监察岗'));
  assert.equal(data.positions.filter((row) => row.year === 2026 && row.districtId === 'dongcheng').length, 23);
});

test('Daxing cutoff rows attach to unique positions while repeated names remain unresolved', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  const rows = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  const waterPosition = data.positions.find((row) => row.year === 2026 && row.code === '821565801');
  const waterEvidence = getPositionCompetitionEvidence(waterPosition, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });
  const dataRole = data.positions.find((row) => row.year === 2026 && row.code === '221566401');
  const dataRoleEvidence = getPositionCompetitionEvidence(dataRole, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(source.samplePositions, 31);
  assert.equal(source.sampleRecruits, 77);
  assert.equal(rows.length, 31);
  assert.equal(waterEvidence.cutoffScore, 136.25);
  assert.deepEqual(waterEvidence.cutoffSourceIds, ['cgzj-2026-daxing-cutoff-sample']);
  assert.equal(dataRoleEvidence.cutoffScore, 126);
  assert.deepEqual(dataRoleEvidence.cutoffSourceIds, ['cgzj-2026-daxing-cutoff-sample']);
  for (const code of ['821566201', '821566202']) {
    const statisticsPosition = data.positions.find((row) => row.year === 2026 && row.code === code);
    const statisticsEvidence = getPositionCompetitionEvidence(statisticsPosition, {
      observations: data.observations,
      scoreRows: data.scoreRows,
    });
    assert.equal(statisticsEvidence.cutoffScore, null, `${code} must not inherit an ambiguous same-title score`);
  }
  assert.ok(rows.filter((row) => row.mappingConfidence === 'ambiguous')
    .every((row) => row.positionCode === null));
  assert.match(source.notes, /部分/);
});

test('Fangshan position detail receives the source-backed 2026 interview cutoff by exact position code', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const position = data.positions.find((row) => row.year === 2026 && row.code === '121049302');

  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(evidence.cutoffScore, 136.25);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-fangshan-cutoff-sample']);
});

test('Huairou position detail receives its exact 2026 cutoff from the partial district table', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const position = data.positions.find((row) => row.year === 2026 && row.code === '821673201');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(evidence.cutoffScore, 129.75);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-huairou-cutoff-sample']);
});

test('Miyun position detail exposes its uniquely matched cutoff while the duplicate-name minimum stays unlinked', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const position = data.positions.find((row) => row.year === 2026 && row.code === '221874901');
  assert.ok(position, 'Miyun source-backed position should be available in the position library');

  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });
  assert.equal(evidence.cutoffScore, 140.25);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-miyun-cutoff-sample']);

  const ambiguousMinimum = data.scoreRows.find((row) => row.id === '2026-cgzj-miyun-02');
  assert.equal(ambiguousMinimum.mappingConfidence, 'ambiguous');
  assert.equal(ambiguousMinimum.positionCode, null);
});

test('Tongzhou fiscal positions receive their distinct 2026 interview cutoffs by exact position code', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const expected = [['821153902', 142], ['221153901', 132.5]];

  for (const [code, score] of expected) {
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: data.observations,
      scoreRows: data.scoreRows,
    });

    assert.equal(evidence.cutoffScore, score);
    assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-tongzhou-fiscal-cutoff-sample']);
  }
});

test('Tongzhou district-only cutoff stays unlinked while the dated 2025 police cutoff maps to its post', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const minimum = data.sources.find((source) => source.sourceId === 'cgzj-2026-tongzhou-minimum-summary');
  const conflictIds = [
    'cgzj-2026-fiscal-cutoff-summary-conflict',
  ];

  assert.equal(minimum?.minimum, 104.75);
  assert.match(minimum?.notes ?? '', /未给出对应单位、岗位或职位代码/);
  for (const sourceId of conflictIds) {
    const source = data.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} should remain registered as a conflicting source`);
    assert.equal(source.evidenceType, 'cutoff_year_conflict');
    assert.equal(data.scoreRows.some((row) => row.sourceId === sourceId), false);
  }
  assert.equal(data.scoreRows.some((row) => row.positionCode === '221153901' && row.score === 142), false);

  const policeSource = data.sources.find((source) => source.sourceId === 'cgzj-2025-tongzhou-cutoff-year-conflict');
  const policeRow = data.scoreRows.find((row) => row.id === '2025-cgzj-tongzhou-police-01');
  const position = data.positions.find((row) => row.year === 2025 && row.code === '232502401');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });

  assert.equal(policeSource?.evidenceType, 'cutoff_year_conflict');
  assert.equal(policeSource?.year, 2025);
  assert.equal(policeRow?.positionCode, position.code);
  assert.equal(policeRow?.score, 54.5);
  assert.equal(evidence.cutoffScore, 54.5);
  assert.deepEqual(evidence.cutoffSourceIds, [policeSource.sourceId]);
  assert.equal(evidence.snapshots.length, 4);
  assert.equal(evidence.qualifiedCompetitionRatio, 403 / 40);
});

test('Haidian and Xicheng third-party samples expose their partial scope and unresolved rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const haidian = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-haidian-cutoff-sample');
  const xicheng = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-xicheng-cutoff-sample');

  assert.equal(haidian.length, 25);
  assert.equal(haidian.filter((row) => row.mappingConfidence === 'high').length, 23);
  assert.equal(haidian.filter((row) => row.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(xicheng.length, 28);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'high').length, 26);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'unmatched').length, 0);

  const position = data.positions.find((row) => row.year === 2026 && row.code === '230225202');
  const evidence = getPositionCompetitionEvidence(position, { scoreRows: data.scoreRows });
  assert.equal(evidence.cutoffScore, 98);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-xicheng-cutoff-sample']);
});

test('Yanqing partial cutoff rows retain the visible sample size and mapping uncertainty', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const rows = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-yanqing-cutoff-sample');
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-yanqing-cutoff-sample');

  assert.equal(rows.length, 28);
  assert.equal(rows.filter((row) => row.mappingConfidence === 'high').length, 21);
  assert.equal(rows.filter((row) => row.mappingConfidence === 'ambiguous').length, 3);
  assert.equal(rows.filter((row) => row.mappingConfidence === 'unmatched').length, 4);
  assert.equal(source.samplePositions, 28);
  assert.equal(source.sampleRecruits, 49);
  assert.match(source.notes, /样本不代表全区全量/);
});

test('the dated 2025 Changping minimum links to its uniquely matching post despite the body-year typo', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2025-cutoff-year-conflict');
  const scoreRow = data.scoreRows.find((row) => row.id === '2025-cgzj-changping-minimum-01');
  const position = data.positions.find((row) => row.year === 2025 && row.code === '221264501');
  const evidence = getPositionCompetitionEvidence(position, { scoreRows: data.scoreRows });

  assert.equal(source.level, 'secondary');
  assert.equal(source.year, 2025);
  assert.equal(source.url, 'https://www.cgzj.com/sk/4079.html');
  assert.match(source.notes, /标题.*2025.*正文.*2026/);
  assert.equal(scoreRow.positionCode, position.code);
  assert.equal(scoreRow.score, 105);
  assert.equal(evidence.cutoffScore, 105);
  assert.deepEqual(evidence.cutoffSourceIds, [source.sourceId]);
  assert.equal(data.scoreSamples.some((sample) => sample.sourceId === source.sourceId), true);
  assert.equal(data.scoreRows.find((row) => row.id === '2025-cgzj-tongzhou-police-01')?.score, 54.5);
});

test('named 2025 district-minimum scores surface on the exact linked position records', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const expected = [
    ['241053002', 97.75],
    ['230638901', 102.25],
    ['230531301', 104.25],
    ['242502101', 53.75],
    ['231462301', 111],
    ['221372401', 108.75],
    ['232501702', 56.7],
  ];

  for (const [code, score] of expected) {
    const position = data.positions.find((row) => row.year === 2025 && row.code === code);
    const evidence = getPositionCompetitionEvidence(position, { scoreRows: data.scoreRows });
    assert.equal(evidence.cutoffScore, score, `${code} should display its linked historical cutoff`);
  }

  const westCityPolice = data.positions.find((row) => row.year === 2025 && row.code === '232501702');
  const policeEvidence = getPositionCompetitionEvidence(westCityPolice, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });
  assert.equal(policeEvidence.snapshots.length, 4);
  assert.equal(policeEvidence.qualifiedCompetitionRatio, 650 / 70);
});

test('matched cutoff codes point to one exact same-year position; ambiguous matches stay unassigned', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const rows = data.scoreRows.filter((row) => row.positionCode);

  for (const row of rows) {
    const matches = data.positions.filter((position) => Number(position.year) === Number(row.year)
      && position.code === row.positionCode
      && position.unit === row.unit
      && position.title === row.title);
    assert.equal(matches.length, 1, `${row.name} should match exactly one position`);
    assert.equal(row.mappingConfidence, 'high');
  }
  assert.ok(data.scoreRows.filter((row) => row.mappingConfidence === 'ambiguous').every((row) => row.positionCode === null));
});

test('score scenario renders a year-scoped ECDF and moves its target with the slider', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(app, /function scoreEcdfSvg\(scoreRows, year, targetScore\)/);
  assert.match(app, /scoreEcdfSvg\(scoreRows, year, scenarioScore\)/);
  assert.match(app, /class="chart-line" pathLength="1"/);
  assert.match(app, /score-ecdf-target-point/);
  assert.match(app, /历史最低进面线覆盖 · \$\{coverage\}/);
  assert.match(app, /ecdfPoint\.setAttribute\('cx'/);
});

test('score segments use organization fields directly and job categories only after an exact high-confidence match', async () => {
  const { filterScoreRowsBySegment } = await import('../src/data/positions.js');
  assert.equal(typeof filterScoreRowsBySegment, 'function', 'score scenario should expose evidence-gated segment filtering');

  const rows = [
    { id: 'district', year: 2026, unit: '区局', title: '综合管理岗', orgType: '区直', positionCode: '001', mappingConfidence: 'high' },
    { id: 'street', year: 2026, unit: '街道', title: '综合管理岗', orgType: '街道', positionCode: '002', mappingConfidence: 'high' },
    { id: 'town', year: 2026, unit: '乡镇', title: '综合管理岗', orgType: '镇', positionCode: '003', mappingConfidence: 'high' },
    { id: 'ordinary', year: 2026, unit: '普通单位', title: '综合管理岗', orgType: '区直', positionCode: '004', mappingConfidence: 'high' },
    { id: 'enforcement', year: 2026, unit: '执法单位', title: '执法岗', orgType: '区直', positionCode: '005', mappingConfidence: 'high' },
    { id: 'public-management', year: 2026, unit: '专业单位', title: '专业岗', orgType: '区直', positionCode: '006', mappingConfidence: 'high' },
    { id: 'unclassified', year: 2026, unit: '分类资料缺失单位', title: '岗位', orgType: '区直', positionCode: '007', mappingConfidence: 'high' },
    { id: 'unmatched', year: 2026, unit: '未匹配单位', title: '岗位', orgType: '区直', positionCode: null, mappingConfidence: 'unmatched' },
    { id: 'conflicting-code', year: 2026, unit: '不唯一单位', title: '岗位', orgType: '区直', positionCode: 'DUP', mappingConfidence: 'high' },
    { id: 'incomplete-major', year: 2026, unit: '专业待核单位', title: '综合管理岗', orgType: '区直', positionCode: '008', mappingConfidence: 'high' },
  ];
  const position = (row, code, jobType, majorText = '法学') => ({
    year: 2026, code, unit: row.unit, title: row.title, jobType, majorText,
  });
  const positions = [
    position(rows[0], '001', '综合管理'),
    position(rows[1], '002', '综合管理'),
    position(rows[2], '003', '综合管理'),
    position(rows[3], '004', '综合管理'),
    position(rows[4], '005', '行政执法'),
    position(rows[5], '006', '司法警察', '本科：公共管理类（1204）'),
    position(rows[6], '007', '综合管理', ''),
    position(rows[8], 'DUP', '综合管理'),
    { ...position(rows[8], 'DUP', '综合管理'), unit: '另一单位' },
    position(rows[9], '008', '综合管理', '待核实；不用于专业条件匹配'),
  ];

  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'district').map((row) => row.id), [
    'district', 'ordinary', 'enforcement', 'public-management', 'unclassified', 'unmatched', 'conflicting-code', 'incomplete-major',
  ]);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'street').map((row) => row.id), ['street']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'town').map((row) => row.id), ['town']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'ordinary').map((row) => row.id), ['district', 'street', 'town', 'ordinary']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'enforcement').map((row) => row.id), ['enforcement']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'public-management').map((row) => row.id), ['public-management']);
});
