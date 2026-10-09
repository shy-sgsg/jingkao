import test from 'node:test';
import assert from 'node:assert/strict';
import { combinePracticeSummary, getGeneralKnowledgeStats } from '../src/general-knowledge/analytics.js';

test('manual and in-app answers combine by question count without counting manual entries twice', () => {
  const combined = combinePracticeSummary({
    hasAttempted: true, attemptedCount: 10, accuracyQuestionCount: 10, correctEstimate: 6, accuracy: 0.6,
  }, { attemptedCount: 5, correctCount: 4 });
  assert.equal(combined.attemptedCount, 15);
  assert.equal(combined.accuracyQuestionCount, 15);
  assert.equal(combined.correctEstimate, 10);
  assert.equal(combined.accuracy, 10 / 15);
  assert.equal(combined.onlineAttemptedCount, 5);
});

test('general-knowledge stats remain scoped to its own sessions and answers', () => {
  const stats = getGeneralKnowledgeStats({
    sessions: [
      { id: 'gk', moduleId: 'general_knowledge', mode: 'practice', status: 'completed' },
      { id: 'science', moduleId: 'science_reasoning', mode: 'practice', status: 'completed' },
    ],
    answers: [
      { id: 'a1', moduleId: 'general_knowledge', sessionId: 'gk', questionId: 'q1', isCorrect: true },
      { id: 'a2', moduleId: 'science_reasoning', sessionId: 'science', questionId: 'q2', isCorrect: false },
    ],
  });
  assert.equal(stats.attemptedCount, 1);
  assert.equal(stats.correctCount, 1);
  assert.equal(stats.accuracy, 1);
});
