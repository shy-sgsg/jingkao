import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scoreRows = JSON.parse(readFileSync(new URL('../data/score_rows_seed.json', import.meta.url), 'utf8'));
const positions = JSON.parse(readFileSync(new URL('../data/positions_seed.json', import.meta.url), 'utf8'));
const sourceRegistry = JSON.parse(readFileSync(new URL('../data/source_registry.json', import.meta.url), 'utf8'));

test('2026 Miyun cutoff rows link only the uniquely identified post and preserve the same-name ambiguity', () => {
  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2026-miyun-cutoff-sample');
  assert.ok(source, 'Miyun cutoff evidence should retain its source record');
  assert.equal(source.url, 'https://www.cgzj.com/sk/12627.html');

  const linked = scoreRows.find((item) => item.id === '2026-cgzj-miyun-01');
  const linkedMatches = positions.filter((position) => position.year === linked.year
    && position.unit === linked.unit && position.title === linked.title);
  assert.equal(linkedMatches.length, 1);
  assert.equal(linkedMatches[0].code, '221874901');
  assert.equal(linked.positionCode, '221874901');
  assert.equal(linked.score, 140.25);
  assert.equal(linked.mappingConfidence, 'high');
  assert.equal(linked.sourceId, source.sourceId);

  const ambiguous = scoreRows.find((item) => item.id === '2026-cgzj-miyun-02');
  const ambiguousMatches = positions.filter((position) => position.year === ambiguous.year
    && position.unit === ambiguous.unit && position.title === ambiguous.title);
  assert.deepEqual(ambiguousMatches.map((position) => position.code).sort(), ['241877201', '241877202']);
  assert.equal(ambiguous.positionCode, null);
  assert.equal(ambiguous.score, 95);
  assert.equal(ambiguous.mappingConfidence, 'ambiguous');
  assert.equal(ambiguous.sourceId, source.sourceId);
});

test('2025 Tongzhou police cutoff links to the uniquely matching 2025 position, not its 2026 counterpart', () => {
  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2025-tongzhou-cutoff-year-conflict');
  assert.ok(source, 'Tongzhou cutoff reference should retain its year-conflict note');
  assert.equal(source.year, 2025);
  assert.equal(source.url, 'https://www.cgzj.com/sk/4237.html');

  const row = scoreRows.find((item) => item.id === '2025-cgzj-tongzhou-police-01');
  const exactMatches = positions.filter((position) => position.year === 2025
    && position.unit === row.unit && position.title === row.title);

  assert.equal(exactMatches.length, 1);
  assert.equal(exactMatches[0].code, '232502401');
  assert.equal(row.positionCode, '232502401');
  assert.equal(row.score, 54.5);
  assert.equal(row.mappingConfidence, 'high');
  assert.equal(row.sourceId, source.sourceId);
  assert.match(source.notes, /正文.*2026/);
  assert.match(source.notes, /标题.*2025/);
  assert.equal(scoreRows.some((item) => item.year === 2026 && item.score === 54.5
    && item.unit === '北京市公安局通州分局'), false);
});

test('2025 Fengtai police cutoff links to the unique same-unit post and records the source title normalization', () => {
  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2025-fengtai-minimum-year-conflict');
  assert.ok(source, 'Fengtai cutoff article should retain its year-conflict and title-normalization note');
  assert.equal(source.year, 2025);
  assert.equal(source.url, 'https://www.cgzj.com/examinfo/4086.cshtml');
  assert.match(source.notes, /2026.*2025/);
  assert.match(source.notes, /一线执法岗.*一线执法岗1/);

  const row = scoreRows.find((item) => item.id === '2025-cgzj-fengtai-minimum-01');
  const matches = positions.filter((position) => position.year === 2025
    && position.unit === row.unit && position.code === row.positionCode);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].code, '232502002');
  assert.equal(matches[0].title, '一线执法岗1');
  assert.equal(matches[0].recruitCount, 52);
  assert.equal(row.score, 54.7);
  assert.equal(row.mappingConfidence, 'high');
  assert.equal(row.sourceId, source.sourceId);
});

