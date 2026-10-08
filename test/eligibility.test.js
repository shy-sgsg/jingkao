import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility, evaluateMajorCode } from '../src/data/decision.js';

const criteria = { undergraduate: ['1204'], graduate: ['1204'] };

test('major matching distinguishes undergraduate 1204 from graduate 1204 and 1252', () => {
  assert.equal(evaluateMajorCode({ degree: '本科', majorCode: '1204' }, criteria).status, 'match');
  assert.equal(evaluateMajorCode({ degree: '硕士研究生', majorCode: '1204' }, criteria).status, 'match');
  assert.equal(evaluateMajorCode({ degree: '硕士研究生', degreeType: '专业学位', majorCode: '1252' }, criteria).status, 'mismatch');
  assert.equal(evaluateMajorCode({ degree: '硕士研究生', majorCode: '1252' }, { ...criteria, graduate: ['1204', '1252'] }).status, 'match');
});

test('major matching selects the code for the declared highest-education tier and does not borrow the other tier', () => {
  const criteriaByLevel = { undergraduate: ['1204'], graduate: ['1204', '1252'] };
  const profile = {
    degree: '硕士研究生',
    undergraduateMajor: '行政管理',
    undergraduateMajorCode: '1204',
    graduateMajor: '公共管理',
    graduateMajorCode: '1252',
  };

  assert.deepEqual(evaluateMajorCode(profile, criteriaByLevel), {
    status: 'match', level: 'graduate', code: '1252', acceptedCodes: ['1204', '1252'],
  });
  assert.equal(evaluateMajorCode({ ...profile, graduateMajorCode: '' }, criteriaByLevel).status, 'missing');
  assert.equal(evaluateMajorCode({ ...profile, graduateMajorCode: '' }, criteriaByLevel).code, '');
});

test('tier-specific empty codes disable legacy fallback once the profile has been split by education level', () => {
  const profile = {
    degree: '硕士研究生',
    majorCode: '1204',
    undergraduateMajorCode: '1204',
    graduateMajorCode: '',
  };

  assert.equal(evaluateMajorCode(profile, criteria).status, 'missing');
  assert.equal(evaluateMajorCode(profile, criteria).code, '');
});

test('eligibility distinguishes insufficient data, conditional review, confirmed eligibility, and known failure', () => {
  assert.equal(evaluateEligibility({}, {}).status, '信息不足');
  const position = { majorCriteria: criteria, eligibilityComplete: false, sourceLevel: 'secondary' };
  assert.equal(evaluateEligibility(position, { degree: '本科', majorCode: '1204' }).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility(position, { degree: '硕士研究生', majorCode: '1252' }).status, '信息不足');
  assert.equal(evaluateEligibility(position, { degree: '', majorCode: '' }).status, '信息不足');
  assert.equal(evaluateEligibility(position, { major: '公共管理', degree: '本科' }).status, '信息不足');
  assert.equal(evaluateEligibility({ majorCriteria: criteria, eligibilityComplete: true, sourceLevel: 'secondary' }, { degree: '本科', majorCode: '1204' }).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility({ majorCriteria: criteria, eligibilityComplete: true, sourceLevel: 'official' }, { degree: '本科', majorCode: '1204' }).status, '明确可报');
});

test('eligibility checks an explicit education threshold before returning a conditional match', () => {
  const graduateOnly = { education: '仅限硕士研究生', majorCriteria: criteria, eligibilityComplete: false, sourceLevel: 'official' };
  assert.equal(evaluateEligibility(graduateOnly, { degree: '本科', majorCode: '1204' }).status, '明确不可报');
  assert.deepEqual(evaluateEligibility(graduateOnly, { degree: '', majorCode: '1204' }).missing, ['degree']);
  assert.equal(evaluateEligibility(graduateOnly, { degree: '硕士研究生', majorCode: '1204' }).status, '大概率可报但有条件待核');
});

test('a mismatch from a secondary source requires manual review instead of excluding the candidate', () => {
  const role = {
    sourceLevel: 'secondary',
    eligibilityComplete: false,
    requirements: { politicalStatus: '中共党员', graduationYear: ['2025'] },
    majorCriteria: criteria,
  };
  const result = evaluateEligibility(role, {
    degree: '本科',
    majorCode: '1204',
    politicalStatus: '群众',
    graduationYear: '2025',
  });

  assert.equal(result.status, '信息不足');
  assert.equal(result.reviewRequired, true);
  assert.deepEqual(result.requirementChecks, [
    { field: 'politicalStatus', label: '政治面貌', expected: '中共党员', actual: '群众', status: 'mismatch' },
    { field: 'graduationYear', label: '毕业年份', expected: '2025', actual: '2025', status: 'match' },
  ]);
});

test('an authoritative explicit mismatch can be classified as a confirmed failure', () => {
  const result = evaluateEligibility({
    sourceLevel: 'official',
    requirements: { politicalStatus: '中共党员' },
  }, { politicalStatus: '群众' });

  assert.equal(result.status, '明确不可报');
  assert.equal(result.reviewRequired, false);
  assert.deepEqual(result.requirementChecks, [
    { field: 'politicalStatus', label: '政治面貌', expected: '中共党员', actual: '群众', status: 'mismatch' },
  ]);
});

test('a doctoral minimum does not accept a masters degree as a graduate-level match', () => {
  const doctorateOnly = { education: '博士研究生及以上', majorCriteria: criteria, eligibilityComplete: false, sourceLevel: 'official' };
  assert.equal(evaluateEligibility(doctorateOnly, { degree: '硕士研究生', majorCode: '1204' }).status, '明确不可报');
  assert.equal(evaluateEligibility(doctorateOnly, { degree: '博士研究生', majorCode: '1204' }).status, '大概率可报但有条件待核');
});

test('a masters-and-above requirement accepts doctoral education while a masters-only requirement does not', () => {
  const profile = { degree: '博士研究生', majorCode: '1204' };
  assert.equal(evaluateEligibility({ education: '硕士研究生及以上', majorCriteria: criteria }, profile).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility({ education: '仅限硕士研究生', majorCriteria: criteria, sourceLevel: 'official' }, profile).status, '明确不可报');
});
