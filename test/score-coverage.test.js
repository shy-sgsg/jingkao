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

  assert.equal(samples.length, 5);
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
