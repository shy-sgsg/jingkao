import test from 'node:test';
import assert from 'node:assert/strict';
import { createScienceSession, answerScienceQuestion, continueScienceSession, expireScienceSession, finishExamSession, getScienceStats, goToExamQuestion, selectExamAnswer } from '../src/science/sessions.js';

const bank = [
  { id: 'q-1', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:buoyancy'], difficulty: 'easy', sourceType: 'original', region: 'general', examYear: null, publishStatus: 'published', options: [{ id: 'A' }, { id: 'B' }], correctAnswer: 'B' },
  { id: 'q-2', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:buoyancy'], difficulty: 'medium', sourceType: 'original', region: 'general', examYear: null, publishStatus: 'published', options: [{ id: 'A' }, { id: 'B' }], correctAnswer: 'A' },
];

const emptyStudy = () => ({ knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [] });

test('science sessions respect plan task filters and retain an exam deadline', () => {
  const study = emptyStudy();
  const result = createScienceSession(bank, study, {
    mode: 'exam', subjectId: 'physics', knowledgePointIds: ['physics:buoyancy'],
    targetQuestionCount: 2, durationSeconds: 120, planTaskId: 'task-1',
  }, { id: 'session-1', now: '2026-10-09T00:00:00.000Z' });

  assert.equal(result.session.status, 'active');
  assert.deepEqual(result.session.questionIds, ['q-1', 'q-2']);
  assert.equal(result.session.deadline, '2026-10-09T00:02:00.000Z');
  assert.equal(result.session.planTaskId, 'task-1');
});

test('free practice randomizes across all published source types', () => {
  const sourceBank = [
    { ...bank[0], id: 'original-first' },
    { ...bank[0], id: 'agency-mock', sourceType: 'third_party_mock' },
    { ...bank[0], id: 'recalled', sourceType: 'recalled' },
    { ...bank[0], id: 'official', sourceType: 'official_outline_example' },
  ];
  const { session } = createScienceSession(sourceBank, emptyStudy(), {
    mode: 'practice', targetQuestionCount: 4,
  }, { id: 'source-priority', now: '2026-10-09T00:00:00.000Z' });

  assert.deepEqual([...session.questionIds].sort(), ['agency-mock', 'official', 'original-first', 'recalled']);
  const originalsOnly = createScienceSession(sourceBank, emptyStudy(), {
    mode: 'practice', targetQuestionCount: 1, sourceFilter: 'original',
  }, { id: 'existing-original', now: '2026-10-09T00:00:00.000Z' });
  assert.deepEqual(originalsOnly.session.questionIds, ['original-first']);
});

test('continuing a linked plan task can exclude questions it already counted', () => {
  const { session } = createScienceSession(bank, emptyStudy(), {
    mode: 'practice', targetQuestionCount: 1, subjectId: 'physics', excludeQuestionIds: ['q-1'],
  }, { id: 'session-next-set', now: '2026-10-09T00:00:00.000Z' });

  assert.deepEqual(session.questionIds, ['q-2']);
});

test('answers are recorded once, mistakes accumulate, and a session completes after review', () => {
  const study = emptyStudy();
  const { scienceStudy: started, session } = createScienceSession(bank, study, {
    mode: 'practice', targetQuestionCount: 2, subjectId: 'physics',
  }, { id: 'session-2', now: '2026-10-09T00:00:00.000Z' });
  const firstQuestion = bank.find((question) => question.id === session.questionIds[0]);
  const firstWrongOption = firstQuestion.correctAnswer === 'A' ? 'B' : 'A';
  const first = answerScienceQuestion(bank, started, session.id, firstWrongOption, { now: '2026-10-09T00:00:20.000Z' });

  assert.equal(first.answer.isCorrect, false);
  assert.equal(first.scienceStudy.mistakes[firstQuestion.id].count, 1);
  assert.equal(first.scienceStudy.sessions[0].currentIndex, 0);
  assert.throws(() => answerScienceQuestion(bank, first.scienceStudy, session.id, 'B'), /尚未完成上一题复盘/);

  const continued = continueScienceSession(bank, first.scienceStudy, session.id);
  assert.equal(continued.sessions[0].currentIndex, 1);
  const secondQuestion = bank.find((question) => question.id === session.questionIds[1]);
  const second = answerScienceQuestion(bank, continued, session.id, secondQuestion.correctAnswer, { now: '2026-10-09T00:00:40.000Z' });
  const finished = continueScienceSession(bank, second.scienceStudy, session.id, { now: '2026-10-09T00:00:41.000Z' });

  assert.equal(finished.sessions[0].status, 'completed');
  assert.equal(finished.sessions[0].correctCount, 1);
  assert.equal(getScienceStats(finished).accuracy, 0.5);
  assert.equal(finished.answers.length, 2);
});

test('science statistics leave unattempted questions unscored', () => {
  assert.deepEqual(getScienceStats(emptyStudy()), {
    sessionCount: 0, completedSessionCount: 0, attemptedCount: 0, correctCount: 0,
    accuracy: null,
    practice: { sessionCount: 0, attemptedCount: 0, correctCount: 0, accuracy: null },
    exam: { sessionCount: 0, completedSessionCount: 0, questionCount: 0, answeredCount: 0, correctCount: 0, unansweredCount: 0, scoreRate: null, answeredAccuracy: null },
    mistakeCount: 0, favoriteCount: 0,
  });
});

test('expired exam sessions are timed out and cannot be completed by a late answer', () => {
  const { scienceStudy, session } = createScienceSession(bank, emptyStudy(), {
    mode: 'exam', targetQuestionCount: 2, durationSeconds: 60,
  }, { id: 'session-expired', now: '2026-10-09T00:00:00.000Z' });
  const timedOut = expireScienceSession(bank, scienceStudy, session.id, { now: '2026-10-09T00:01:00.000Z' });

  assert.equal(timedOut.sessions[0].status, 'timed_out');
  assert.throws(() => answerScienceQuestion(bank, scienceStudy, session.id, 'A', { now: '2026-10-09T00:01:00.000Z' }), /考试时间已结束/);
});

test('formal exams allow skips and answer changes, reveal no score until submit, and isolate score rate', () => {
  const { scienceStudy, session } = createScienceSession(bank, emptyStudy(), {
    mode: 'exam', targetQuestionCount: 2, durationSeconds: 300,
  }, { id: 'session-formal', now: '2026-10-09T00:00:00.000Z' });
  const selected = selectExamAnswer(bank, scienceStudy, session.id, 'A', { now: '2026-10-09T00:00:10.000Z' });
  const revised = selectExamAnswer(bank, selected, session.id, 'B', { now: '2026-10-09T00:00:20.000Z' });
  const skipped = goToExamQuestion(revised, session.id, 1);
  const submitted = finishExamSession(bank, skipped, session.id, { now: '2026-10-09T00:01:00.000Z' });

  assert.equal(submitted.sessions[0].status, 'completed');
  assert.equal(submitted.sessions[0].correctCount, 1);
  assert.equal(submitted.sessions[0].answeredCount, 1);
  assert.equal(submitted.sessions[0].unansweredCount, 1);
  assert.equal(submitted.sessions[0].scoreRate, 0.5);
  assert.equal(submitted.sessions[0].answeredAccuracy, 1);
  assert.equal(submitted.answers.length, 1);
  assert.equal(submitted.answers[0].selectedOptionId, 'B');
  assert.equal(getScienceStats(submitted).exam.scoreRate, 0.5);
  assert.equal(getScienceStats(submitted).practice.accuracy, null);
  assert.deepEqual(finishExamSession(bank, submitted, session.id), submitted, 'repeated submission does not duplicate results');
});
