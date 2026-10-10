import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scoreRows = JSON.parse(readFileSync(new URL('../data/score_rows_seed.json', import.meta.url), 'utf8'));
const positions = JSON.parse(readFileSync(new URL('../data/positions_seed.json', import.meta.url), 'utf8'));

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
    { high: 98, ambiguous: 17, unmatched: 5 },
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
    { high: 98, ambiguous: 17, unmatched: 5 },
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
