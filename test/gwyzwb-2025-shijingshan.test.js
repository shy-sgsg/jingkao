import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2025 Shijingshan mirror covers its 59 published codes and preserves secondary-source limits', async () => {
  const data = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const positions = data.positions.filter((row) => row.year === 2025 && row.sources.some((id) => id.startsWith('gwyzwb-2025-shijingshan-')));
  const sourceIds = new Set(data.sources.map((source) => source.sourceId));
  const indexSource = data.sources.find((source) => source.sourceId === 'gwyzwb-2025-shijingshan-index');
  const expectedCodes = [
    '120843901', '220844101', '220844301', '220844302', '220844801',
    '220845001', '220845002', '220845003', '220845004', '220845101', '220845201',
    '220845301', '220845401', '220845601', '220845602', '220845701',
    '230845501', '230845502', '230845503', '230845504', '230845505',
    '230845506', '230845507', '230845508', '230845801', '230845802',
    '230845803', '230845901', '230845902', '230846001', '230846101',
    '230846102', '230846103', '230846201', '230846301', '230846401',
    '230846501', '230846502', '230846503', '230846601', '230846602',
    '230846603', '232502102', '232502103', '242502101', '526011901',
    '625014001', '820844001', '820844201', '820844401', '820844501',
    '820844601', '820844701', '820844901', '820844902', '820845102', '820845202',
    '823105601', '829907701',
  ];

  assert.equal(positions.length, 59);
  assert.deepEqual(positions.map((row) => row.code).sort(), expectedCodes.sort());
  assert.equal(new Set(positions.map((row) => row.code)).size, 59);
  assert.equal(positions.reduce((sum, row) => sum + row.recruitCount, 0), 125);
  assert.ok(positions.every((row) => row.districtId === 'shijingshan'));
  assert.ok(positions.every((row) => row.education && row.majorText));
  assert.ok(positions.every((row) => row.sourceLevel === 'secondary'));
  assert.ok(positions.every((row) => row.crossVerified === false));
  assert.ok(positions.every((row) => row.eligibilityComplete === false));
  assert.ok(positions.every((row) => row.sources.length === 1 && sourceIds.has(row.sources[0])));
  assert.deepEqual(positions.find((row) => row.code === '232502102')?.majorCriteria, {
    undergraduate: ['080901', '080911TK', '080701', '080706'],
    graduate: ['0812', '0839', '0809', '0810'],
  });
  assert.deepEqual(positions.find((row) => row.code === '220845301')?.majorCriteria, {
    graduate: ['02', '03', '12'],
  });
  assert.equal(indexSource?.level, 'secondary');
  assert.equal(indexSource?.reportedPositionCount, 59);
  assert.equal(indexSource?.reportedRecruitCount, 125);
  assert.equal(data.sources.filter((source) => source.sourceId.startsWith('gwyzwb-2025-shijingshan-org-')).length, 33);
});

test('2024 Shijingshan mirror keeps the municipal statistics row unassigned while preserving all 73 listed codes', async () => {
  const data = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const positions = data.positions.filter((row) => row.year === 2024 && row.sources.includes('huatu-2024-shijingshan-list'));
  const huatu = data.sources.find((source) => source.sourceId === 'huatu-2024-shijingshan-list');
  const fenbi = data.sources.find((source) => source.sourceId === 'fenbi-2024-shijingshan-summary');
  const eoffcnApplicants = data.sources.find((source) => source.sourceId === 'eoffcn-2024-application-district-counts');
  const expectedCodes = [
    '120840901', '120840902', '120840903', '120840904', '130839601', '130839602',
    '220839701', '220839801', '220839901', '220839902', '220840101', '220840401',
    '220840501', '220840601', '220840602', '220840603', '220840701', '220840702',
    '220840801', '220840802', '230840703', '230840704', '230840705', '230840706',
    '230840707', '230840708', '230840709', '230840710', '230841101', '230841102',
    '230841201', '230841202', '230841203', '230841301', '230841302', '230841303',
    '230841304', '230841305', '230841401', '230841402', '230841403', '230841501',
    '230841502', '230841503', '230841601', '230841602', '230841701', '230841702',
    '230841801', '230841802', '230841803', '232502402', '242502401', '526010701',
    '526010702', '526010703', '625012701', '625012702', '820841001', '829906801',
    '829906802', '829908105', '830839702', '830839703', '830840001', '830840002',
    '830840102', '830840201', '830840202', '830840203', '830840301', '830840302',
    '830840402',
  ];

  assert.equal(positions.length, 73);
  assert.deepEqual(positions.map((row) => row.code).sort(), expectedCodes.sort());
  assert.equal(new Set(positions.map((row) => row.code)).size, 73);
  assert.equal(positions.reduce((sum, row) => sum + row.recruitCount, 0), 131);
  assert.equal(positions.filter((row) => row.districtId === 'shijingshan').length, 72);
  assert.equal(positions.find((row) => row.code === '829908105')?.districtId, null);
  assert.ok(positions.every((row) => row.education && row.majorText));
  assert.ok(positions.every((row) => row.sourceLevel === 'secondary'));
  assert.ok(positions.every((row) => row.crossVerified === false));
  assert.ok(positions.every((row) => row.eligibilityComplete === false));
  assert.deepEqual(positions.find((row) => row.code === '120840901')?.majorCriteria, {
    graduate: ['0301', '0306', '0351', '0402', '0454'],
  });
  assert.deepEqual(positions.find((row) => row.code === '220840501')?.majorCriteria, {
    graduate: ['01', '02', '03', '05', '12'],
  });
  assert.equal(huatu?.reportedPositionCount, 73);
  assert.equal(huatu?.reportedRecruitCount, 131);
  assert.equal(fenbi?.reportedPositionCount, 73);
  assert.equal(fenbi?.reportedRecruitCount, 131);
  assert.equal(eoffcnApplicants?.reportedRecruitCount, 130);
  assert.equal(eoffcnApplicants?.reportedPositionCount, undefined);
});
