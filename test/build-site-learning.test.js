import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, renderStandaloneRoute } from './helpers/standalone-site.js';
import { studyLogKey } from '../src/data/sync.js';
import { createPlanTask } from '../src/science/planTasks.js';
import { getAptitudeQuestions } from '../src/aptitude/questions.js';
import { getAptitudeModuleContent } from '../src/aptitude/content.js';
import { APTITUDE_MODULES } from '../src/aptitude/modules.js';
import { createAptitudeModuleSession } from '../src/aptitude/sessions.js';
import { normalizeAptitudeModuleStudies } from '../src/aptitude/persistence.js';
import { getScienceTree } from '../src/science/knowledge.js';
import { getGeneralKnowledgeTree } from '../src/general-knowledge/knowledge.js';
import { SCIENCE_QUESTION_BANK } from '../src/science/questionBank.js';
import { GENERAL_KNOWLEDGE_QUESTION_BANK } from '../src/general-knowledge/questionBank.js';

test('knowledge lessons provide a next-point link in directory order across every aptitude module', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const flatten = (tree) => tree.flatMap((subject) => (subject.topics || []).flatMap((topic) => topic.knowledgePoints || []));
  const modules = APTITUDE_MODULES.map((module) => {
    const directory = module.id === 'science' ? getScienceTree()
      : module.id === 'general-knowledge' ? getGeneralKnowledgeTree()
        : getAptitudeModuleContent(module.id).directory;
    return { module, points: flatten(directory) };
  });

  for (const { module, points } of modules) {
    assert.ok(points.length > 1, `${module.id} should have a next knowledge point`);
    const current = points[0];
    const next = points[1];
    const route = `${module.route.slice(2)}?knowledge=${encodeURIComponent(current.id)}`;
    const page = await renderStandaloneRoute(script, route);
    assert.match(page.root.innerHTML, /下一个知识点/ , `${module.id} lesson should offer next-point navigation`);
    assert.ok(page.root.innerHTML.includes(`href="${module.route}?knowledge=${encodeURIComponent(next.id)}"`), `${module.id} should follow its directory order`);
  }
});
test('all five modules render outline-backed learning, practice, records, and plan sections', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const firstKnowledgePointByModule = {
    'political-theory': ['political-theory:practice-and-knowledge', '实践与认识', '基础理论与哲学方法'],
    verbal: ['verbal:main-idea', '主旨概括', '阅读理解'],
    quantitative: ['quantitative:number-patterns', '数列规律识别', '数字推理'],
    reasoning: ['reasoning:conclusion', '结论推出与解释评价', '逻辑判断'],
    'data-analysis': ['data-analysis:growth-rate', '增长率计算', '增长量与增长率'],
  };

  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const page = await renderStandaloneRoute(script, `aptitude/${moduleId}`);
    assert.match(page.root.innerHTML, /<h2>知识目录与讲解<\/h2>/, `${moduleId} should expose the knowledge provider section`);
    assert.doesNotMatch(page.root.innerHTML, /知识目录待接入/, `${moduleId} should show its outline instead of an empty directory`);
    assert.match(page.root.innerHTML, /science-topic-card/, `${moduleId} should use the existing expandable topic-card style`);
    const [pointId, pointTitle, topicTitle] = firstKnowledgePointByModule[moduleId];
    assert.match(page.root.innerHTML, new RegExp(topicTitle), `${moduleId} should show a module-specific topic`);
    assert.match(page.root.innerHTML, new RegExp(pointTitle), `${moduleId} should show a clickable knowledge point`);
    assert.match(page.root.innerHTML, /<h2>专项练习与限时模拟<\/h2>/, `${moduleId} should expose the practice provider section`);
    assert.match(page.root.innerHTML, /当前有 \d+ 道已发布题目/, `${moduleId} should show its prepared bank count`);
    for (const mode of ['practice', 'exam']) {
      const launch = page.root.innerHTML.match(new RegExp(`<button[^>]*data-action="open-aptitude-module-practice"[^>]*data-mode="${mode}"[^>]*>`))?.[0];
      assert.ok(launch, `${moduleId} should expose a ${mode} entry`);
      assert.doesNotMatch(launch, /disabled/);
    }
    assert.match(page.root.innerHTML, /错题与收藏/);
    assert.match(page.root.innerHTML, /data-section="aptitude-module-statistics"/);
    assert.match(page.root.innerHTML, /data-section="aptitude-module-plan"/);
    assert.match(page.root.innerHTML, /MANUAL PRACTICE LOG/);

    const lessonPage = await renderStandaloneRoute(script, `aptitude/${moduleId}?knowledge=${pointId}`);
    assert.match(lessonPage.root.innerHTML, new RegExp(`<h1>${pointTitle}<\\/h1>`), `${moduleId} should open the selected outline point`);
    assert.match(lessonPage.root.innerHTML, /目录提纲/);
    assert.match(lessonPage.root.innerHTML, /讲解待接入/);
    assert.match(lessonPage.root.innerHTML, /道已发布练习/);
    assert.match(lessonPage.root.innerHTML, /data-action="open-aptitude-module-practice"[^>]*data-point-id=/);
    assert.doesNotMatch(lessonPage.root.innerHTML, /title="本知识点题库待接入"/);
  }

  const missingPoint = await renderStandaloneRoute(script, 'aptitude/verbal?knowledge=not-in-provider');
  assert.match(missingPoint.root.innerHTML, /没有找到这个行测知识点/);
});
test('homepage enables practice and timed mock launch controls for every published module bank', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const app = await renderStandaloneRoute(script, 'aptitude', { onboarding: { hidden: true, completed: true } });

  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const practice = app.root.innerHTML.match(new RegExp(`<button[^>]*data-module-id="${moduleId}" data-mode="practice"[^>]*>`))?.[0];
    const exam = app.root.innerHTML.match(new RegExp(`<button[^>]*data-module-id="${moduleId}" data-mode="exam"[^>]*>`))?.[0];
    assert.ok(practice, `${moduleId} should expose a direct practice entry`);
    assert.ok(exam, `${moduleId} should expose a direct mock entry`);
    assert.match(practice, /data-action="open-aptitude-module-practice"/);
    assert.match(exam, /data-action="open-aptitude-module-practice"/);
    assert.doesNotMatch(practice, /disabled/);
    assert.doesNotMatch(exam, /disabled/);
  }
  for (const [moduleId, actionName] of [['science', 'open-science-practice'], ['general-knowledge', 'open-general-knowledge-practice']]) {
    const launchButton = app.root.innerHTML.match(new RegExp(`<button[^>]*data-action="${actionName}"[^>]*data-module-id="${moduleId}"[^>]*data-mode="practice"[^>]*>`))?.[0];
    assert.ok(launchButton, `${moduleId} should have a direct practice entry`);
    assert.doesNotMatch(launchButton, /disabled/);
  }
});
test('completed in-app mock history links back to question review', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const app = await renderStandaloneRoute(script, 'mocks', {
    onboarding: { hidden: true, completed: true },
    aptitudeModuleStudies: {
      reasoning: {
        moduleId: 'reasoning', knowledgeProgress: {},
        sessions: [{ id: 'reasoning-exam-done', moduleId: 'reasoning', mode: 'exam', status: 'completed', questionIds: ['apt-reasoning-001', 'apt-reasoning-002'], completedAt: '2026-10-09T09:00:00.000Z' }],
        answers: [{ id: 'answer-1', moduleId: 'reasoning', sessionId: 'reasoning-exam-done', questionId: 'apt-reasoning-001', isCorrect: true }],
        mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
      },
    },
  });

  assert.match(app.root.innerHTML, /站内行测模考记录/);
  assert.match(app.root.innerHTML, /href="#\/aptitude\/reasoning\?session=reasoning-exam-done"/);
  assert.match(app.root.innerHTML, /1\/2 题答对 · 已答 1 题/);
  const review = await renderStandaloneRoute(script, 'aptitude/reasoning?session=reasoning-exam-done', {
    onboarding: { hidden: true, completed: true },
    aptitudeModuleStudies: {
      reasoning: {
        moduleId: 'reasoning', knowledgeProgress: {},
        sessions: [{ id: 'reasoning-exam-done', moduleId: 'reasoning', mode: 'exam', status: 'completed', questionIds: ['apt-reasoning-001', 'apt-reasoning-002'], completedAt: '2026-10-09T09:00:00.000Z' }],
        answers: [{ id: 'answer-1', moduleId: 'reasoning', sessionId: 'reasoning-exam-done', questionId: 'apt-reasoning-001', isCorrect: true }],
        mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
      },
    },
  });
  assert.match(review.root.innerHTML, /必然能推出的是/);
  assert.match(review.root.innerHTML, /正确答案 C/);
});
test('module cards and pages combine module-only site answers with manual training logs', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const state = {
    onboarding: { hidden: true, completed: true },
    aptitudeLogs: { [studyLogKey('aptitude', { area: '言语', item: '中心理解/意图判断' })]: { attempted: 10, accuracy: 0.5 } },
    aptitudeModuleStudies: {
      verbal: {
        moduleId: 'verbal', knowledgeProgress: {},
        sessions: [{ id: 'verbal-practice', moduleId: 'verbal', mode: 'practice', status: 'completed' }],
        answers: [{ id: 'verbal-answer', moduleId: 'verbal', sessionId: 'verbal-practice', questionId: 'shared-id', isCorrect: true }],
        mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
      },
      reasoning: {
        moduleId: 'reasoning', knowledgeProgress: {},
        sessions: [{ id: 'reasoning-practice', moduleId: 'reasoning', mode: 'practice', status: 'completed' }],
        answers: [{ id: 'reasoning-answer', moduleId: 'reasoning', sessionId: 'reasoning-practice', questionId: 'shared-id', isCorrect: false }],
        mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
      },
    },
  };
  const { root: overview } = await renderStandaloneRoute(script, 'aptitude', state);
  const { root: modulePage } = await renderStandaloneRoute(script, 'aptitude/verbal', state);

  assert.match(overview.innerHTML, /href="#\/aptitude\/verbal"/);
  assert.match(overview.innerHTML, /href="#\/aptitude\/reasoning"/);
  assert.match(overview.innerHTML, /合并正确率/);
  assert.match(modulePage.innerHTML, /1 道站内 · 10 道手动/);
  assert.match(modulePage.innerHTML, /合并题量/);
  assert.match(modulePage.innerHTML, /11<small> 题<\/small>/);
});
test('plan UI exposes all registry module types, saves module progress, and links to the module route', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const verbalTask = createPlanTask({
    taskType: 'verbal', title: '言语专项练习', date: '2026-10-09',
    aptitudeConfig: { moduleId: 'verbal', activityType: 'practice', targetQuestionCount: 10 },
  }, { id: 'verbal-plan-ui', now: '2026-10-09T00:00:00.000Z' });
  const plan = await renderStandaloneRoute(script, 'plan', {
    onboarding: { hidden: true, completed: true },
    studyPlanTasks: [verbalTask],
  });

  assert.match(plan.root.innerHTML, /言语专项练习/);
  assert.match(plan.root.innerHTML, /href="#\/aptitude\/verbal\?task=verbal-plan-ui"/);
  assert.match(plan.root.innerHTML, /言语 · 专项练习 · 10 题/);

  const addAction = { dataset: { action: 'add-plan-task', date: '2026-10-09' } };
  await plan.listeners.get('click')({
    target: { closest(selector) { return selector === '[data-action]' ? addAction : null; } },
    preventDefault() {},
  });
  assert.match(plan.modalRoot.innerHTML, /<option value="political_theory"/);
  assert.match(plan.modalRoot.innerHTML, /<option value="data_analysis"/);
  assert.match(plan.modalRoot.innerHTML, /data-aptitude-config/);
  assert.match(plan.modalRoot.innerHTML, /name="aptitudeKnowledgePointIds"/);
});
test('position table shows a source-backed data-completeness grade with missing sections', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root } = await renderStandaloneRoute(script, 'positions');

  assert.match(root.innerHTML, /data-completeness-grade="部分"/);
  assert.match(root.innerHTML, /缺少：[^\"]*(资格条件完整核验|岗位级报名观察|岗位级进面线)/);
});
test('homepage quick start prioritizes real profile completion, plan, mock, and position actions', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root } = await renderStandaloneRoute(script, 'overview', {
    profile: { undergraduateMajor: '公共管理' },
    onboarding: { hidden: true, completed: true },
  });
  const markup = root.innerHTML;

  assert.match(markup, /我应该先做什么？/);
  assert.match(markup, /class="quick-start-card" href="#\/profile"[\s\S]*?完善个人报考条件[\s\S]*?1 \/ 16 项有内容/);
  assert.match(markup, /class="quick-start-card" href="#\/plan"[\s\S]*?安排今天的学习/);
  assert.match(markup, /data-action="add-mock"[\s\S]*?记录一次模考/);
  assert.match(markup, /class="quick-start-card" href="#\/positions"[\s\S]*?浏览北京京考职位库/);
  assert.doesNotMatch(markup, /按个人条件筛岗位/);
});
test('profile page stores undergraduate and graduate majors separately and summarizes both', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root } = await renderStandaloneRoute(script, 'profile', {
    profile: {
      undergraduateMajor: '行政管理', undergraduateMajorCode: '1204',
      graduateMajor: '公共管理', graduateMajorCode: '1252', degree: '硕士研究生',
    },
    onboarding: { hidden: true, completed: true },
  });
  const markup = root.innerHTML;

  assert.match(markup, /name="undergraduateMajor"[^>]*value="行政管理"/);
  assert.match(markup, /name="undergraduateMajorCode"[^>]*value="1204"/);
  assert.match(markup, /name="graduateMajor"[^>]*value="公共管理"/);
  assert.match(markup, /name="graduateMajorCode"[^>]*value="1252"/);
  assert.match(markup, /本科专业/);
  assert.match(markup, /研究生专业/);
  assert.match(markup, /最高学历/);
  assert.match(markup, /1252/);
});
test('homepage compares the latest real mock with 135, 138, and 140 without treating missing scores as zero', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const withMock = (await renderStandaloneRoute(script, 'overview', {
    mocks: [{ date: '2026-10-08', aptitude: 70, essay: 63, total: 133 }],
    onboarding: { hidden: true, completed: true },
  })).root.innerHTML;
  const withoutMock = (await renderStandaloneRoute(script, 'overview', {
    onboarding: { hidden: true, completed: true },
  })).root.innerHTML;

  assert.match(withMock, /score-target-section/);
  assert.match(withMock, /目标 135 分[\s\S]*?还差 2 分/);
  assert.match(withMock, /目标 138 分[\s\S]*?还差 5 分/);
  assert.match(withMock, /目标 140 分[\s\S]*?还差 7 分/);
  assert.match(withMock, /还差 5 分达到 138 分目标/);
  assert.match(withoutMock, /尚未记录/);
  assert.match(withoutMock, /录入真实模考后显示分差/);
  assert.doesNotMatch(withoutMock, /还差 135 分|还差 138 分|还差 140 分/);
});
