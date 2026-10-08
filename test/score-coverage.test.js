import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizePositionCoverage } from '../src/data/coverage.js';

test('all visible 2026 Changping interview cutoffs are available as source-backed rows', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const rows = data.scoreRows.filter((row) => row.year === 2026);
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
  const sample = data.scoreSamples.find((item) => item.year === 2026);

  assert.equal(sample.samplePositions, rows.length);
  assert.equal(sample.minimum, Math.min(...rows.map((row) => row.score)));
  assert.equal(sample.maximum, Math.max(...rows.map((row) => row.score)));
  assert.equal(summarizePositionCoverage(data).find((row) => row.year === 2026).namedScoreExamples, rows.length);
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
