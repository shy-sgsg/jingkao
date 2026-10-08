import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreDifficulty, scoreFit } from '../src/data/decision.js';

function makeDataset() {
  const positions = [];
  const scoreRows = [];
  const observations = [];
  const sources = [];
  const openFields = ['politicalStatus', 'freshGraduateRequirement', 'hukouRequirement', 'studentOriginRequirement'];

  for (let index = 0; index < 5; index += 1) {
    const group = `group-${index + 1}`;
    const sourceId = `source-${index + 1}`;
    sources.push({ sourceId, level: 'secondary' });
    for (const year of [2024, 2026]) {
      const code = `${year}-${index + 1}`;
      const position = {
        year,
        code,
        unit: `单位 ${index + 1}`,
        title: '综合管理岗',
        orgType: index === 0 ? '区直' : '街道',
        jobType: '行政执法',
        recruitCount: index + 1,
        education: '不限',
        majorText: '公共管理',
        majorCriteria: { undergraduate: ['1204'], graduate: ['1204'] },
        eligibilityComplete: true,
        ...Object.fromEntries(openFields.map((field, fieldIndex) => [field, fieldIndex < index ? '不限' : '具体条件'])),
        comparableGroupId: group,
        sourceLevel: 'secondary',
        sources: [sourceId],
      };
      positions.push(position);
      scoreRows.push({
        year,
        positionCode: code,
        mappingConfidence: 'high',
        score: year === 2024 ? 100 : 100 + index * 10,
      });
      if (year === 2026) {
        observations.push({
          year,
          positionCode: code,
          scope: 'position',
          qualifiedCompetitionRatio: index + 1,
        });
      }
    }
  }

  return { positions, scoreRows, observations, sources };
}

test('difficulty score uses the approved weights and same-year / comparable-group denominators', () => {
  const dataset = makeDataset();
  const position = dataset.positions.find((row) => row.code === '2026-3');
  const result = scoreDifficulty(position, dataset);

  assert.equal(result.score, 51);
  assert.equal(result.availableWeight, 100);
  assert.deepEqual(result.components.map(({ key, weight, score }) => [key, weight, score]), [
    ['interviewCutoff', 30, 50],
    ['qualifiedCompetition', 25, 50],
    ['recruitCount', 15, 50],
    ['unrestrictedFields', 15, 50],
    ['cutoffVolatility', 10, 50],
    ['sourceConfidence', 5, 70],
  ]);
  assert.equal(result.components.find(({ key }) => key === 'interviewCutoff').sampleCount, 5);
  assert.equal(result.components.find(({ key }) => key === 'cutoffVolatility').sampleCount, 5);
  assert.match(result.components.find(({ key }) => key === 'recruitCount').direction, /名额越少越难/);
});

test('district-level competition snapshots never fill a position score component', () => {
  const dataset = makeDataset();
  dataset.observations = [{
    year: 2026,
    positionCode: null,
    scope: 'district',
    applicantsQualified: 1671,
    recruitCount: 199,
    qualifiedCompetitionRatio: 8.4,
  }];
  const result = scoreDifficulty(dataset.positions.find((row) => row.code === '2026-3'), dataset);

  const competition = result.components.find(({ key }) => key === 'qualifiedCompetition');
  assert.equal(competition.score, null);
  assert.match(competition.reason, /岗位级/);
  assert.equal(result.score, null);
  assert.equal(result.availableWeight, 75);
});

test('fit score reports sourced sub-scores but does not reweight around missing personal-advantage evidence', () => {
  const dataset = makeDataset();
  const position = dataset.positions.find((row) => row.code === '2026-1');
  const profile = { degree: '本科', majorCode: '1204', preferredTypes: '行政执法', preferredLocation: '区直' };
  const mocks = [130, 130, 130, 130, 130].map((total) => ({ total }));
  const result = scoreFit(position, profile, profile, mocks, dataset);

  assert.equal(result.eligibility.status, '大概率可报但有条件待核');
  assert.equal(result.score, null);
  assert.equal(result.availableWeight, 90);
  assert.deepEqual(result.components.map(({ key, weight, score }) => [key, weight, score]), [
    ['qualifiedCompetition', 30, 100],
    ['safeMargin', 25, 100],
    ['recruitCount', 15, 0],
    ['personalAdvantage', 10, null],
    ['preferredType', 10, 100],
    ['preferredLocation', 5, 100],
    ['sourceConfidence', 5, 70],
  ]);
  assert.match(result.components.find(({ key }) => key === 'safeMargin').direction, /安全垫越大越有利/);
  assert.match(result.components.find(({ key }) => key === 'personalAdvantage').reason, /无来源支持/);
});

test('fit score is withheld until the hard eligibility screen has enough personal information', () => {
  const dataset = makeDataset();
  const position = dataset.positions.find((row) => row.code === '2026-1');
  const result = scoreFit(position, { degree: '', majorCode: '' }, {}, [], dataset);

  assert.equal(result.eligibility.status, '信息不足');
  assert.equal(result.score, null);
  assert.equal(result.availableWeight, 0);
  assert.deepEqual(result.components, []);
});
