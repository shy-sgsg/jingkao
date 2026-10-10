import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scoreRows = JSON.parse(readFileSync(new URL('../data/score_rows_seed.json', import.meta.url), 'utf8'));
const positions = JSON.parse(readFileSync(new URL('../data/positions_seed.json', import.meta.url), 'utf8'));
const sourceRegistry = JSON.parse(readFileSync(new URL('../data/source_registry.json', import.meta.url), 'utf8'));

test('2026 cutoff rows link only to a unique exact year, unit, and title match', () => {
  const expectedCodes = {
    '2026-cgzj-02': '221262201',
    '2026-cgzj-03': '821263001',
    '2026-cgzj-05': '231264802',
    '2026-cgzj-10': '121260901',
    '2026-cgzj-11': '821263101',
    '2026-cgzj-12': '821261401',
    '2026-cgzj-13': '221262601',
    '2026-cgzj-18': '821261502',
    '2026-cgzj-24': '231263301',
    '2026-cgzj-25': '231263901',
    '2026-cgzj-26': '241264902',
    '2026-cgzj-27': '221262401',
    '2026-cgzj-28': '221262301',
    '2026-cgzj-29': '241264201',
    '2026-cgzj-31': '221262101',
  };

  for (const [id, code] of Object.entries(expectedCodes)) {
    const row = scoreRows.find((item) => item.id === id);
    const exactMatches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(exactMatches.length, 1, `${id} must have exactly one source-backed position match`);
    assert.equal(exactMatches[0].code, code, `${id} must map to its exact position code`);
    assert.equal(row.positionCode, code, `${id} must expose the unique position code`);
    assert.equal(row.mappingConfidence, 'high', `${id} must be marked as a high-confidence mapping`);
  }

  for (const row of scoreRows.filter((item) => item.mappingConfidence === 'high')) {
    const exactMatches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(exactMatches.length, 1, `${row.id} must remain a unique exact match`);
    assert.equal(exactMatches[0].code, row.positionCode, `${row.id} must link to that exact match`);
  }

  assert.deepEqual(
    scoreRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
      high: 0, ambiguous: 0, unmatched: 0,
    }),
    { high: 171, ambiguous: 23, unmatched: 51 },
  );
});

test('2026 Haidian and Xicheng partial interview-cutoff tables link only unique local positions', () => {
  const expectedRows = {
    '2026-cgzj-haidian-01': '120633001',
    '2026-cgzj-haidian-24': '230636801',
    '2026-cgzj-xicheng-01': '820223701',
    '2026-cgzj-xicheng-27': '230224001',
  };

  for (const [id, code] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(matches.length, 1, `${id} must match one exact same-year position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.mappingConfidence, 'high');
  }

  for (const id of ['2026-cgzj-haidian-13', '2026-cgzj-haidian-25', '2026-cgzj-xicheng-08', '2026-cgzj-xicheng-17']) {
    const row = scoreRows.find((item) => item.id === id);
    assert.equal(row.positionCode, null, `${id} must not choose between duplicate same-name jobs`);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }

  const unmatched = scoreRows.find((item) => item.id === '2026-cgzj-xicheng-28');
  assert.equal(unmatched.positionCode, null);
  assert.equal(unmatched.mappingConfidence, 'unmatched');
});

test('2026 Yanqing partial interview-cutoff rows preserve unique matches and unresolved names', () => {
  const expectedCodes = {
    '2026-cgzj-yanqing-01': '526013403',
    '2026-cgzj-yanqing-02': '221778902',
    '2026-cgzj-yanqing-03': '221779002',
    '2026-cgzj-yanqing-04': '821778702',
    '2026-cgzj-yanqing-05': '221779701',
    '2026-cgzj-yanqing-06': '221778301',
    '2026-cgzj-yanqing-07': '121780001',
    '2026-cgzj-yanqing-09': '241780801',
    '2026-cgzj-yanqing-10': '821779401',
    '2026-cgzj-yanqing-11': '221779001',
    '2026-cgzj-yanqing-12': '221779202',
    '2026-cgzj-yanqing-13': '821779901',
    '2026-cgzj-yanqing-14': '221779201',
    '2026-cgzj-yanqing-15': '821778101',
    '2026-cgzj-yanqing-17': '241779503',
    '2026-cgzj-yanqing-18': '821779103',
    '2026-cgzj-yanqing-19': '241780602',
    '2026-cgzj-yanqing-20': '241779502',
    '2026-cgzj-yanqing-21': '241780201',
    '2026-cgzj-yanqing-22': '821778901',
    '2026-cgzj-yanqing-26': '821778701',
  };

  for (const [id, code] of Object.entries(expectedCodes)) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(matches.length, 1, `${id} must match one exact same-year position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.mappingConfidence, 'high');
  }

  for (const id of ['2026-cgzj-yanqing-23', '2026-cgzj-yanqing-27', '2026-cgzj-yanqing-28']) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.ok(matches.length > 1, `${id} must preserve a duplicate same-name position set`);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }

  for (const id of ['2026-cgzj-yanqing-08', '2026-cgzj-yanqing-16', '2026-cgzj-yanqing-24', '2026-cgzj-yanqing-25']) {
    const row = scoreRows.find((item) => item.id === id);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'unmatched');
  }

  assert.deepEqual(
    scoreRows.reduce((counts, row) => ({ ...counts, [row.mappingConfidence]: counts[row.mappingConfidence] + 1 }), {
      high: 0, ambiguous: 0, unmatched: 0,
    }),
    { high: 171, ambiguous: 23, unmatched: 51 },
  );
});

