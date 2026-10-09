import test from 'node:test';
import assert from 'node:assert/strict';

const questions = await import('../src/aptitude/questions.js').catch(() => ({}));

test('existing science and general knowledge banks are exposed as published aptitude questions', () => {
  assert.equal(typeof questions.getAptitudeQuestions, 'function');
  const science = questions.getAptitudeQuestions('science');
  const generalKnowledge = questions.getAptitudeQuestions('general-knowledge');
  assert.ok(science.some((question) => question.id === 'science-physics-001'));
  assert.ok(generalKnowledge.some((question) => question.id === 'gk-official-2026-fermentation'));
  assert.ok([...science, ...generalKnowledge].every((question) => question.publishStatus === 'published'));
});

test('general aptitude question providers are reserved and empty while legacy sessions remain reviewable', () => {
  assert.equal(typeof questions.getAptitudeSessionQuestions, 'function');
  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const bank = questions.getAptitudeQuestions(moduleId);
    assert.deepEqual(bank, [], `${moduleId} should reserve its provider without publishing question content`);
    const legacyReview = questions.getAptitudeSessionQuestions(moduleId, [`apt-${moduleId}-001`]);
    assert.equal(legacyReview.length, 1, `${moduleId} should resolve a question already used by a stored session`);
    assert.equal(legacyReview[0].moduleId, moduleId);
    assert.ok(legacyReview[0].explanation);
  }
  assert.deepEqual(questions.getAptitudeQuestions('verbal', { sourceType: 'third_party_mock' }), []);
  assert.deepEqual(questions.getAptitudeSessionQuestions('verbal', ['unpublished-question']), []);
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
