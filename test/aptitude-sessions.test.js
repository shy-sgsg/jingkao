import test from 'node:test';
import assert from 'node:assert/strict';
import { getAptitudeQuestions } from '../src/aptitude/questions.js';
const persistence = await import('../src/aptitude/persistence.js').catch(() => ({}));
const sessions = await import('../src/aptitude/sessions.js').catch(() => ({}));
const { normalizeAptitudeModuleStudies } = persistence;
const {
  answerAptitudeModuleQuestion,
  continueAptitudeModuleSession,
  createAptitudeModuleSession,
  finishAptitudeModuleSession,
  goToAptitudeModuleQuestion,
  selectAptitudeModuleAnswer,
} = sessions;

function question(id, moduleId, correctAnswer = 'B') {
  return {
    id, moduleId, subjectId: moduleId, topicId: `${moduleId}:topic`,
    knowledgePointIds: [`${moduleId}:point`], difficulty: 'easy', sourceType: 'original',
    publishStatus: 'published', stem: 'Question stem', correctAnswer, explanation: 'Explanation',
    options: [{ id: 'A', text: 'Option A' }, { id: 'B', text: 'Option B' }],
  };
}

test('practice answers, feedback, mistakes, and completion stay in the selected module', () => {
  assert.equal(typeof createAptitudeModuleSession, 'function');
  const bank = [question('shared-question', 'verbal')];
  const started = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), 'verbal', {
    mode: 'practice', targetQuestionCount: 1,
  }, { id: 'verbal-practice', now: '2026-10-09T00:00:00.000Z' });
  assert.equal(started.session.moduleId, 'verbal');

  const answered = answerAptitudeModuleQuestion(bank, started.aptitudeModuleStudies, 'verbal', 'verbal-practice', 'A', {
    now: '2026-10-09T00:00:05.000Z',
  });
  assert.equal(answered.verbal.answers[0].moduleId, 'verbal');
  assert.equal(answered.verbal.answers[0].isCorrect, false);
  assert.equal(answered.verbal.mistakes['shared-question'].count, 1);
  const completed = continueAptitudeModuleSession(bank, answered, 'verbal', 'verbal-practice', {
    now: '2026-10-09T00:00:10.000Z',
  });
  assert.equal(completed.verbal.sessions[0].status, 'completed');
  assert.deepEqual(completed.reasoning.answers, []);
});

test('an empty supplied question bank cannot create a session or progress', () => {
  const before = normalizeAptitudeModuleStudies();
  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    assert.throws(() => createAptitudeModuleSession([], before, moduleId, {
      mode: 'practice', targetQuestionCount: 1,
    }, { id: `${moduleId}-empty-session`, now: '2026-10-09T00:00:00.000Z' }), /0 道/);
    assert.deepEqual(before[moduleId].sessions, []);
    assert.deepEqual(before[moduleId].answers, []);
  }
});

test('each published module question bank starts both practice and timed mock sessions', () => {
  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const bank = getAptitudeQuestions(moduleId);
    assert.ok(bank.length > 0, `${moduleId} should have published questions`);
    const practice = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), moduleId, {
      mode: 'practice', targetQuestionCount: 1,
    }, { id: `${moduleId}-real-practice`, now: '2026-10-09T00:00:00.000Z' });
    const exam = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), moduleId, {
      mode: 'exam', targetQuestionCount: 1, durationSeconds: 60,
    }, { id: `${moduleId}-real-exam`, now: '2026-10-09T00:00:00.000Z' });
    assert.equal(practice.session.moduleId, moduleId);
    assert.equal(practice.session.mode, 'practice');
    assert.equal(practice.session.questionIds.length, 1);
    assert.equal(exam.session.moduleId, moduleId);
    assert.equal(exam.session.mode, 'exam');
    assert.equal(exam.session.questionIds.length, 1);
  }
});

test('free practice samples a randomized question order instead of the bank prefix', () => {
  const bank = [question('random-q1', 'verbal'), question('random-q2', 'verbal'), question('random-q3', 'verbal')];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const started = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), 'verbal', {
      mode: 'practice', targetQuestionCount: 2, randomize: false,
    }, { id: 'verbal-random-practice', now: '2026-10-09T00:00:00.000Z' });

    assert.deepEqual(started.session.questionIds, ['random-q2', 'random-q3']);
  } finally {
    Math.random = originalRandom;
  }
});