test('same-name multi-position rows stay ambiguous while source-backed matches use the exact code', () => {
  const ambiguousIds = [
    '2026-cgzj-01', '2026-cgzj-06', '2026-cgzj-09',
    '2026-cgzj-14', '2026-cgzj-20', '2026-cgzj-22',
  ];

  for (const id of ambiguousIds) {
    const row = scoreRows.find((item) => item.id === id);
    const exactMatches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.ok(exactMatches.length > 1, `${id} must retain its ambiguous exact match set`);
    assert.equal(row.positionCode, null, `${id} must not be assigned an arbitrary position code`);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }

  const resolvedRow = scoreRows.find((item) => item.id === '2026-cgzj-18');
  const resolvedMatches = positions.filter((position) => position.year === resolvedRow.year
    && position.unit === resolvedRow.unit
    && position.title === resolvedRow.title);

  assert.equal(resolvedMatches.length, 1);
  assert.equal(resolvedMatches[0].code, '821261502');
  assert.equal(resolvedRow.positionCode, '821261502');
  assert.equal(resolvedRow.mappingConfidence, 'high');
});

test('2026 Fangshan cutoff sample links only unique exact position rows', () => {
  const expectedCodes = {
    '2026-cgzj-fangshan-01': ['121049302', 136.25],
    '2026-cgzj-fangshan-02': ['221049601', 126],
    '2026-cgzj-fangshan-05': ['231051502', 102.5],
    '2026-cgzj-fangshan-08': ['241051901', 100.75],
  };

  for (const [id, [code, score]] of Object.entries(expectedCodes)) {
    const row = scoreRows.find((item) => item.id === id);
    const exactMatches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(exactMatches.length, 1, `${id} must have exactly one same-year position match`);
    assert.equal(exactMatches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, 'cgzj-2026-fangshan-cutoff-sample');
  }

  for (const id of [
    '2026-cgzj-fangshan-03', '2026-cgzj-fangshan-04',
    '2026-cgzj-fangshan-06', '2026-cgzj-fangshan-07',
  ]) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit
      && position.title === row.title);

    assert.ok(matches.length > 1, `${id} must retain its duplicate-name candidates`);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }
});

test('2026 Tongzhou fiscal cutoff scores map to unique same-year unit and title matches', () => {
  const expectedRows = {
    '2026-cgzj-tongzhou-01': ['821153902', 142, '绩效考评岗'],
    '2026-cgzj-tongzhou-02': ['221153901', 132.5, '财务管理岗'],
  };

  for (const [id, [code, score, title]] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    const exactMatches = positions.filter((position) => position.year === 2026
      && position.unit === '北京市通州区财政局'
      && position.title === title);

    assert.equal(exactMatches.length, 1, `${id} must match exactly one 2026 Tongzhou position`);
    assert.equal(exactMatches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, 'cgzj-2026-tongzhou-fiscal-cutoff-sample');
  }
});

test('2026 Chaoyang cutoff sample rows map only to their exact same-year job identities', () => {
  const expectedRows = {
    '2026-cgzj-chaoyang-01': ['230531801', '北京市朝阳区东坝地区（乡）', '平安建设岗', 133.5],
    '2026-cgzj-chaoyang-02': ['232502003', '北京市公安局朝阳分局', '一线执法岗1', 56.35],
  };

  for (const [id, [code, unit, title, score]] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === unit && position.title === title);

    assert.equal(matches.length, 1, `${id} must have one exact same-year job match`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, 'cgzj-2026-chaoyang-cutoff-sample');
  }
});

