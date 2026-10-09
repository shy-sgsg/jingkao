import test from 'node:test';
import assert from 'node:assert/strict';

const sessions = await import('../src/general-knowledge/sessions.js').catch(() => ({}));
const analytics = await import('../src/general-knowledge/analytics.js').catch(() => ({}));
const bank = [
  { id: 'gk-q1', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:civil-law', knowledgePointIds: ['law:civil-code-basics'], stem: '依据现行《民法典》，以下哪项正确？', options: [{ id: 'A', text: '甲' }, { id: 'B', text: '乙' }], correctAnswer: 'A', explanation: '该项符合题目所述规则。', sourceType: 'official_outline_example', publishStatus: 'published' },
  { id: 'gk-q2', moduleId: 'general_knowledge', subjectId: 'beijing', topicId: 'beijing:local-governance', knowledgePointIds: ['beijing:12345-response'], stem: '关于接诉即办，下列哪项最符合条例机制？', options: [{ id: 'A', text: '只登记不反馈' }, { id: 'B', text: '快速响应并及时反馈' }], correctAnswer: 'B', explanation: '条例明确快速响应、高效办理、及时反馈和主动治理。', sourceType: 'original', publishStatus: 'published' },
  { id: 'gk-q3', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:basics', knowledgePointIds: ['economy:opportunity-cost'], stem: '机会成本指什么？', options: [{ id: 'A', text: '放弃的最佳替代选择价值' }, { id: 'B', text: '全部现金支出' }], correctAnswer: 'A', explanation: '机会成本强调被放弃的最佳替代用途。', sourceType: 'third_party_mock', publishStatus: 'published' },
];

test('practice answers save module identity, source, and wrong-book records without touching science state', () => {
  assert.equal(typeof sessions.createGeneralKnowledgeSession, 'function');
  let state = { scienceStudy: { answers: [{ id: 'science-a', moduleId: 'science_reasoning' }] }, generalKnowledgeStudy: {} };
  const started = sessions.createGeneralKnowledgeSession(bank, state.generalKnowledgeStudy, { targetQuestionCount: 2 }, { id: 'practice-gk', now: '2026-10-09T10:00:00.000Z' });
  assert.equal(started.session.moduleId, 'general_knowledge');
  assert.deepEqual(started.session.questionIds, ['gk-q1', 'gk-q3'], 'official examples and then third-party sources precede original supplements');
  state.generalKnowledgeStudy = sessions.answerGeneralKnowledgeQuestion(bank, started.generalKnowledgeStudy, started.session.id, 'B', { now: '2026-10-09T10:01:00.000Z' });
  const answer = state.generalKnowledgeStudy.answers[0];
  assert.equal(answer.moduleId, 'general_knowledge');
  assert.equal(answer.isCorrect, false);
  assert.equal(state.generalKnowledgeStudy.mistakes['gk-q1'].moduleId, 'general_knowledge');
  assert.deepEqual(state.scienceStudy.answers.map((item) => item.id), ['science-a']);
});

test('practice progress counts each question once and exam score separates unanswered from answered accuracy', () => {
  let state = {};
  const started = sessions.createGeneralKnowledgeSession(bank, state, {
    mode: 'exam', targetQuestionCount: 2, durationSeconds: 120,
  }, { id: 'exam-gk', now: '2026-10-09T10:00:00.000Z' });
  state = sessions.selectGeneralKnowledgeAnswer(bank, started.generalKnowledgeStudy, started.session.id, 'A', { now: '2026-10-09T10:01:00.000Z' });
  state = sessions.finishGeneralKnowledgeSession(bank, state, started.session.id, { now: '2026-10-09T10:02:00.000Z' });
  const stats = analytics.getGeneralKnowledgeStats(state, bank);
  assert.equal(stats.exam.questionCount, 2);
  assert.equal(stats.exam.answeredCount, 1);
  assert.equal(stats.exam.unansweredCount, 1);
  assert.equal(stats.exam.scoreRate, 0.5);
  assert.equal(stats.exam.answeredAccuracy, 1);
  assert.equal(stats.practice.attemptedCount, 0);
  assert.equal(state.sessions[0].moduleId, 'general_knowledge');
  assert.equal(state.answers[0].moduleId, 'general_knowledge');
});

test('favorite-only practice selects only questions in the general-knowledge favorite list', () => {
  const state = sessions.toggleGeneralKnowledgeFavorite({}, 'gk-q3');
  const started = sessions.createGeneralKnowledgeSession(bank, state, {
    targetQuestionCount: 1, onlyFavorites: true,
  }, { id: 'favorite-gk', now: '2026-10-09T10:00:00.000Z' });
  assert.deepEqual(started.session.questionIds, ['gk-q3']);
});
