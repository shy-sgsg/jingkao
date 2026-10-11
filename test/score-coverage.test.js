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
  assert.equal(fangshan.samplePositions, 8);
  assert.equal(fangshan.sampleRecruits, 91);
  assert.deepEqual([fangshan.minimum, fangshan.maximum], [100.75, 136.25]);

  const daxing = samples.find((sample) => sample.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  assert.equal(daxing.samplePositions, 31);
  assert.equal(daxing.sampleRecruits, 77);
  assert.deepEqual([daxing.minimum, daxing.maximum], [102.25, 136.25]);
  const daxingRows = rows.filter((row) => row.sourceId === 'cgzj-2026-daxing-cutoff-sample');
  assert.deepEqual(daxingRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
    high: 0, ambiguous: 0, unmatched: 0,
  }), { high: 5, ambiguous: 2, unmatched: 24 });

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
  assert.equal(miyun.samplePositions, 2);
  assert.deepEqual([miyun.minimum, miyun.maximum], [95, 140.25]);
  assert.equal(miyun.notes.includes('不挂到任一代码'), true);
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

test('the 2026 street cutoff sample exposes its exact Haidian and Mentougou position cutoffs', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2026-street-cutoff-sample');
  const expected = [
    ['230637402', 138.25],
    ['230637602', 133],
    ['230637701', 129.75],
    ['230637703', 104.25],
    ['230638302', 101.5],
    ['240948402', 102.75],
  ];

  assert.equal(source.samplePositions, 6);
  assert.equal(source.intervieweeCount, 262);
  for (const [code, score] of expected) {
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    const evidence = getPositionCompetitionEvidence(position, { scoreRows: data.scoreRows });
    assert.equal(evidence.cutoffScore, score, `${code} should expose its source-backed cutoff`);
    assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-street-cutoff-sample']);
  }
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

  assert.equal(source.samplePositions, 31);
  assert.equal(source.sampleRecruits, 77);
  assert.equal(rows.length, 31);
  assert.equal(waterEvidence.cutoffScore, 136.25);
  assert.deepEqual(waterEvidence.cutoffSourceIds, ['cgzj-2026-daxing-cutoff-sample']);
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

test('Tongzhou district-only and year-conflicted score summaries do not become position cutoff rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const minimum = data.sources.find((source) => source.sourceId === 'cgzj-2026-tongzhou-minimum-summary');
  const conflictIds = [
    'cgzj-2026-tongzhou-cutoff-summary-conflict',
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
});

test('Haidian and Xicheng third-party samples expose their partial scope and unresolved rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const haidian = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-haidian-cutoff-sample');
  const xicheng = data.scoreRows.filter((row) => row.sourceId === 'cgzj-2026-xicheng-cutoff-sample');

  assert.equal(haidian.length, 25);
  assert.equal(haidian.filter((row) => row.mappingConfidence === 'high').length, 23);
  assert.equal(haidian.filter((row) => row.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(xicheng.length, 28);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'high').length, 25);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(xicheng.filter((row) => row.mappingConfidence === 'unmatched').length, 1);
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

test('a conflicting-year 2025 score page is registered but excluded from named cutoff rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const source = data.sources.find((item) => item.sourceId === 'cgzj-2025-cutoff-year-conflict');

  assert.equal(source.level, 'secondary');
  assert.equal(source.year, 2025);
  assert.equal(source.url, 'https://www.cgzj.com/sk/4079.html');
  assert.match(source.notes, /标题.*2025.*正文.*2026/);
  assert.equal(data.scoreRows.filter((row) => row.year === 2025).length, 0);
  assert.equal(data.scoreSamples.some((sample) => sample.year === 2025), false);
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
  ];

  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'district').map((row) => row.id), [
    'district', 'ordinary', 'enforcement', 'public-management', 'unclassified', 'unmatched', 'conflicting-code',
  ]);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'street').map((row) => row.id), ['street']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'town').map((row) => row.id), ['town']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'ordinary').map((row) => row.id), ['district', 'street', 'town', 'ordinary']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'enforcement').map((row) => row.id), ['enforcement']);
  assert.deepEqual(filterScoreRowsBySegment(rows, positions, 'public-management').map((row) => row.id), ['public-management']);
});
