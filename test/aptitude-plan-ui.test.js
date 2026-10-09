import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('plan task types and module links are derived from the aptitude registry', () => {
  assert.match(app, /APTITUDE_MODULES\.map\(\(module\) => \[module\.taskType/);
  assert.match(app, /getAptitudeModuleForTaskType\(task\.taskType\)/);
  assert.match(app, /aptitudeModule\.route.*task=/);
  assert.match(app, /getAptitudeModuleTaskProgress\(task, storage\.aptitudeModuleStudies/);
});

test('new aptitude module tasks expose shared configurable filters and persist aptitudeConfig', () => {
  assert.match(app, /data-aptitude-config/);
  assert.match(app, /name="aptitudeActivityType"/);
  assert.match(app, /name="aptitudeSubjectId"/);
  assert.match(app, /name="aptitudeTopicId"/);
  assert.match(app, /name="aptitudeKnowledgePointIds"/);
  assert.match(app, /name="aptitudeTargetQuestionCount"/);
  assert.match(app, /name="aptitudeDurationMinutes"/);
  assert.match(app, /name="aptitudeSourceFilter"/);
  assert.match(app, /name="aptitudeDifficultyFilter"/);
  assert.match(app, /aptitudeConfig,/);
});
