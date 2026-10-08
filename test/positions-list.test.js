import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyPublicManagementMatch, filterAndSortPositions, getPositionFilterValue, getPublicManagementMajorTypes, paginateItems, summarizePublicManagementPositions } from '../src/data/positions.js';

const positions = [
  { year: 2024, code: '24A', unit: '街道办', title: '综合岗', orgType: '街道', jobType: '综合管理', recruitCount: 2, majorText: '公共管理（1204）' },
  { year: 2026, code: '26B', unit: '镇政府', title: '执法岗', orgType: '镇', jobType: '行政执法', recruitCount: 3, majorText: '法学（0301）' },
  { year: 2025, code: '25C', unit: '区人社局', title: '综合岗', orgType: '区直', jobType: '综合管理', recruitCount: 1, majorText: '公共管理（1204）' },
];

test('position list filters text, year, organization type, and job type before sorting', () => {
  const filtered = filterAndSortPositions(positions, {
    year: '2025',
    orgType: '区直',
    jobType: '综合管理',
    query: '1204',
    sortBy: 'year-desc',
  });
  assert.deepEqual(filtered.map((position) => position.code), ['25C']);
});

test('advanced position filters combine explicit unit, education, qualification, test, and recruit conditions', () => {
  const rows = [
    {
      code: 'matched', unit: '昌平区水务局', education: '硕士研究生及以上', recruitCount: 2,
      requirements: { politicalStatus: '中共党员', graduationStatus: '应届毕业生' },
      physicalTest: true, professionalTest: false,
    },
    {
      code: 'different', unit: '昌平区街道办', education: '本科及以上', recruitCount: 1,
      requirements: { politicalStatus: '不限', graduationStatus: '不限' },
      physicalTest: false, professionalTest: true,
    },
    { code: 'unknown', unit: '昌平区其他单位', education: null, recruitCount: null },
  ];

  const filtered = filterAndSortPositions(rows, {
    unit: '昌平区水务局',
    education: '硕士研究生及以上',
    politicalStatus: '中共党员',
    freshGraduate: '应届毕业生',
    physicalTest: '需要',
    professionalTest: '不需要',
    recruitmentGroup: 'two-or-more',
  });

  assert.deepEqual(filtered.map((position) => position.code), ['matched']);
});

test('advanced position filters can isolate unreported conditions without treating them as no requirement', () => {
  const rows = [
    { code: 'known', unit: '单位甲', education: '本科及以上', recruitCount: 1, requirements: { politicalStatus: '不限', graduationStatus: '不限' }, physicalTest: false, professionalTest: false },
    { code: 'unknown', unit: '单位乙', education: null, recruitCount: null },
  ];

  const filtered = filterAndSortPositions(rows, {
    education: '__missing',
    politicalStatus: '__missing',
    freshGraduate: '__missing',
    physicalTest: '__missing',
    professionalTest: '__missing',
    recruitmentGroup: 'missing',
  });

  assert.deepEqual(filtered.map((position) => position.code), ['unknown']);
});

test('graduation-year restrictions appear in the advanced filter instead of being hidden as unknown', () => {
  assert.equal(getPositionFilterValue({ requirements: { graduationYear: ['2025'] } }, 'freshGraduate'), '应届毕业生（2025）');
  assert.equal(getPositionFilterValue({ newGraduateYear: 2026 }, 'freshGraduate'), '应届毕业生（2026）');
  assert.equal(getPositionFilterValue({ requirements: { graduationStatus: '应届毕业生' } }, 'freshGraduate'), '应届毕业生');
});

test('position sort options keep missing recruit counts last and do not mutate source rows', () => {
  const rows = [{ code: 'missing', recruitCount: null }, { code: 'two', recruitCount: 2 }, { code: 'one', recruitCount: 1 }];
  const sorted = filterAndSortPositions(rows, { sortBy: 'recruit-desc' });
  assert.deepEqual(sorted.map((position) => position.code), ['two', 'one', 'missing']);
  assert.deepEqual(rows.map((position) => position.code), ['missing', 'two', 'one']);
});

test('position pagination clamps page numbers and reports the visible range', () => {
  const rows = Array.from({ length: 62 }, (_, index) => index + 1);
  const second = paginateItems(rows, 2, 25);
  assert.deepEqual({ page: second.page, pageSize: second.pageSize, total: second.total, totalPages: second.totalPages, start: second.start, end: second.end }, {
    page: 2, pageSize: 25, total: 62, totalPages: 3, start: 26, end: 50,
  });
  assert.deepEqual(second.items, rows.slice(25, 50));
  const clamped = paginateItems(rows, 99, 25);
  assert.equal(clamped.page, 3);
  assert.equal(clamped.items.length, 12);
  assert.equal(paginateItems([], 5, 25).totalPages, 0);
});