test('2026 Huairou partial cutoff sample preserves only exact, unique position links', () => {
  const huairouRows = scoreRows.filter((row) => row.sourceId === 'cgzj-2026-huairou-cutoff-sample');
  assert.equal(huairouRows.length, 25);

  const expectedCodes = {
    '2026-cgzj-huairou-01': ['821673201', 129.75],
    '2026-cgzj-huairou-02': ['821673702', 128.25],
    '2026-cgzj-huairou-03': ['821672101', 128],
    '2026-cgzj-huairou-04': ['821672902', 126.75],
    '2026-cgzj-huairou-05': ['241672501', 126.25],
    '2026-cgzj-huairou-06': ['221672601', 124.75],
    '2026-cgzj-huairou-07': ['821672702', 124],
    '2026-cgzj-huairou-08': ['221673001', 123.75],
    '2026-cgzj-huairou-10': ['221673301', 122.75],
    '2026-cgzj-huairou-11': ['241673801', 122.5],
    '2026-cgzj-huairou-12': ['121672001', 121.25],
    '2026-cgzj-huairou-13': ['221672505', 121.25],
    '2026-cgzj-huairou-14': ['821673701', 121],
    '2026-cgzj-huairou-15': ['221672802', 120.25],
    '2026-cgzj-huairou-16': ['221672201', 117.5],
    '2026-cgzj-huairou-17': ['221673401', 113.5],
    '2026-cgzj-huairou-18': ['241672504', 112],
    '2026-cgzj-huairou-19': ['221673601', 112],
    '2026-cgzj-huairou-20': ['241673802', 109],
    '2026-cgzj-huairou-21': ['241674001', 108.5],
    '2026-cgzj-huairou-22': ['221672801', 106.75],
    '2026-cgzj-huairou-24': ['221673501', 106.5],
    '2026-cgzj-huairou-25': ['241674101', 95.25],
  };

  for (const [id, [code, score]] of Object.entries(expectedCodes)) {
    const row = huairouRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === row.unit
      && position.title === row.title);

    assert.equal(matches.length, 1, `${id} must match one exact 2026 Huairou position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
  }

  for (const id of ['2026-cgzj-huairou-09', '2026-cgzj-huairou-23']) {
    const row = huairouRows.find((item) => item.id === id);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'unmatched');
  }

  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2026-huairou-cutoff-sample');
  assert.equal(source.url, 'https://www.cgzj.com/sk/12637.html');
  assert.equal(source.samplePositions, 25);
  assert.equal(source.minimum, 95.25);
  assert.equal(source.maximum, 129.75);
});

test('2026 Daxing partial cutoff rows map only unique same-year unit and title matches', () => {
  const expectedRows = {
    '2026-cgzj-daxing-01': ['821565801', '北京市大兴区水务局', '财务岗', 136.25],
    '2026-cgzj-daxing-03': ['821565301', '北京市大兴区人力资源和社会保障局', '信息化建设岗', 131.75],
    '2026-cgzj-daxing-20': ['231566901', '北京市大兴区黄村镇', '经济管理岗', 126.25],
    '2026-cgzj-daxing-21': ['821565304', '北京市大兴区人力资源和社会保障局', '案件审理岗', 126],
    '2026-cgzj-daxing-26': ['121566703', '中共北京市大兴区纪律检查委员会、北京市大兴区监察委员会', '纪检监察岗3', 125.25],
  };

  for (const [id, [code, unit, title, score]] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === unit && position.title === title);

    assert.equal(matches.length, 1, `${id} must match one exact same-year Daxing position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, 'cgzj-2026-daxing-cutoff-sample');
  }

  for (const id of ['2026-cgzj-daxing-13', '2026-cgzj-daxing-25']) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === row.unit && position.title === row.title);
    assert.equal(matches.length, 2, `${id} must retain both same-name Education Commission positions`);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }
});

test('2026 Shijingshan cutoff rows retain the source unit and map only unique same-year position identities', () => {
  const sourceId = 'cgzj-2026-shijingshan-cutoff-sample';
  const rows = scoreRows.filter((item) => item.sourceId === sourceId);
  assert.equal(rows.length, 27);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'high').length, 26);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'ambiguous').length, 1);
  assert.equal(rows.filter((item) => item.mappingConfidence === 'unmatched').length, 0);

  for (const row of rows.filter((item) => item.mappingConfidence === 'high')) {
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit && position.title === row.title);
    assert.equal(matches.length, 1, `${row.id} maps to exactly one candidate position`);
    assert.equal(row.positionCode, matches[0].code);
    assert.ok(row.sourceUnit, `${row.id} retains the unit label visible in the source`);
  }

  const ambiguous = rows.find((row) => row.id === '2026-cgzj-shijingshan-27');
  const candidates = positions.filter((position) => position.year === ambiguous.year
    && position.unit === ambiguous.unit && position.title === ambiguous.title);
  assert.equal(candidates.length, 2);
  assert.equal(ambiguous.positionCode, null);
  assert.equal(ambiguous.mappingConfidence, 'ambiguous');
});

test('2026 Fengtai cutoff sample links only the visible exact police job and leaves unresolved rows unassigned', () => {
  const rows = scoreRows.filter((item) => item.sourceId === 'cgzj-2026-fengtai-cutoff-sample');
  assert.equal(rows.length, 9);
  const linked = rows.filter((row) => row.mappingConfidence === 'high');
  assert.equal(linked.length, 1);
  assert.equal(linked[0].id, '2026-cgzj-fengtai-09');
  assert.equal(linked[0].positionCode, '232502201');
  assert.equal(linked[0].score, 52.15);
  assert.equal(linked[0].unit, '北京市公安局丰台分局');
  assert.equal(linked[0].title, '一线执法岗1');
  assert.ok(rows.filter((row) => row.mappingConfidence === 'unmatched')
    .every((row) => row.positionCode === null));
  assert.equal(rows.filter((row) => row.mappingConfidence === 'unmatched').length, 8);
});
