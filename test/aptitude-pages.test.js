import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APTITUDE_MODULES, resolveAptitudeModuleRoute } from '../src/aptitude/modules.js';
import { getAptitudeModuleContent } from '../src/aptitude/content.js';
import { getAptitudeQuestions } from '../src/aptitude/questions.js';
import { getAptitudeModuleStats } from '../src/aptitude/analytics.js';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('new and legacy module routes resolve to the shared or existing dedicated page', () => {
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/science'), { page: 'science', moduleId: 'science' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/general-knowledge'), { page: 'generalKnowledge', moduleId: 'general-knowledge' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/module/science'), { page: 'science', moduleId: 'science' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/module/general-knowledge'), { page: 'generalKnowledge', moduleId: 'general-knowledge' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/verbal'), { page: 'aptitudeModule', moduleId: 'verbal' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/module/data-analysis'), { page: 'aptitudeModule', moduleId: 'data-analysis' });
  assert.deepEqual(resolveAptitudeModuleRoute('aptitude/unknown'), { page: 'aptitudeModule', moduleId: 'unknown' });
  assert.equal(resolveAptitudeModuleRoute('aptitude'), null);
});

test('five new content providers stay empty while existing science and general knowledge adapters remain connected', () => {
  const emptyModules = APTITUDE_MODULES.filter((module) => module.studyStore === 'aptitudeModuleStudies');
  assert.equal(emptyModules.length, 5);
  for (const module of emptyModules) {
    assert.deepEqual(getAptitudeModuleContent(module.id), { directory: [], lessons: {} });
    assert.deepEqual(getAptitudeQuestions(module.id), []);
  }
  assert.ok(getAptitudeModuleContent('science').directory.length > 0);
  assert.ok(getAptitudeModuleContent('general-knowledge').directory.length > 0);
  const synthetic = getAptitudeModuleContent('verbal', {
    directory: [{ id: 'reading', topics: [{ id: 'reading:center' }] }],
    lessons: { 'reading:main': { summary: 'test-only lesson' } },
  });
  assert.equal(synthetic.directory[0].topics[0].id, 'reading:center');
  assert.equal(synthetic.lessons['reading:main'].summary, 'test-only lesson');
});

test('module statistics count only the selected module’s own answers', () => {
  const stats = getAptitudeModuleStats('verbal', {
    sessions: [
      { id: 'v-session', moduleId: 'verbal', mode: 'practice', status: 'completed' },
      { id: 'r-session', moduleId: 'reasoning', mode: 'practice', status: 'completed' },
    ],
    answers: [
      { id: 'v-answer', moduleId: 'verbal', sessionId: 'v-session', questionId: 'shared-q', isCorrect: true },
      { id: 'r-answer', moduleId: 'reasoning', sessionId: 'r-session', questionId: 'shared-q', isCorrect: false },
    ],
  });
  assert.equal(stats.attemptedCount, 1);
  assert.equal(stats.correctCount, 1);
  assert.equal(stats.accuracy, 1);
});

test('overview and shared module page use registry routes and expose all learning sections', () => {
  assert.match(app, /resolveAptitudeModuleRoute\(routePage\)/);
  assert.match(app, /href="\$\{escapeHtml\(module\.route\)\}"/);
  assert.match(app, /APTITUDE_MODULES\.map\(\(module\) => \(\{/);
  assert.match(app, /function getAptitudeModuleOnlineStats\(/);
  assert.match(app, /题库待接入/);
  assert.match(app, /知识目录待接入/);
  assert.match(app, /错题与收藏/);
  assert.match(app, /站内作答与手动记录合并/);
  assert.match(app, /data-section="aptitude-module-plan"/);
});

test('an empty module shows disabled practice and mock controls without start actions', () => {
  assert.match(app, /button[^>]*disabled[^>]*题库待接入|button[^>]*disabled[^>]*aria-disabled="true"/);
  assert.match(app, /当前模块没有已发布题目/);
  assert.match(app, /getAptitudeQuestions\(module\.id\)/);
});
