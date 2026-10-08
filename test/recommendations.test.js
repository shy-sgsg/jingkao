import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSevenDayRecommendations } from '../src/data/decision.js';

function makeDays() {
  return Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    date: `2026-10-${String(index + 8).padStart(2, '0')}`,
    stage: '阶段1：补课建模',
    focus: index === 0 ? '基线诊断' : '科学推理',
    coreTask: '按计划完成并记录练习',
    plannedQuestions: 50,
    status: '未开始',
  }));
}

test('seven-day recommendations use recorded accuracy, target gap, plan volume, and phase', () => {
  const result = buildSevenDayRecommendations({
    today: '2026-10-08',
    days: makeDays(),
    aptitude: [{ area: '科学推理', item: '运动学', targetAccuracy: .72, plannedQuestions: 200, attempted: 100, accuracy: .58 }],
    mocks: [],
  });

  assert.equal(result.days.length, 7);
  assert.equal(result.phase, '阶段1：补课建模');
  assert.equal(result.plannedQuestions, 350);
  assert.equal(result.recommendations[0].area, '科学推理');
  assert.equal(result.recommendations[0].observedAccuracy, .58);
  assert.equal(result.recommendations[0].targetAccuracy, .72);
  assert.equal(result.recommendations[0].sessions, 2);
  assert.equal(result.recommendations[0].questionsPerSession, 7);
});

test('recent mock module results can drive recommendations when practice accuracy is absent', () => {
  const result = buildSevenDayRecommendations({
    today: '2026-10-08',
    days: makeDays(),
    aptitude: [{ area: '科学推理', item: '运动学', targetAccuracy: .72, plannedQuestions: 200, attempted: null, accuracy: null }],
    mocks: [{ total: 120, accuracy: { science: .58 } }],
  });

  assert.equal(result.recommendations[0].source, '模考');
  assert.equal(result.recommendations[0].sessions, 2);
  assert.equal(result.recommendations[0].questionsPerSession, 25);
});

test('real completed plan volume reduces the remaining seven-day recommendation budget', () => {
  const days = makeDays();
  days[0].actualQuestions = 30;
  const result = buildSevenDayRecommendations({
    today: '2026-10-08',
    days,
    aptitude: [{ area: '科学推理', targetAccuracy: .72, plannedQuestions: 200, attempted: null, accuracy: null }],
    mocks: [{ total: 120, accuracy: { science: .58 } }],
  });

  assert.equal(result.plannedQuestions, 320);
  assert.equal(result.recommendations[0].recommendedQuestions, 45);
  assert.equal(result.recommendations[0].questionsPerSession, 23);
});

test('missing practice and mock metrics produce no fabricated weak areas', () => {
  const result = buildSevenDayRecommendations({
    today: '2026-10-08',
    days: makeDays(),
    aptitude: [{ area: '科学推理', item: '运动学', targetAccuracy: .72, plannedQuestions: 200, attempted: null, accuracy: null }],
    mocks: [],
  });

  assert.equal(result.recommendations.length, 0);
  assert.equal(result.phase, '阶段1：补课建模');
  assert.equal(result.days[0].focus, '基线诊断');
});