test('timed mock supports answer changes, navigation, one-time submission, and module-tagged results', () => {
  assert.equal(typeof finishAptitudeModuleSession, 'function');
  const bank = [question('reasoning-q1', 'reasoning', 'A'), question('reasoning-q2', 'reasoning', 'B')];
  const started = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), 'reasoning', {
    mode: 'exam', targetQuestionCount: 2, durationSeconds: 120,
  }, { id: 'reasoning-exam', now: '2026-10-09T00:00:00.000Z' });
  let studies = selectAptitudeModuleAnswer(bank, started.aptitudeModuleStudies, 'reasoning', 'reasoning-exam', 'B', {
    now: '2026-10-09T00:00:05.000Z',
  });
  studies = goToAptitudeModuleQuestion(studies, 'reasoning', 'reasoning-exam', 1);
  studies = selectAptitudeModuleAnswer(bank, studies, 'reasoning', 'reasoning-exam', 'A', {
    now: '2026-10-09T00:00:10.000Z',
  });
  let finished = finishAptitudeModuleSession(bank, studies, 'reasoning', 'reasoning-exam', {
    now: '2026-10-09T00:00:30.000Z',
  });
  assert.equal(finished.reasoning.sessions[0].status, 'completed');
  assert.equal(finished.reasoning.sessions[0].correctCount, 0);
  assert.ok(finished.reasoning.answers.every((answer) => answer.moduleId === 'reasoning'));
  assert.equal(finished.reasoning.mistakes['reasoning-q1'].count, 1);
  assert.equal(finished.reasoning.mistakes['reasoning-q2'].count, 1);

  finished = finishAptitudeModuleSession(bank, finished, 'reasoning', 'reasoning-exam', {
    now: '2026-10-09T00:00:40.000Z',
  });
  assert.equal(finished.reasoning.answers.length, 2);
  assert.deepEqual(finished.verbal.answers, []);
});

test('timed sessions expire once and empty or foreign-module banks create no sessions', () => {
  assert.equal(typeof continueAptitudeModuleSession, 'function');
  const bank = [question('timed-q1', 'quantitative')];
  const started = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), 'quantitative', {
    mode: 'exam', targetQuestionCount: 1, durationSeconds: 60,
  }, { id: 'quant-expiring', now: '2026-10-09T00:00:00.000Z' });
  const expired = continueAptitudeModuleSession(bank, started.aptitudeModuleStudies, 'quantitative', 'quant-expiring', {
    now: '2026-10-09T00:02:00.000Z',
  });
  assert.equal(expired.quantitative.sessions[0].status, 'timed_out');
  assert.deepEqual(expired.quantitative.answers, []);

  const before = normalizeAptitudeModuleStudies();
  assert.throws(() => createAptitudeModuleSession([], before, 'verbal', {
    mode: 'practice', targetQuestionCount: 1,
  }, { id: 'empty-bank', now: '2026-10-09T00:00:00.000Z' }), /0 道/);
  assert.throws(() => createAptitudeModuleSession([question('wrong-owner', 'reasoning')], before, 'verbal', {
    mode: 'practice', targetQuestionCount: 1,
  }, { id: 'foreign-bank', now: '2026-10-09T00:00:00.000Z' }), /0 道/);
  assert.deepEqual(before.verbal.sessions, []);
});

test('matching question IDs in separate module banks cannot share answers or mistakes', () => {
  assert.equal(typeof answerAptitudeModuleQuestion, 'function');
  const before = normalizeAptitudeModuleStudies();
  const verbalBank = [question('same-id', 'verbal')];
  const reasoningBank = [question('same-id', 'reasoning')];
  const verbalSession = createAptitudeModuleSession(verbalBank, before, 'verbal', {
    mode: 'practice', targetQuestionCount: 1,
  }, { id: 'same-id-verbal', now: '2026-10-09T00:00:00.000Z' });
  const reasoningSession = createAptitudeModuleSession(reasoningBank, verbalSession.aptitudeModuleStudies, 'reasoning', {
    mode: 'practice', targetQuestionCount: 1,
  }, { id: 'same-id-reasoning', now: '2026-10-09T00:00:00.000Z' });
  const submitted = answerAptitudeModuleQuestion(verbalBank, reasoningSession.aptitudeModuleStudies, 'verbal', 'same-id-verbal', 'A', {
    now: '2026-10-09T00:00:10.000Z',
  });

  assert.deepEqual(submitted.verbal.answers.map((answer) => answer.moduleId), ['verbal']);
  assert.deepEqual(submitted.reasoning.answers, []);
  assert.deepEqual(Object.keys(submitted.reasoning.mistakes), []);
});

test('manual knowledge completion preserves all other module state', () => {
  const initial = normalizeAptitudeModuleStudies();
  initial.reasoning.knowledgeProgress['reasoning:logic'] = { status: 'learning' };
  initial.reasoning.sessions.push({ id: 'existing-reasoning', moduleId: 'reasoning', mode: 'practice' });
  const { aptitudeModuleStudies, session } = createAptitudeModuleSession([], initial, 'verbal', {
    mode: 'knowledge', knowledgePointId: 'verbal:reading', planTaskId: 'task-verbal',
  }, { id: 'manual-verbal', now: '2026-10-09T00:00:00.000Z' });

  assert.equal(session.completionSource, 'manual');
  assert.equal(aptitudeModuleStudies.verbal.knowledgeProgress['verbal:reading'].status, 'completed');
  assert.deepEqual(aptitudeModuleStudies.reasoning.knowledgeProgress, { 'reasoning:logic': { status: 'learning' } });
  assert.deepEqual(aptitudeModuleStudies.reasoning.sessions.map((item) => item.id), ['existing-reasoning']);
});
