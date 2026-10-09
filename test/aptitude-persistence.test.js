import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudyState } from '../src/science/persistence.js';

const persistence = await import('../src/aptitude/persistence.js').catch(() => ({}));
const moduleIds = ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis'];

test('old records and malformed module maps normalize to five isolated empty states', () => {
  const normalized = normalizeStudyState({ aptitudeModuleStudies: { unknown: { sessions: [{ id: 'foreign' }] } } });
  assert.deepEqual(Object.keys(normalized.aptitudeModuleStudies).sort(), [...moduleIds].sort());
  for (const id of moduleIds) {
    assert.deepEqual(normalized.aptitudeModuleStudies[id], {
      moduleId: id, knowledgeProgress: {}, sessions: [], answers: [], mistakes: {},
      favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
    });
  }
});

test('valid module history is retained and foreign-module events are discarded', () => {
  const normalized = persistence.normalizeAptitudeModuleStudies({
    verbal: {
      moduleId: 'verbal', knowledgeProgress: { 'verbal:reading': { status: 'learning' } },
      sessions: [
        { id: 'verbal-session', moduleId: 'verbal', status: 'completed' },
        { id: 'reasoning-session', moduleId: 'reasoning', status: 'completed' },
      ],
      answers: [
        { id: 'verbal-answer', moduleId: 'verbal', questionId: 'shared-id' },
        { id: 'reasoning-answer', moduleId: 'reasoning', questionId: 'shared-id' },
      ],
      mistakes: {
        'shared-id': { moduleId: 'verbal', count: 1 },
        'other-id': { moduleId: 'reasoning', count: 1 },
      },
      favorites: ['shared-id', 'shared-id', 7],
      favoriteKnowledgePointIds: ['verbal:reading'], unclearKnowledgePointIds: [],
    },
    unknown: { sessions: [{ id: 'not-registered' }] },
  });

  assert.deepEqual(Object.keys(normalized).sort(), [...moduleIds].sort());
  assert.deepEqual(normalized.verbal.sessions.map((item) => item.id), ['verbal-session']);
  assert.deepEqual(normalized.verbal.answers.map((item) => item.id), ['verbal-answer']);
  assert.deepEqual(normalized.verbal.mistakes, { 'shared-id': { moduleId: 'verbal', count: 1 } });
  assert.deepEqual(normalized.verbal.favorites, ['shared-id']);
  assert.deepEqual(normalized.verbal.favoriteKnowledgePointIds, ['verbal:reading']);
  assert.deepEqual(normalized.reasoning.answers, []);
});

test('knowledge state and favorites update only the selected module', () => {
  let studies = persistence.normalizeAptitudeModuleStudies();
  studies = persistence.setAptitudeModulePointStatus(studies, 'verbal', 'verbal:reading', 'learning', '2026-10-09T00:00:00.000Z');
  studies = persistence.setAptitudeModulePointStatus(studies, 'verbal', 'verbal:reading', 'completed', '2026-10-10T00:00:00.000Z');
  studies = persistence.toggleAptitudeModulePointFlag(studies, 'verbal', 'verbal:reading', 'favorite');
  studies = persistence.toggleAptitudeModulePointFlag(studies, 'verbal', 'verbal:reading', 'unclear');
  studies = persistence.toggleAptitudeModuleFavorite(studies, 'verbal', 'verbal-q-1');

  assert.deepEqual(studies.verbal.knowledgeProgress['verbal:reading'], {
    status: 'completed', startedAt: '2026-10-09T00:00:00.000Z',
    lastViewedAt: '2026-10-10T00:00:00.000Z', completedAt: '2026-10-10T00:00:00.000Z',
  });
  assert.deepEqual(studies.verbal.favoriteKnowledgePointIds, ['verbal:reading']);
  assert.deepEqual(studies.verbal.unclearKnowledgePointIds, ['verbal:reading']);
  assert.deepEqual(studies.verbal.favorites, ['verbal-q-1']);
  assert.deepEqual(studies.reasoning.favorites, []);
});

test('module state actions reject unknown IDs, points, statuses, and flags', () => {
	assert.throws(() => persistence.emptyAptitudeModuleStudy('science'), /独立学习状态/);
  assert.throws(() => persistence.setAptitudeModulePointStatus({}, 'verbal', '', 'completed'), /知识点编号/);
  assert.throws(() => persistence.setAptitudeModulePointStatus({}, 'verbal', 'v:1', 'unknown'), /状态/);
  assert.throws(() => persistence.toggleAptitudeModulePointFlag({}, 'verbal', 'v:1', 'unknown'), /标记类型/);
  assert.throws(() => persistence.toggleAptitudeModuleFavorite({}, 'science', 'q-1'), /独立学习状态/);
});
