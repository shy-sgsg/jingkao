import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateBeijingEligibility, getBeijingManualReviewBasis } from '../src/beijing/eligibility.js';
import { clearBeijingManualReview, normalizeBeijingWorkspace, setBeijingManualReview } from '../src/beijing/storage.js';
import { filterBeijingPositions } from '../src/beijing/filters.js';
import { beijingPositionsToCsv } from '../src/beijing/export.js';
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

const ambiguousPosition = {
  ...basePosition,
  id: 'beijing:2027:002',
  otherConditionsRaw: '根据实际工作需要安排相关工作。',
  remarkRaw: '',
  existingIdentityRaw: '',
  rawFields: { '其它条件': '根据实际工作需要安排相关工作。', '备注': '' },
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

test('a 1:1 male-to-female recruitment ratio does not trigger manual review', () => {
  const ratioPosition = {
    ...basePosition,
    id: 'beijing:2027:819900501',
    otherConditionsRaw: '按照男女比例1:1录取。',
    existingIdentityRaw: '2027应届毕业生',
    professionalTestRaw: '否',
    rawFields: {
      '其它条件': '按照男女比例1:1录取。',
      '基层工作经历最低年限': '2027应届毕业生',
      '是否组织专业能力测试': '否',
      '备注': '',
    },
  };
  const result = evaluateBeijingEligibility(ratioPosition, { ...baseProfile, graduationStatus: '应届毕业生' });

  assert.equal(result.checks.gender.status, 'match');
  assert.equal(result.checks.specialRequirements.status, 'match');
  assert.equal(result.status, 'initialMatch');
});

test('Beijing major matching does not treat management words as a major or code match', () => {
  const position = {
    ...basePosition,
    majorRaw: '研究生：经济学（02），法学（0301），法律（0351），中国语言文学（0501），计算机科学与技术（0812），电子信息（0854），工商管理学（1202），工商管理（1251），会计（1253）',
  };
  const profile = { ...baseProfile, graduateMajorCode: '120405' };
  const majorCatalog = [{ level: '研究生', category: '管理学门类', classification: '公共管理类', major: '土地资源管理' }];

  assert.equal(evaluateBeijingEligibility(position, profile, majorCatalog).checks.major.status, 'mismatch');
});

test('Beijing major matching accepts the applicant major code and its directory prefixes', () => {
  const majorCatalog = [{ level: '研究生', category: '管理学门类', classification: '公共管理类', major: '土地资源管理' }];
  const profile = { ...baseProfile, graduateMajorCode: '120405' };
  const requirements = [
    '研究生：管理学（12）',
    '研究生：公共管理类（1204）',
    '研究生：土地资源管理（120405）',
  ];

  for (const majorRaw of requirements) {
    const result = evaluateBeijingEligibility({ ...basePosition, majorRaw }, profile, majorCatalog);
    assert.equal(result.checks.major.status, 'match', majorRaw);
  }
});

test('manual review decisions resolve uncertain checks and become reversible profile data', () => {
  const automatic = evaluateBeijingEligibility(ambiguousPosition, baseProfile);
  const basis = getBeijingManualReviewBasis(
    ambiguousPosition, baseProfile, 'specialRequirements', automatic.checks.specialRequirements,
  );
  const match = {
    specialRequirements: { status: 'match', basis },
  };
  const mismatch = {
    specialRequirements: { status: 'mismatch', basis },
  };

  assert.equal(automatic.checks.specialRequirements.status, 'review');
  assert.equal(evaluateBeijingEligibility(ambiguousPosition, baseProfile, [], match).status, 'initialMatch');
  assert.equal(evaluateBeijingEligibility(ambiguousPosition, baseProfile, [], match).checks.specialRequirements.manual, true);
  assert.equal(evaluateBeijingEligibility(ambiguousPosition, baseProfile, [], mismatch).status, 'incompatible');
  assert.equal(evaluateBeijingEligibility(ambiguousPosition, baseProfile, [], {
    specialRequirements: { status: 'match', basis: 'stale condition' },
  }).checks.specialRequirements.status, 'review');

  const workspace = normalizeBeijingWorkspace({ manualReviews: { [ambiguousPosition.id]: match } });
  assert.deepEqual(workspace.manualReviews, { [ambiguousPosition.id]: match });
  const stored = setBeijingManualReview(
    normalizeBeijingWorkspace({}), ambiguousPosition.id, 'specialRequirements', 'match', basis,
  );
  assert.deepEqual(stored.manualReviews[ambiguousPosition.id], match);
  const cleared = clearBeijingManualReview(stored, ambiguousPosition.id, 'specialRequirements');
  assert.equal(ambiguousPosition.id in cleared.manualReviews, false);
  assert.equal(filterBeijingPositions([ambiguousPosition], {
    qualificationStatus: 'initialMatch', excludeExplicitMismatch: false,
  }, baseProfile, [], null, workspace.manualReviews).length, 1);
  assert.match(beijingPositionsToCsv([ambiguousPosition], baseProfile, [], workspace), /初步符合/u);
});

test('manual Beijing decisions are ignored when the reviewed profile condition changes', () => {
  const automatic = evaluateBeijingEligibility(ambiguousPosition, baseProfile);
  const manualReviews = {
    specialRequirements: {
      status: 'match',
      basis: getBeijingManualReviewBasis(ambiguousPosition, baseProfile, 'specialRequirements', automatic.checks.specialRequirements),
    },
  };

  assert.equal(evaluateBeijingEligibility(ambiguousPosition, baseProfile, [], manualReviews).status, 'initialMatch');
  assert.equal(evaluateBeijingEligibility(ambiguousPosition, {
    ...baseProfile, credentials: '新增资格证书',
  }, [], manualReviews).checks.specialRequirements.status, 'review');
});

test('uncertain Beijing checks show manual match, mismatch, and undo controls', () => {
  const workspace = {
    filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {}, manualReviews: {},
    favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
  };
  const html = renderBeijingWorkspace({ positions: [ambiguousPosition], profile: baseProfile, workspace });

  assert.match(html, /data-action="beijing-set-manual-review"/u);
  assert.match(html, /data-outcome="match"/u);
  assert.match(html, /data-outcome="mismatch"/u);
  const reviewedHtml = renderBeijingWorkspace({
    positions: [ambiguousPosition], profile: baseProfile,
    workspace: { ...workspace, manualReviews: { [ambiguousPosition.id]: {
      specialRequirements: { status: 'match', basis: 'stale condition' },
    } } },
  });
  assert.match(reviewedHtml, /data-action="beijing-clear-manual-review"/u);
});

test('Beijing manual review buttons persist and clear the selected check through app actions', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(app, /action === 'beijing-set-manual-review'/u);
  assert.match(app, /action === 'beijing-clear-manual-review'/u);
  assert.match(app, /setBeijingManualReview\(/u);
  assert.match(app, /clearBeijingManualReview\(/u);
});
