import test from 'node:test';
import assert from 'node:assert/strict';

const analytics = await import('../src/aptitude/analytics.js');

test('completed and timed-out module exams appear with scores and review routes', () => {
  assert.equal(typeof analytics.getAptitudeMockSessionRecords, 'function');
  const records = analytics.getAptitudeMockSessionRecords({
    scienceStudy: {
      sessions: [{ id: 'science-exam', mode: 'exam', status: 'completed', questionIds: ['s1', 's2'], completedAt: '2026-10-07T10:00:00.000Z' }],
      answers: [{ sessionId: 'science-exam', questionId: 's1', isCorrect: true }],
    },
    generalKnowledgeStudy: {
      sessions: [{ id: 'gk-exam', mode: 'exam', status: 'timed_out', questionIds: ['g1', 'g2'], completedAt: '2026-10-08T10:00:00.000Z' }],
      answers: [{ sessionId: 'gk-exam', questionId: 'g1', isCorrect: false }],
    },
    aptitudeModuleStudies: {
      reasoning: {
        sessions: [{ id: 'reasoning-exam', moduleId: 'reasoning', mode: 'exam', status: 'completed', questionIds: ['r1', 'r2'], completedAt: '2026-10-09T10:00:00.000Z' }],
        answers: [
          { moduleId: 'reasoning', sessionId: 'reasoning-exam', questionId: 'r1', isCorrect: true },
          { moduleId: 'reasoning', sessionId: 'reasoning-exam', questionId: 'r2', isCorrect: false },
        ],
      },
      verbal: {
        sessions: [{ id: 'verbal-active', moduleId: 'verbal', mode: 'exam', status: 'active', questionIds: ['v1'], startedAt: '2026-10-09T11:00:00.000Z' }],
        answers: [],
      },
    },
  });

  assert.deepEqual(records.map(({ moduleId, id, questionCount, correctCount, scoreRate, date }) => ({
    moduleId, id, questionCount, correctCount, scoreRate, date,
  })), [
    { moduleId: 'reasoning', id: 'reasoning-exam', questionCount: 2, correctCount: 1, scoreRate: 0.5, date: '2026-10-09' },
    { moduleId: 'general-knowledge', id: 'gk-exam', questionCount: 2, correctCount: 0, scoreRate: 0, date: '2026-10-08' },
    { moduleId: 'science', id: 'science-exam', questionCount: 2, correctCount: 1, scoreRate: 0.5, date: '2026-10-07' },
  ]);
  assert.ok(records.every((record) => record.href.includes(`session=${record.id}`)));
});

test('mock session records include every module-owned study store', () => {
  const moduleIds = ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis'];
  const records = analytics.getAptitudeMockSessionRecords({
    aptitudeModuleStudies: Object.fromEntries(moduleIds.map((moduleId) => [moduleId, {
      sessions: [{ id: moduleId, moduleId, mode: 'exam', status: 'completed', questionIds: [`${moduleId}-q`], completedAt: '2026-10-09T10:00:00.000Z' }],
      answers: [{ moduleId, sessionId: moduleId, questionId: `${moduleId}-q`, isCorrect: true }],
    }])),
  });
  assert.deepEqual(records.map(({ moduleId }) => moduleId).sort(), moduleIds.sort());
  assert.ok(records.every((record) => record.href.includes(`/aptitude/${record.moduleId}?session=${record.id}`)));
});
