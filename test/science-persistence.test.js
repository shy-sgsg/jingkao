import test from 'node:test';
import assert from 'node:assert/strict';

test('older account state receives empty science collections without losing existing plan records', async () => {
  const persistence = await import('../src/science/persistence.js').catch(() => ({}));
  assert.equal(typeof persistence.normalizeStudyState, 'function');

  const oldState = {
    dayLogs: { 1: { actualQuestions: 8 } },
    planOverrides: { 1: { focus: '复盘' } },
  };
  const normalized = persistence.normalizeStudyState(oldState);

  assert.deepEqual(normalized.studyPlanTasks, []);
  assert.deepEqual(normalized.scienceStudy, {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
  });
  assert.deepEqual(normalized.generalKnowledgeStudy, {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [], flashcards: [], flashcardReviews: [],
  });
  assert.deepEqual(normalized.dayLogs, oldState.dayLogs);
  assert.deepEqual(normalized.planOverrides, oldState.planOverrides);
});

test('normalized account state preserves task links, exam attempts, mistakes, and favorites', async () => {
  const persistence = await import('../src/science/persistence.js').catch(() => ({}));
  assert.equal(typeof persistence.normalizeStudyState, 'function');

  const studyState = {
    studyPlanTasks: [{ id: 'task-a', taskType: 'science_reasoning', title: '模拟', date: '2026-10-09' }],
    scienceStudy: {
      knowledgeProgress: { 'physics:buoyancy': { status: 'learning' } },
      sessions: [{ id: 'exam-a', mode: 'exam', planTaskId: 'task-a', deadline: '2026-10-09T10:10:00Z' }],
      answers: [{ id: 'answer-a', sessionId: 'exam-a', questionId: 'q-a' }],
      mistakes: { 'q-a': { count: 1 } },
      favorites: ['q-a'],
      favoriteKnowledgePointIds: ['physics:buoyancy'],
      unclearKnowledgePointIds: ['physics:friction'],
    },
  };

  assert.deepEqual(persistence.normalizeStudyState(studyState), {
    ...studyState,
    generalKnowledgeStudy: {
      knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [], flashcards: [], flashcardReviews: [],
    },
  });
});

test('knowledge point study status preserves its first start time and can be flagged', async () => {
  const { setKnowledgePointStatus, toggleKnowledgePointFlag } = await import('../src/science/persistence.js');
  const learning = setKnowledgePointStatus({}, 'physics:buoyancy', 'learning', '2026-10-09T09:00:00.000Z');
  const completed = setKnowledgePointStatus(learning, 'physics:buoyancy', 'completed', '2026-10-09T10:00:00.000Z');
  const favorite = toggleKnowledgePointFlag(completed, 'physics:buoyancy', 'favorite');
  const unclear = toggleKnowledgePointFlag(favorite, 'physics:friction', 'unclear');

  assert.deepEqual(unclear.knowledgeProgress['physics:buoyancy'], {
    status: 'completed', startedAt: '2026-10-09T09:00:00.000Z', lastViewedAt: '2026-10-09T10:00:00.000Z', completedAt: '2026-10-09T10:00:00.000Z',
  });
  assert.deepEqual(unclear.favoriteKnowledgePointIds, ['physics:buoyancy']);
  assert.deepEqual(unclear.unclearKnowledgePointIds, ['physics:friction']);
});