test('public-management topic uses explicit 1204/1252 degree codes and keeps unrestricted jobs separate', () => {
  const topicRows = [
    { year: 2024, code: 'bachelor', unit: '区直', orgType: '区直', recruitCount: 1, majorText: '本科：公共管理类（1204）' },
    { year: 2024, code: 'graduate', unit: '街道', orgType: '街道', recruitCount: 2, majorText: '研究生：公共管理学（1204），公共管理（1252）' },
    { year: 2025, code: 'open', unit: '镇', orgType: '镇', recruitCount: 1, majorText: '不限' },
    { year: 2026, code: 'other', unit: '区直', orgType: '区直', recruitCount: 1, majorText: '公共政策（1204）' },
  ];

  assert.deepEqual(getPublicManagementMajorTypes(topicRows[0]), ['undergraduate1204']);
  assert.deepEqual(getPublicManagementMajorTypes(topicRows[1]), ['graduate1204', 'professional1252']);
  assert.deepEqual(getPublicManagementMajorTypes(topicRows[2]), ['unrestricted']);
  assert.deepEqual(filterAndSortPositions(topicRows, { majorTopic: 'public-management' }).map((row) => row.code), ['bachelor', 'graduate']);
});

test('public-management matching separates explicit codes, manual review, unrestricted, not-listed, and unknown', () => {
  const rows = [
    { majorText: '本科：公共管理类（1204）' },
    { majorText: '研究生：公共管理学（1204），公共管理（1252）' },
    { majorText: '本科：管理学（12）研究生：管理学（12）' },
    { majorText: '本科：行政管理（120402）' },
    { majorText: '不限' },
    { majorText: '本科：计算机科学与技术（080901）' },
    { majorText: null },
  ];

  assert.deepEqual(rows.map((row) => classifyPublicManagementMatch(row).status), [
    'explicit', 'explicit', 'manual-review', 'manual-review', 'unrestricted', 'not-listed', 'unknown',
  ]);
  assert.deepEqual(
    filterAndSortPositions(rows, { majorTopic: 'public-management-review' }).map((row) => row.majorText),
    [rows[2].majorText, rows[3].majorText],
  );
});

test('public-management topic summary counts each included position once and breaks out unit type and degree codes', () => {
  const summary = summarizePublicManagementPositions([
    { year: 2024, code: 'a', orgType: '区直', recruitCount: 1, majorText: '本科：公共管理类（1204）' },
    { year: 2024, code: 'b', orgType: '街道', recruitCount: 2, majorText: '研究生：公共管理学（1204），公共管理（1252）' },
    { year: 2024, code: 'c', orgType: '镇', recruitCount: 1, majorText: '不限' },
    { year: 2024, code: 'd', orgType: '镇', recruitCount: 4, majorText: '研究生：管理学（12）' },
    { year: 2024, code: 'e', orgType: '区直', recruitCount: 3, majorText: '本科：计算机科学与技术（080901）' },
    { year: 2024, code: 'f', orgType: '区直', recruitCount: null, majorText: null },
  ]);

  assert.deepEqual(summary, [{
    year: 2024,
    positionCount: 2,
    recruitCount: 3,
    manualReviewCount: 1,
    manualReviewRecruitCount: 4,
    notListedCount: 1,
    unknownCount: 1,
    byOrgType: { 区直: 1, 街道: 1, 镇: 0 },
    byMajorType: { undergraduate1204: 1, graduate1204: 1, professional1252: 1 },
    unrestrictedCount: 1,
  }]);
});

test('the position page exposes category filters, sort order, and accessible pagination controls', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(app, /id="job-jobtype"/);
  assert.match(app, /id="job-sort"/);
  assert.match(app, /公共管理专业专题/);
  assert.match(app, /data-action="toggle-major-focus"/);
  assert.match(app, /明确列入 1204 \/ 1252/);
  assert.match(app, /paginateItems\(allPositions, jobPage, 25\)/);
  assert.match(app, /data-action="positions-page"/);
  assert.match(app, /aria-label="(?:上一页|下一页)"/);
  assert.match(app, /render\(\);[\s\S]{0,80}focus\(\{ preventScroll: true \}\)/);
  assert.match(styles, /\.job-table thead th\s*\{[^}]*position:\s*sticky/s);
  assert.match(styles, /\.job-table th:nth-child\(2\), \.job-table td:nth-child\(2\)\s*\{[^}]*position:\s*sticky/s);
  assert.match(styles, /@media \(max-width: 650px\)[\s\S]*?\.job-filterbar select \{[^}]*flex:\s*1 1 calc\(50% - 4px\)/s);
  assert.match(styles, /\.job-table th:nth-child\(3\), \.job-table td:nth-child\(3\) \{ left: auto; min-width: 155px; \}/);
});