test('2025 district minimum cutoff samples map only to unique same-year positions', () => {
  const expectedRows = {
    '2025-cgzj-changping-minimum-01': ['cgzj-2025-cutoff-year-conflict', '221264501', 105],
    '2025-cgzj-fangshan-minimum-01': ['cgzj-2025-fangshan-minimum-year-conflict', '241053002', 97.75],
    '2025-cgzj-haidian-minimum-01': ['cgzj-2025-haidian-minimum-year-conflict', '230638901', 102.25],
    '2025-cgzj-chaoyang-minimum-01': ['cgzj-2025-chaoyang-minimum-year-conflict', '230531301', 104.25],
    '2025-cgzj-shijingshan-minimum-01': ['cgzj-2025-shijingshan-minimum-year-conflict', '242502101', 53.75],
    '2025-cgzj-shunyi-minimum-01': ['cgzj-2025-shunyi-minimum-year-conflict', '231462301', 111],
    '2025-cgzj-pinggu-minimum-01': ['cgzj-2025-pinggu-minimum-year-conflict', '221372401', 108.75],
    '2025-cgzj-xicheng-minimum-01': ['cgzj-2025-xicheng-minimum-year-conflict', '232501702', 56.7],
  };

  for (const [id, [sourceId, code, score]] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    const source = sourceRegistry.find((item) => item.sourceId === sourceId);
    const matches = positions.filter((position) => position.year === 2025
      && position.unit === row.unit && position.title === row.title);

    assert.equal(source?.year, 2025, `${sourceId} must retain its resolved historical year`);
    assert.match(source?.notes, /正文.*2026/);
    assert.match(source?.notes, /标题.*2025/);
    assert.equal(matches.length, 1, `${id} must match one unique same-year position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, sourceId);
  }
});

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
    { high: 320, ambiguous: 55, unmatched: 15 },
  );
});

test('2026 Chaoyang cutoff sample preserves every publicly visible post score as a position-level row', () => {
  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2026-chaoyang-cutoff-sample');
  const rows = scoreRows.filter((item) => item.sourceId === source?.sourceId);
  const expected = [
    ['北京市朝阳区人力资源和社会保障局', '综合文稿岗', 141.5],
    ['北京市朝阳区文化和旅游局（北京市朝阳区文物局）', '综合管理岗', 141],
    ['中共北京市朝阳区委统一战线工作部', '综合管理岗', 139.25],
    ['中共北京市朝阳区委北京市朝阳区人民政府研究室', '综合管理岗', 139],
    ['北京市朝阳区政协', '综合管理岗', 138.5],
    ['北京市朝阳区八里庄街道', '综合管理岗', 138],
    ['中共北京市朝阳区委教育工作委员会、北京市朝阳区教育委员会', '教师队伍建设岗', 136],
    ['北京市朝阳区审计局', '审计岗1', 134.75],
    ['北京市朝阳区东坝地区（乡）', '平安建设岗', 133.5],
    ['北京市朝阳区奥运村街道', '综合管理岗', 133],
    ['北京市朝阳区人民法院', '司法警察岗', 132.25],
    ['北京市朝阳区人民检察院', '检察业务岗', 132.25],
    ['北京市朝阳区妇女联合会', '组织建设岗', 132],
    ['北京市朝阳区双井街道', '民生保障岗', 132],
    ['北京市朝阳区体育局', '综合管理岗', 131.75],
    ['北京市朝阳区亚运村街道', '财务管理岗', 131.75],
    ['北京市朝阳区小关街道', '综合管理岗', 131.75],
    ['北京市朝阳区农业综合执法大队', '财务会计岗', 131.5],
    ['北京市朝阳区数据局', '数字科技岗', 131.25],
    ['北京市朝阳区民政局', '综合管理岗', 131.25],
    ['北京市朝阳区园林绿化局', '绿化建设管理岗', 130.5],
    ['北京市朝阳区发展和改革委员会', '综合管理岗', 130.25],
    ['北京市朝阳区水务局', '工程管理岗', 130],
    ['北京市朝阳区人民政府国有资产监督管理委员会', '国资业务管理岗', 130],
    ['北京市朝阳区十八里店地区（乡）', '行政执法岗', 130],
    ['北京市公安局朝阳分局', '专业岗1', 57.55],
    ['北京市公安局朝阳分局', '一线执法岗1', 56.35],
    ['北京市公安局朝阳分局', '网络技术岗', 55.5],
  ];

  assert.equal(source?.samplePositions, 28);
  assert.equal(source?.sampleRecruits, 163);
  assert.equal(rows.length, expected.length, 'all visible scores should be retained, not just rows already linkable');
  assert.deepEqual(rows.map((item) => [item.unit, item.title, item.score]), expected);

  const expectedCodes = {
    '2026-cgzj-chaoyang-01': '820526204',
    '2026-cgzj-chaoyang-02': '220526701',
    '2026-cgzj-chaoyang-03': '120525401',
    '2026-cgzj-chaoyang-04': '120525501',
    '2026-cgzj-chaoyang-05': '420528602',
    '2026-cgzj-chaoyang-06': '230528901',
    '2026-cgzj-chaoyang-07': '220526004',
    '2026-cgzj-chaoyang-08': '220526901',
    '2026-cgzj-chaoyang-09': '230531801',
    '2026-cgzj-chaoyang-10': '230531001',
    '2026-cgzj-chaoyang-13': '820528701',
    '2026-cgzj-chaoyang-14': '230529201',
    '2026-cgzj-chaoyang-15': '220527102',
    '2026-cgzj-chaoyang-16': '230530301',
    '2026-cgzj-chaoyang-17': '230530402',
    '2026-cgzj-chaoyang-18': '220528503',
    '2026-cgzj-chaoyang-19': '220527401',
    '2026-cgzj-chaoyang-20': '220528401',
    '2026-cgzj-chaoyang-21': '220527201',
    '2026-cgzj-chaoyang-23': '220526601',
    '2026-cgzj-chaoyang-24': '220527001',
    '2026-cgzj-chaoyang-25': '230531502',
    '2026-cgzj-chaoyang-26': '232502005',
    '2026-cgzj-chaoyang-27': '232502003',
    '2026-cgzj-chaoyang-28': '232502002',
  };
  for (const [id, code] of Object.entries(expectedCodes)) {
    const row = rows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === row.unit && position.title === row.title);
    assert.equal(matches.length, 1, `${id} should match one exact same-year position`);
    assert.equal(matches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.mappingConfidence, 'high');
  }
  for (const id of ['2026-cgzj-chaoyang-11', '2026-cgzj-chaoyang-12', '2026-cgzj-chaoyang-22']) {
    const row = rows.find((item) => item.id === id);
    assert.equal(row.positionCode, null, `${id} must not choose between duplicate same-name posts`);
    assert.equal(row.mappingConfidence, 'ambiguous');
  }
});

test('2026 street cutoff sample includes six newly covered exact unique position links', () => {
  const expectedRows = {
    '2026-cgzj-street-01': ['230637402', '北京市海淀区西三旗街道>内设部门', '城市管理岗', 138.25],
    '2026-cgzj-street-02': ['230637602', '北京市海淀区中关村街道>综合行政执法队', '综合执法岗2', 133],
    '2026-cgzj-street-03': ['230637701', '北京市海淀区清河街道>综合行政执法队', '综合执法岗1', 129.75],
    '2026-cgzj-street-04': ['230637703', '北京市海淀区清河街道>综合行政执法队', '综合执法岗', 104.25],
    '2026-cgzj-street-05': ['230638302', '北京市海淀区永定路街道>综合行政执法队', '综合执法岗2', 101.5],
    '2026-cgzj-mentougou-daitai-01': ['240948402', '北京市门头沟区大台街道', '司法岗', 102.75],
  };

  const source = sourceRegistry.find((item) => item.sourceId === 'cgzj-2026-street-cutoff-sample');
  assert.equal(source?.url, 'https://www.cgzj.com/sk/12695.html');
  assert.equal(source?.samplePositions, 6);
  assert.equal(source?.intervieweeCount, 262);
  assert.match(source?.notes, /29条岗位分数/);

  for (const [id, [code, unit, title, score]] of Object.entries(expectedRows)) {
    const row = scoreRows.find((item) => item.id === id);
    assert.ok(row, `${id} should be added from the visible partial street table`);
    const exactMatches = positions.filter((position) => position.year === 2026
      && position.unit === unit && position.title === title);

    assert.equal(exactMatches.length, 1, `${id} must match one exact same-year position`);
    assert.equal(exactMatches[0].code, code);
    assert.equal(row.positionCode, code);
    assert.equal(row.score, score);
    assert.equal(row.mappingConfidence, 'high');
    assert.equal(row.sourceId, source.sourceId);
  }
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

  const westCityEnforcement = scoreRows.find((item) => item.id === '2026-cgzj-xicheng-28');
  const exactMatches = positions.filter((position) => position.year === westCityEnforcement.year
    && position.unit === westCityEnforcement.unit
    && position.title === westCityEnforcement.title);
  assert.equal(exactMatches.length, 1);
  assert.equal(exactMatches[0].code, '230225202');
  assert.equal(westCityEnforcement.positionCode, '230225202');
  assert.equal(westCityEnforcement.mappingConfidence, 'high');
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
    { high: 320, ambiguous: 55, unmatched: 15 },
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
    '2026-cgzj-fangshan-10': ['221050202', 133.5],
    '2026-cgzj-fangshan-12': ['821049501', 130.75],
    '2026-cgzj-fangshan-14': ['221050003', 129.5],
    '2026-cgzj-fangshan-18': ['821049401', 127.75],
    '2026-cgzj-fangshan-19': ['221049801', 127.75],
    '2026-cgzj-fangshan-21': ['221050102', 127.5],
    '2026-cgzj-fangshan-23': ['241052101', 126.75],
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
    '2026-cgzj-fangshan-09', '2026-cgzj-fangshan-11',
    '2026-cgzj-fangshan-13', '2026-cgzj-fangshan-15',
    '2026-cgzj-fangshan-16', '2026-cgzj-fangshan-17',
    '2026-cgzj-fangshan-20', '2026-cgzj-fangshan-22',
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

test('2026 citywide fiscal cutoff sample links six unique positions including four newly uncovered scores', () => {
  const expectedRows = {
    '2026-cgzj-fiscal-01': ['220633903', '北京市海淀区财政局>内设科室', '预算管理岗', 133.25],
    '2026-cgzj-fiscal-02': ['821672102', '北京市怀柔区财政局', '财政预算管理岗', 116.75],
    '2026-cgzj-fiscal-03': ['821261402', '北京市昌平区财政局', '财务管理岗', 116.25],
    '2026-cgzj-fiscal-04': ['820221703', '北京市西城区财政局', '预算管理岗', 112.75],
  };
  const sourceId = 'cgzj-2026-tongzhou-fiscal-cutoff-sample';
  const source = sourceRegistry.find((item) => item.sourceId === sourceId);
  const sourceRows = scoreRows.filter((item) => item.sourceId === sourceId);

  assert.equal(source?.url, 'https://www.cgzj.com/sk/12691.html');
  assert.equal(source?.samplePositions, 6);
  assert.equal(sourceRows.length, 6);
  for (const [id, [code, unit, title, score]] of Object.entries(expectedRows)) {
    const row = sourceRows.find((item) => item.id === id);
    const exactMatches = positions.filter((position) => position.year === 2026
      && position.unit === unit && position.title === title);

    assert.equal(exactMatches.length, 1, `${id} must map to one exact same-year position`);
    assert.equal(exactMatches[0].code, code);
    assert.equal(row?.positionCode, code);
    assert.equal(row?.score, score);
    assert.equal(row?.mappingConfidence, 'high');
  }
});

test('2026 Chaoyang cutoff sample rows map only to their exact same-year job identities', () => {
  const expectedRows = {
    '2026-cgzj-chaoyang-09': ['230531801', '北京市朝阳区东坝地区（乡）', '平安建设岗', 133.5],
    '2026-cgzj-chaoyang-27': ['232502003', '北京市公安局朝阳分局', '一线执法岗1', 56.35],
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
    '2026-cgzj-daxing-22': ['221566401', '北京市大兴区政务服务和数据管理局', '信息化管理岗', 126],
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

  for (const id of ['2026-cgzj-daxing-02', '2026-cgzj-daxing-05']) {
    const row = scoreRows.find((item) => item.id === id);
    const matches = positions.filter((position) => position.year === 2026
      && position.unit === row.unit && position.title === row.title);
    assert.deepEqual(matches.map((position) => position.code).sort(), ['821566201', '821566202']);
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

test('2026 Fengtai cutoff sample links all unique exact same-year position identities', () => {
  const rows = scoreRows.filter((item) => item.sourceId === 'cgzj-2026-fengtai-cutoff-sample');
  assert.equal(rows.length, 9);
  const expectedCodes = {
    '2026-cgzj-fengtai-01': '823105805',
    '2026-cgzj-fengtai-02': '823105802',
    '2026-cgzj-fengtai-03': '823105803',
    '2026-cgzj-fengtai-04': '823105801',
    '2026-cgzj-fengtai-05': '223105804',
    '2026-cgzj-fengtai-06': '829908201',
    '2026-cgzj-fengtai-07': '232502204',
    '2026-cgzj-fengtai-08': '232502203',
    '2026-cgzj-fengtai-09': '232502201',
  };

  for (const row of rows) {
    const matches = positions.filter((position) => position.year === row.year
      && position.unit === row.unit && position.title === row.title);
    assert.equal(matches.length, 1, `${row.id} should match one exact same-year position`);
    assert.equal(matches[0].code, expectedCodes[row.id]);
    assert.equal(row.positionCode, expectedCodes[row.id]);
    assert.equal(row.mappingConfidence, 'high');
  }
});
