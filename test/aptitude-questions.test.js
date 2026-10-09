import test from 'node:test';
import assert from 'node:assert/strict';
import { getAptitudeModuleContent, findAptitudeModuleKnowledgePoint } from '../src/aptitude/content.js';
import { normalizeAptitudeModuleStudies } from '../src/aptitude/persistence.js';
import { createAptitudeModuleSession } from '../src/aptitude/sessions.js';

const questions = await import('../src/aptitude/questions.js').catch(() => ({}));

test('existing science and general knowledge banks are exposed as published aptitude questions', () => {
  assert.equal(typeof questions.getAptitudeQuestions, 'function');
  const science = questions.getAptitudeQuestions('science');
  const generalKnowledge = questions.getAptitudeQuestions('general-knowledge');
  assert.ok(science.some((question) => question.id === 'science-physics-001'));
  assert.ok(generalKnowledge.some((question) => question.id === 'gk-official-2026-fermentation'));
  assert.ok([...science, ...generalKnowledge].every((question) => question.publishStatus === 'published'));
});

test('five general aptitude modules publish usable questions linked to their knowledge outlines', () => {
  assert.equal(typeof questions.getAptitudeSessionQuestions, 'function');
  const expectedCounts = {
    'political-theory': 12,
    verbal: 13,
    quantitative: 13,
    reasoning: 11,
    'data-analysis': 12,
  };
  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const content = getAptitudeModuleContent(moduleId);
    const points = content.directory.flatMap((subject) => (subject.topics || []).flatMap((topic) => topic.knowledgePoints || []));
    const topics = content.directory.flatMap((subject) => subject.topics || []);
    const bank = questions.getAptitudeQuestions(moduleId);
    const originals = bank.filter((question) => question.sourceType === 'original');
    assert.equal(originals.length, expectedCounts[moduleId], `${moduleId} should retain its complete prepared original set`);
    assert.ok(bank.every((question) => question.moduleId === moduleId
      && question.publishStatus === 'published'
      && question.verificationStatus === 'verified'
      && question.sourceTitle
      && question.sourceNote
      && question.options.length === 4
      && question.options.some((option) => option.id === question.correctAnswer)
      && question.explanation), `${moduleId} published questions should have complete, source-labeled answer data`);
    for (const question of bank) {
      const [pointId] = question.knowledgePointIds;
      const entry = findAptitudeModuleKnowledgePoint(content, pointId);
      assert.ok(entry, `${moduleId}/${question.id} should point to a visible knowledge outline`);
      assert.equal(question.subjectId, entry.subject.id);
      assert.equal(question.topicId, entry.topic.id);
      assert.equal(question.topicTitle, entry.topic.title);
      assert.equal(points.find((point) => point.id === pointId)?.id, pointId);
      assert.ok(topics.some((topic) => questions.getAptitudeQuestions(moduleId, { knowledgePointId: pointId }).includes(question)));
    }

    const practice = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), moduleId, {
      mode: 'practice', targetQuestionCount: 1,
    }, { id: `${moduleId}-published-practice`, now: '2026-10-09T00:00:00.000Z' });
    const mock = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), moduleId, {
      mode: 'exam', targetQuestionCount: 1, durationSeconds: 60,
    }, { id: `${moduleId}-published-exam`, now: '2026-10-09T00:00:00.000Z' });
    assert.equal(practice.session.mode, 'practice');
    assert.equal(practice.session.moduleId, moduleId);
    assert.equal(practice.session.questionIds.length, 1);
    assert.equal(mock.session.mode, 'exam');
    assert.equal(mock.session.moduleId, moduleId);
    assert.equal(mock.session.questionIds.length, 1);

    const legacyReview = questions.getAptitudeSessionQuestions(moduleId, [`apt-${moduleId}-001`]);
    assert.equal(legacyReview.length, 1, `${moduleId} should resolve a question already used by a stored session`);
    assert.equal(legacyReview[0].moduleId, moduleId);
    assert.ok(legacyReview[0].explanation);
  }
  assert.equal(questions.getAptitudeQuestions('verbal', { sourceType: 'third_party_mock' }).length, 0);
  assert.deepEqual(questions.getAptitudeSessionQuestions('verbal', ['unpublished-question']), []);
  assert.equal(questions.getAptitudeQuestions('reasoning').some((question) => question.id === 'apt-reasoning-008'), false);
  assert.equal(questions.getAptitudeSessionQuestions('reasoning', ['apt-reasoning-008'])[0]?.moduleId, 'reasoning');
  assert.equal(questions.getAptitudeQuestions('quantitative').some((question) => question.id === 'apt-quantitative-013'), true);
  assert.throws(() => questions.getAptitudeQuestions('unknown'), /module/i);
});

test('question filters apply to the selected module bank', () => {
  const originals = questions.getAptitudeQuestions('science', { sourceType: 'original' });
  assert.ok(originals.length > 0);
  assert.ok(originals.every((question) => question.sourceType === 'original'));
  const physics = questions.getAptitudeQuestions('science', { subjectId: 'physics' });
  assert.ok(physics.length > 0);
  assert.ok(physics.every((question) => question.subjectId === 'physics'));
});
