import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('science navigation resolves to the dedicated science page', () => {
  assert.ok(app.includes('science: renderScience'), 'the science route must map to its dedicated page');
});

test('science exam clock follows the exact session in the route', () => {
  const clock = app.slice(app.indexOf('function startScienceExamClock()'), app.indexOf('function syncSciencePlanTaskCompletion'));
  assert.match(clock, /activeScienceSessionId/);
});

test('free science practice opens the session it just created', () => {
  assert.ok(app.includes("navigate('science', `session=${encodeURIComponent(started.session.id)}`)"));
});

test('task-linked science results return to the study plan', () => {
  assert.ok(app.includes("session.planTaskId ? '#/plan' : '#/aptitude/science'"));
  assert.ok(app.includes('markPlanTaskInProgress'));
  assert.ok(app.includes('getPlanTaskProgress'));
  assert.ok(app.includes('progress.remainingCount'));
  assert.ok(app.includes('reconcileSciencePlanTaskProgress'));
});

test('adapted recalled questions show that the displayed wording was restated', () => {
  assert.ok(app.includes("presentationMode === 'adapted'"));
  assert.ok(app.includes('题意重述'));
});

test('science knowledge page actions persist learning progress and flags', () => {
  assert.ok(app.includes("if (action === 'start-science-knowledge')"));
  assert.ok(app.includes("action === 'toggle-science-knowledge-favorite' || action === 'toggle-science-knowledge-unclear'"));
  assert.ok(app.includes('setKnowledgePointStatus(storage.scienceStudy'));
  assert.ok(app.includes('toggleKnowledgePointFlag(storage.scienceStudy'));
});
