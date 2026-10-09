import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APTITUDE_MODULES, resolveAptitudeModuleRoute } from '../src/aptitude/modules.js';
import { getAptitudeModuleContent } from '../src/aptitude/content.js';
import { getAptitudeQuestions } from '../src/aptitude/questions.js';
import { getAptitudeModuleStats } from '../src/aptitude/analytics.js';
const launch = await import('../src/aptitude/launch.js').catch(() => ({}));
const { findAptitudeModuleKnowledgePoint } = await import('../src/aptitude/content.js').catch(() => ({}));

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

test('all five general modules retain empty optional lessons and empty reserved question banks', () => {
  const emptyModules = APTITUDE_MODULES.filter((module) => module.studyStore === 'aptitudeModuleStudies');
  assert.equal(emptyModules.length, 5);
  for (const module of emptyModules) {
    assert.deepEqual(getAptitudeModuleContent(module.id), { directory: [], lessons: {} });
    assert.deepEqual(getAptitudeQuestions(module.id), [], `${module.id} should expose an empty question provider`);
  }
  assert.ok(getAptitudeModuleContent('science').directory.length > 0);
  assert.ok(getAptitudeModuleContent('general-knowledge').directory.length > 0);
  const synthetic = getAptitudeModuleContent('verbal', {
    directory: [{ id: 'reading', title: '言语', topics: [{
      id: 'reading:center', title: '中心理解', knowledgePoints: [
        { id: 'reading:main-idea', title: '主旨概括', contentStatus: 'published' },
      ],
    }] }],
    lessons: { 'reading:main-idea': { explanation: 'test-only lesson' } },
  });
  assert.equal(synthetic.directory[0].topics[0].id, 'reading:center');
  assert.equal(synthetic.lessons['reading:main-idea'].explanation, 'test-only lesson');
  assert.equal(typeof findAptitudeModuleKnowledgePoint, 'function');
  assert.deepEqual(findAptitudeModuleKnowledgePoint(synthetic, 'reading:main-idea'), {
    subject: synthetic.directory[0],
    topic: synthetic.directory[0].topics[0],
    point: synthetic.directory[0].topics[0].knowledgePoints[0],
    lesson: synthetic.lessons['reading:main-idea'],
  });
  assert.equal(findAptitudeModuleKnowledgePoint(synthetic, 'missing-point'), null);
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
  assert.match(app, /站内作答与手动记录/);
  assert.match(app, /data-section="aptitude-module-plan"/);
  assert.match(app, /function renderAptitudeModuleLesson\(/);
  assert.match(app, /function openAptitudeModulePracticeSetup\(/);
  assert.match(app, /form\.id === 'aptitude-module-session-setup'/);
});

test('the overview reserves launch actions and disables modules with empty question banks', () => {
  assert.equal(typeof launch.getAptitudeModuleLaunchAction, 'function');
  assert.equal(typeof launch.renderAptitudeModuleLaunchButtons, 'function');
  for (const module of APTITUDE_MODULES) {
    const practice = launch.getAptitudeModuleLaunchAction(module.id, 'practice');
    const exam = launch.getAptitudeModuleLaunchAction(module.id, 'exam');
    const buttons = launch.renderAptitudeModuleLaunchButtons(module.id);
    assert.equal(practice.mode, 'practice');
    assert.equal(exam.mode, 'exam');
    assert.match(buttons, /自由刷题/);
    assert.match(buttons, /模考刷题/);
    assert.match(buttons, /data-mode="practice"/);
    assert.match(buttons, /data-mode="exam"/);
    const expectedUnavailable = ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis'].includes(module.id);
    assert.equal(/disabled aria-disabled="true"/.test(buttons), expectedUnavailable, `${module.id} launch availability should follow its question provider`);
  }
  assert.deepEqual(launch.getAptitudeModuleLaunchAction('science', 'exam'), {
    action: 'open-science-practice', moduleId: 'science', mode: 'exam',
  });
  assert.deepEqual(launch.getAptitudeModuleLaunchAction('general-knowledge', 'practice'), {
    action: 'open-general-knowledge-practice', moduleId: 'general-knowledge', mode: 'practice',
  });
  assert.deepEqual(launch.getAptitudeModuleLaunchAction('verbal', 'practice'), {
    action: 'open-aptitude-module-practice', moduleId: 'verbal', mode: 'practice',
  });
  assert.throws(() => launch.getAptitudeModuleLaunchAction('unknown', 'practice'), /module/i);
  assert.throws(() => launch.getAptitudeModuleLaunchAction('verbal', 'knowledge'), /启动方式/);
});
