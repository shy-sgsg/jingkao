import test from 'node:test';
import assert from 'node:assert/strict';

test('old account data gets an empty general-knowledge state without changing science or manual records', async () => {
  const persistence = await import('../src/science/persistence.js');
  const old = {
    aptitudeLogs: { 1: { attempted: 20 } },
    scienceStudy: { answers: [{ id: 'science-answer', moduleId: 'science_reasoning' }] },
  };
  const result = persistence.normalizeStudyState(old);
  assert.deepEqual(result.generalKnowledgeStudy, {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [],
    favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [], flashcards: [], flashcardReviews: [],
  });
  assert.deepEqual(result.scienceStudy.answers, old.scienceStudy.answers);
  assert.deepEqual(result.aptitudeLogs, old.aptitudeLogs);
});

test('general-knowledge learning, favorite, and flashcard review state is isolated and normalized', async () => {
  const persistence = await import('../src/general-knowledge/persistence.js').catch(() => ({}));
  assert.equal(typeof persistence.normalizeGeneralKnowledgeStudy, 'function');
  const learning = persistence.setGeneralKnowledgePointStatus({}, 'law:civil-code-basics', 'learning', '2026-10-09T09:00:00.000Z');
  const completed = persistence.setGeneralKnowledgePointStatus(learning, 'law:civil-code-basics', 'completed', '2026-10-09T10:00:00.000Z');
  const favorite = persistence.toggleGeneralKnowledgePointFlag(completed, 'law:civil-code-basics', 'favorite');
  const review = persistence.reviewFlashcard(favorite, 'beijing:12345-response', 'good', '2026-10-09T10:30:00.000Z');
  assert.equal(review.knowledgeProgress['law:civil-code-basics'].completedAt, '2026-10-09T10:00:00.000Z');
  assert.deepEqual(review.favoriteKnowledgePointIds, ['law:civil-code-basics']);
  assert.equal(review.flashcardReviews[0].moduleId, 'general_knowledge');
  assert.equal(review.flashcardReviews[0].knowledgePointId, 'beijing:12345-response');
  assert.ok(review.flashcardReviews[0].nextReviewAt > review.flashcardReviews[0].reviewedAt);
});

test('personal JSON backups validate and round-trip general-knowledge learning records', async () => {
  const backup = await import('../src/data/backup.js');
  const gkState = {
    generalKnowledgeStudy: {
      knowledgeProgress: {}, sessions: [{ id: 'gk-s-1', moduleId: 'general_knowledge', mode: 'practice' }],
      answers: [{ id: 'gk-a-1', moduleId: 'general_knowledge', sessionId: 'gk-s-1', questionId: 'gk-q-1' }],
      mistakes: {}, favorites: ['gk-q-1'], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [], flashcards: [], flashcardReviews: [],
    },
  };
  const state = {
    profile: {}, dayLogs: {}, aptitudeLogs: {}, essayLogs: {}, mocks: [], favorites: [], compared: [], settings: {},
    onboarding: { step: 0, hidden: false, completed: false }, ...gkState,
  };
  const encoded = backup.createUserBackup(state, '2026-10-09T10:00:00.000Z');
  const restored = backup.parseUserBackup(encoded);
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.state.generalKnowledgeStudy, state.generalKnowledgeStudy);
  const invalid = backup.parseUserBackup({ format: backup.BACKUP_FORMAT, version: backup.BACKUP_VERSION, data: {
    ...restored.state, generalKnowledgeStudy: { ...state.generalKnowledgeStudy, answers: 'invalid' },
  } });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /备份/);
});
