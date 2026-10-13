import test from 'node:test';
import assert from 'node:assert/strict';
import { filterNationalPositions, sortNationalPositions } from '../src/national/filters.js';
import { evaluateNationalEligibility } from '../src/national/eligibility.js';
import {
  normalizeNationalWorkspace,
  renameNationalSavedFilter,
  toggleNationalComparison,
  toggleNationalFavorite,
} from '../src/national/storage.js';
import { nationalPositionsToCsv } from '../src/national/export.js';

const positions = [
  {
    id: 'national:2027:001:0001', examType: 'national', year: 2027,
    departmentName: '国家税务总局北京市税务局', positionTitle: '一级行政执法员',
    workProvince: '北京市', workCity: '北京市', workDistrict: '', recruitCount: 2,
    majorRaw: '本科：1204公共管理类；研究生：1204公共管理类',
    educationRaw: '本科及以上', degreeRaw: '与最高学历对应的学位',
    politicalStatusRaw: '不限', experienceRaw: '无限制', serviceProjectRaw: '无限制',
    remarkRaw: '咨询电话：01012345678。', examCategory: '行政执法类',
  },
  {
    id: 'national:2027:002:0002', examType: 'national', year: 2027,
    departmentName: '国家税务总局天津市税务局', positionTitle: '综合管理岗',
    workProvince: '天津市', workCity: '天津市', workDistrict: '', recruitCount: 1,
    majorRaw: '仅限法学（0301）', educationRaw: '仅限本科', degreeRaw: '学士',
    politicalStatusRaw: '中共党员', experienceRaw: '二年', serviceProjectRaw: '无限制',
    remarkRaw: '无', examCategory: '市（地）级及以下直属机构综合管理类',
  },
  {
    id: 'national:2027:003:0003', examType: 'national', year: 2027,
    departmentName: '国家统计局山东调查总队', positionTitle: '调查队科员',
    workProvince: '山东省', workCity: '济南市', workDistrict: '', recruitCount: 3,
    majorRaw: '管理学类相关专业', educationRaw: '硕士研究生及以上', degreeRaw: '硕士',
    politicalStatusRaw: '中共党员或共青团员', experienceRaw: '无限制', serviceProjectRaw: '无限制',
    remarkRaw: '', examCategory: '中央机关及其省级直属机构综合管理类',
  },
];

test('national filters AND distinct dimensions and OR selected values within one dimension', () => {
  const result = filterNationalPositions(positions, {
    workProvinces: ['北京市', '山东省'],
    departmentTypes: [],
    examCategories: [],
    educationLevels: [],
    politicalStatuses: [],
    grassrootsRequirements: [],
    keyword: '税务',
    minRecruitCount: 2,
  });

  assert.deepEqual(result.map((position) => position.id), ['national:2027:001:0001']);
});

test('national manual major search finds raw terms without turning text hits into eligibility matches', () => {
  const result = filterNationalPositions(positions, { majorQuery: '管理学' });
  assert.deepEqual(result.map((position) => position.id), ['national:2027:003:0003']);

  const assessment = evaluateNationalEligibility(positions[2], {
    degree: '硕士研究生', graduateMajor: '土地资源管理', graduateMajorCode: '120404',
    degreeTitle: '硕士学位', politicalStatus: '共青团员', grassrootsYears: '0',
  });
  assert.equal(assessment.checks.major.status, 'review');
  assert.notEqual(assessment.checks.major.status, 'match');
});

test('department text filter matches the hiring department independently from broad keyword search', () => {
  const rows = filterNationalPositions(positions, { departmentQuery: '国家统计局' });
  assert.deepEqual(rows.map((item) => item.id), ['national:2027:003:0003']);
  const departments = filterNationalPositions(positions, { departmentQueries: ['天津市税务局', '国家统计局'] });
  assert.deepEqual(departments.map((item) => item.id), ['national:2027:002:0002', 'national:2027:003:0003']);
});

test('department search covers both the hiring department and employing bureau', () => {
  const rows = filterNationalPositions(positions.map((position) => ({ ...position, organizationName: '测试司局' })), { departmentQuery: '测试司' });
  assert.deepEqual(rows.map((item) => item.id), ['national:2027:001:0001', 'national:2027:002:0002', 'national:2027:003:0003']);
});

test('location multi-select, education, degree, grassroots years, and recruit range combine as AND dimensions', () => {
  const result = filterNationalPositions(positions, {
    workProvinces: ['北京市', '天津市'], educationRequirements: ['仅限本科'],
    degrees: ['学士'], grassrootsRequirements: ['二年'], minRecruitCount: 1, maxRecruitCount: 1,
  });
  assert.deepEqual(result.map((item) => item.id), ['national:2027:002:0002']);
});

