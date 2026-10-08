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
    { high: 25, ambiguous: 6, unmatched: 0 },
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
