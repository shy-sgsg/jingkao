import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBeijingEligibility } from '../src/beijing/eligibility.js';
import { normalizeBeijingWorkspace } from '../src/beijing/storage.js';
import { renderBeijingWorkspace } from '../src/beijing/view.js';

const baseProfile = {
  degree: '硕士研究生',
  graduateMajor: '土地资源管理',
  politicalStatus: '共青团员',
  age: '24',
};

const basePosition = {
  id: 'beijing:2027:001',
  majorRaw: '不限',
  educationRaw: '高中（中专）及以上',
  degreeRaw: '与最高学历相对应的学位',
  politicalStatusRaw: '中共党员或共青团员',
  grassrootsRequirementRaw: '不限',
  ageRaw: '18周岁以上、35周岁以下',
  otherConditionsRaw: '参照公务员法管理；政治面貌要求为共青团员或中共党员（含中共预备党员）',
  sourceSheet: '普通职位',
};

test('Beijing qualification check accepts unrestricted majors, high-school-and-above education, and Youth League members', () => {
  const result = evaluateBeijingEligibility(basePosition, {
    ...baseProfile,
    degreeTitle: '忽略的证书名称',
    graduationYear: '忽略的毕业年份',
  });

  assert.equal(result.status, 'initialMatch');
  assert.equal(result.checks.major.status, 'match');
  assert.equal(result.checks.education.status, 'match');
  assert.equal(result.checks.degree.status, 'match');
  assert.equal(result.checks.politicalStatus.status, 'match');
  assert.equal(result.checks.specialRequirements.status, 'match');
  assert.equal(result.checks.graduation.status, 'match');
});

test('Beijing profile normalization omits degree certificate title and graduation year', () => {
  const { profile } = normalizeBeijingWorkspace({ profile: {
    ...baseProfile,
    degreeTitle: '硕士学位证书名称',
    graduationYear: '2027',
  } });

  assert.equal(profile.degree, '硕士研究生');
  assert.equal('degreeTitle' in profile, false);
  assert.equal('graduationYear' in profile, false);
});

test('Beijing age check selects the age clause for the highest-education stage', () => {
  const position = {
    ...basePosition,
    ageRaw: '本科生：30周岁以下；硕士、博士研究生：35周岁以下',
  };

  assert.equal(evaluateBeijingEligibility(position, { ...baseProfile, age: '34' }).checks.age.status, 'match');
  assert.equal(evaluateBeijingEligibility(position, { ...baseProfile, degree: '本科', age: '34' }).checks.age.status, 'mismatch');
});

test('Beijing qualification count cards render as clickable filters for every category', () => {
  const html = renderBeijingWorkspace({
    positions: [basePosition],
    metadata: { positionCount: 1, recruitCount: 1 },
    profile: baseProfile,
    workspace: {
      filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {},
      favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
    },
  });

  for (const filter of ['initialMatch', 'incompatible', 'needsReview', 'incomplete', 'majorMatch']) {
    assert.match(html, new RegExp(`data-action="beijing-filter-count"[^>]*data-filter="${filter}"`));
  }
});