test('special requirement, unrestricted-major, and explicit mismatch filters remain separate', () => {
  const unrestricted = { ...positions[0], id: 'national:2027:004:0004', majorRaw: '专业不限', specialRequirementStatus: 'none' };
  const rows = filterNationalPositions([...positions, unrestricted], { onlyUnrestrictedMajor: true });
  assert.deepEqual(rows.map((item) => item.id), [unrestricted.id]);
  assert.deepEqual(filterNationalPositions(positions, { hasSpecialRequirement: false }).map((item) => item.id), [positions[0].id, positions[1].id, positions[2].id]);
  const profile = { degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402', degreeTitle: '文学学士', politicalStatus: '群众', grassrootsYears: '2' };
  const compatible = filterNationalPositions(positions, { excludeExplicitMismatch: true }, profile);
  assert.equal(compatible.some((item) => item.id === positions[1].id), false);
});

test('quick exclusions remove special review cases, incomplete records, and posts below two recruits', () => {
  const complete = { ...positions[0], departmentCode: '001', positionCode: '900001', positionTitle: '岗位', workLocation: '北京市', professionalTestRaw: '否' };
  const review = { ...complete, id: 'national:2027:004:0004', recruitCount: 1, remarkRaw: '需满足特殊资格条件。', specialRequirementStatus: 'manual-review' };
  const missing = { ...complete, id: 'national:2027:005:0005', workLocation: '' };
  assert.deepEqual(filterNationalPositions([complete, review, missing], { onlyRecruitAtLeastTwo: true }).map((item) => item.id), [complete.id, missing.id]);
  assert.deepEqual(filterNationalPositions([complete, review, missing], { onlyWithCompleteRawFields: true }).map((item) => item.id), [complete.id, review.id]);
  const profile = { degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402', degreeTitle: '学士学位', politicalStatus: '群众', grassrootsYears: '0' };
  assert.deepEqual(filterNationalPositions([complete, review], { excludeSpecialReview: true }, profile).map((item) => item.id), [complete.id]);
});

test('national result sorting supports recruit counts, department, work location, and position code', () => {
  const rows = [
    { ...positions[0], positionCode: '003', departmentName: '乙部门', workLocation: '天津市', recruitCount: 2 },
    { ...positions[1], positionCode: '001', departmentName: '甲部门', workLocation: '北京', recruitCount: 1 },
    { ...positions[2], positionCode: '002', departmentName: '丙部门', workLocation: '上海', recruitCount: 3 },
  ];
  assert.deepEqual(sortNationalPositions(rows, 'recruit-asc').map((item) => item.positionCode), ['001', '003', '002']);
  assert.deepEqual(sortNationalPositions(rows, 'recruit-desc').map((item) => item.positionCode), ['002', '003', '001']);
  assert.deepEqual(sortNationalPositions(rows, 'department').map((item) => item.positionCode), ['002', '001', '003']);
  assert.deepEqual(sortNationalPositions(rows, 'location').map((item) => item.positionCode), ['001', '002', '003']);
  assert.deepEqual(sortNationalPositions(rows, 'position-code').map((item) => item.positionCode), ['001', '002', '003']);
});

test('saved filter names can be changed without altering their stored conditions', () => {
  const workspace = normalizeNationalWorkspace({ savedFilters: [{ id: 'saved-1', name: '旧方案', filters: { workProvinces: ['湖北省'] } }] });
  const renamed = renameNationalSavedFilter(workspace, 'saved-1', '湖北岗位');
  assert.equal(renamed.savedFilters[0].name, '湖北岗位');
  assert.deepEqual(renamed.savedFilters[0].filters, { workProvinces: ['湖北省'] });
});

test('national table column preferences retain only supported selectable fields', () => {
  const workspace = normalizeNationalWorkspace({ visibleColumns: ['majorMatch', 'bad-column', 'majorMatch', 'actions'] });
  assert.deepEqual(workspace.visibleColumns, ['majorMatch']);
  assert.equal(normalizeNationalWorkspace({}).visibleColumns, null);
});

test('explicit major category code matches the corresponding profile code and explains the basis', () => {
  const assessment = evaluateNationalEligibility(positions[0], {
    degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402',
    degreeTitle: '学士学位', politicalStatus: '群众', grassrootsYears: '0',
  });

  assert.equal(assessment.checks.major.status, 'match');
  assert.equal(assessment.checks.major.matchType, 'category');
  assert.match(assessment.checks.major.reason, /1204/);
});

test('parenthetical professional category codes are recognized after explicit only limits', () => {
  const assessment = evaluateNationalEligibility(positions[1], {
    degree: '本科', undergraduateMajor: '法学类专业', undergraduateMajorCode: '030101',
    degreeTitle: '文学学士', politicalStatus: '中共党员', grassrootsYears: '2',
  });
  assert.equal(assessment.checks.major.status, 'match');
  assert.equal(assessment.checks.major.matchType, 'category');
});

test('education matching distinguishes only-bachelor from bachelor-and-above', () => {
  const profile = { degree: '硕士研究生', graduateMajor: '法学', graduateMajorCode: '030101', degreeTitle: '硕士学位', politicalStatus: '中共党员', grassrootsYears: '2' };
  const onlyBachelor = evaluateNationalEligibility(positions[1], profile);
  assert.equal(onlyBachelor.checks.education.status, 'mismatch');

  const bachelorAndAbove = evaluateNationalEligibility(positions[0], { ...profile, degree: '硕士研究生' });
  assert.equal(bachelorAndAbove.checks.education.status, 'match');
});

test('degree title recognizes specialist degree names and reports missing titles without inference', () => {
  const bachelor = evaluateNationalEligibility(positions[0], {
    degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402',
    degreeTitle: '文学学士', politicalStatus: '群众', grassrootsYears: '0',
  });
  assert.equal(bachelor.checks.degree.status, 'match');
  const missing = evaluateNationalEligibility(positions[0], {
    degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402',
    politicalStatus: '群众', grassrootsYears: '0',
  });
  assert.equal(missing.checks.degree.status, 'missing');
});

test('national qualification reports explicit political and grassroots mismatches', () => {
  const assessment = evaluateNationalEligibility(positions[1], {
    degree: '本科', undergraduateMajor: '法学', undergraduateMajorCode: '030101',
    degreeTitle: '学士学位', politicalStatus: '共青团员', grassrootsYears: '1',
  });

  assert.equal(assessment.checks.politicalStatus.status, 'mismatch');
  assert.equal(assessment.checks.grassrootsExperience.status, 'mismatch');
  assert.equal(assessment.status, 'incompatible');
});

test('unknown remark restrictions and missing profile fields remain review or incomplete', () => {
  const needsReview = evaluateNationalEligibility({
    ...positions[0], remarkRaw: '具有两年以上基层工作经历，需在报名备注中说明。',
  }, { degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402', politicalStatus: '群众', grassrootsYears: '3' });
  assert.equal(needsReview.checks.specialRequirements.status, 'review');
  assert.equal(needsReview.status, 'needsReview');

  const incomplete = evaluateNationalEligibility(positions[0], {});
  assert.equal(incomplete.status, 'incomplete');
  assert.equal(incomplete.checks.major.status, 'missing');
  assert.equal(incomplete.checks.education.status, 'missing');
});

test('national state defaults preserve legacy Beijing data while rejecting cross-exam comparisons', () => {
  const workspace = normalizeNationalWorkspace({
    favorites: [{ id: 'national:2027:001:0001', positionId: 'national:2027:001:0001', priority: 'high' }],
    comparisons: ['national:2027:001:0001'],
  });
  assert.equal(workspace.favorites[0].priority, 'high');
  assert.throws(() => toggleNationalComparison(workspace, '231260001'), /国考/);

  const next = toggleNationalComparison(workspace, 'national:2027:002:0002');
  assert.deepEqual(next.comparisons, ['national:2027:001:0001', 'national:2027:002:0002']);
  assert.equal(toggleNationalFavorite(next, 'national:2027:002:0002').favorites.length, 2);
  assert.equal(toggleNationalFavorite(toggleNationalFavorite(next, 'national:2027:002:0002'), 'national:2027:002:0002').favorites.length, 1);
  assert.throws(() => toggleNationalFavorite(next, '231260001'), /国考/);

  const six = Array.from({ length: 6 }, (_, index) => `national:2027:00000${index + 1}:000${index + 1}`);
  const full = normalizeNationalWorkspace({ comparisons: six });
  assert.throws(() => toggleNationalComparison(full, 'national:2027:000007:000007'), /最多比较 6 个/u);
});

test('national CSV export retains official text, escapes delimiters, and neutralizes formulas', () => {
  const csv = nationalPositionsToCsv([{
    ...positions[0], departmentName: '=HYPERLINK("https://bad.example")',
    remarkRaw: '第一行，说明\n第二行', personalNote: '优先复核',
  }]);

  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /"第一行，说明\n第二行"/);
  assert.match(csv, /优先复核/);
});
