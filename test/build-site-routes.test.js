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

test('standalone site build embeds the route transition helper used by the app', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

  assert.match(html, /function runViewTransition\(documentLike, update, motionIntensity = 'enhanced'\)/);
  assert.doesNotMatch(html, /import \{ runViewTransition \} from '\.\/ui\/viewTransition\.js'/);
});
test('standalone site executes and renders the homepage from its embedded app modules and data', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'the standalone artifact should contain an executable application');

  const app = await renderStandaloneRoute(script, '');
  const homepage = app.root;
  const markup = homepage.innerHTML;
  assert.match(markup, /北京职位样例/);
  assert.match(markup, /北京全市职位数据概览/);
  assert.match(markup, /href="#\/positions"[^>]*>职位库/);
  assert.match(markup, /href="#\/matrix"[^>]*>竞争矩阵/);
  assert.match(markup, /href="#\/sources"[^>]*>来源与口径/);
  assert.doesNotMatch(markup, /昌平竞争观察|报道区平均竞争比/);

  const routes = [
    ['guide', '使用指南'], ['plan', '学习计划'], ['science', '科学推理'], ['aptitude', '行测能力'],
    ['essay', '申论训练'], ['mocks', '模考复盘'], ['positions', '职位库'],
    ['compare', '岗位比较'], ['assistant', '选岗助手'], ['scenarios', '分数情景'],
    ['matrix', '北京京考竞争矩阵'], ['profile', '个人报考资料'],
    ['research', '研究结论'], ['evidence', '数据覆盖与核验'], ['sources', '数据与来源'], ['settings', '设置与显示'],
  ];
  for (const [route, title] of routes) {
    app.location.hash = `#/${route}`;
    await app.windowListeners.get('hashchange')();
    assert.match(app.root.innerHTML, new RegExp(title), `the standalone ${route} route should render`);
    if (route === 'positions') {
      assert.match(app.root.innerHTML, /北京京考职位决策范围/);
      assert.match(app.root.innerHTML, /<h1>职位库<\/h1>/);
      assert.match(app.root.innerHTML, /东城区/);
      assert.match(app.root.innerHTML, /空白区县是待补数据/);
      assert.doesNotMatch(app.root.innerHTML, /昌平职位库/);
    }
    if (route === 'matrix') {
      assert.match(app.root.innerHTML, /16 区 × 3 年/);
      assert.match(app.root.innerHTML, /东城区/);
      assert.match(app.root.innerHTML, /未收录/);
    }
    if (route === 'assistant') assert.match(app.root.innerHTML, /当前范围职位样例/);
    if (route === 'research') {
      assert.match(app.root.innerHTML, /2026 年昌平区来源清单列出 86 条岗位样例/);
      assert.match(app.root.innerHTML, /具名面试分数样本[\s\S]*?383<small> 条<\/small>[\s\S]*?部分样本/);
      assert.match(app.root.innerHTML, /data-action="filter-research-topic"/);
    }
  }
});
test('standalone aptitude routes preserve dedicated pages and expose available module practice', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const storedState = { onboarding: { hidden: true, completed: true } };
  const modulePage = (await renderStandaloneRoute(script, 'aptitude/verbal', storedState)).root.innerHTML;
  const legacyModulePage = (await renderStandaloneRoute(script, 'aptitude/module/verbal', storedState)).root.innerHTML;
  const sciencePage = (await renderStandaloneRoute(script, 'aptitude/science', storedState)).root.innerHTML;
  const generalKnowledgePage = (await renderStandaloneRoute(script, 'aptitude/general-knowledge', storedState)).root.innerHTML;

  assert.match(modulePage, /<h1>言语<\/h1>/);
  assert.match(modulePage, /当前有 \d+ 道已发布题目/);
  assert.match(modulePage, /data-action="open-aptitude-module-practice"[^>]*data-mode="practice"/);
  assert.match(modulePage, /data-action="open-aptitude-module-practice"[^>]*data-mode="exam"/);
  assert.match(modulePage, /错题与收藏/);
  assert.match(modulePage, /MANUAL PRACTICE LOG/);
  assert.match(modulePage, /安排学习任务/);
  assert.match(legacyModulePage, /<h1>言语<\/h1>/);
  assert.match(sciencePage, /<h1>科学推理<\/h1>/);
  assert.match(generalKnowledgePage, /<h1>常识判断<\/h1>/);
  assert.match(generalKnowledgePage, /常识判断知识点目录|法律/);
});
test('standalone site can resume a 2026 national city recall question', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const sessionId = 'national-2026-city-recall-test';
  const storedState = {
    onboarding: { hidden: true, completed: true },
    aptitudeModuleStudies: {
      verbal: {
        knowledgeProgress: {},
        sessions: [{
          id: sessionId,
          moduleId: 'verbal',
          mode: 'practice',
          status: 'active',
          questionIds: ['national-2026-city-verbal-q36'],
          currentIndex: 0,
          draftAnswers: {},
        }],
        answers: [],
        mistakes: {},
        favorites: [],
        favoriteKnowledgePointIds: [],
        unclearKnowledgePointIds: [],
      },
    },
  };

  const page = await renderStandaloneRoute(script, `aptitude/verbal?session=${sessionId}`, storedState);

  assert.ok(page.root.innerHTML.includes('2024年，我国脱贫县农民人均可支配收入增幅'));
});
test('clicking each general module from the aptitude overview keeps the selected module route', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const modules = {
    'political-theory': '政治理论', verbal: '言语', quantitative: '数量关系',
    reasoning: '判断推理', 'data-analysis': '资料分析',
  };

  for (const [moduleId, title] of Object.entries(modules)) {
    const app = await renderStandaloneRoute(script, 'aptitude', { onboarding: { hidden: true, completed: true } });
    const href = `#/aptitude/${moduleId}`;
    const link = { getAttribute: (name) => name === 'href' ? href : null };
    const target = { closest: (selector) => selector === 'a[href^="#/"]' ? link : null };

    await app.listeners.get('click')({ target, preventDefault() {} });
    await app.windowListeners.get('hashchange')();

    assert.equal(app.location.hash, href, `${moduleId} should keep the clicked route`);
    assert.match(app.root.innerHTML, new RegExp(`<h1>${title}<\\/h1>`));
    assert.doesNotMatch(app.root.innerHTML, /没有找到这个行测模块/);
  }
});
test('general knowledge temporary exit returns to the directory and preserves the resumable session', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const sessionId = 'general-knowledge-exit-test';
  const app = await renderStandaloneRoute(script, `aptitude/general-knowledge?session=${sessionId}`, {
    onboarding: { hidden: true, completed: true },
    generalKnowledgeStudy: {
      knowledgeProgress: {},
      sessions: [{
        id: sessionId, moduleId: 'general_knowledge', mode: 'practice', status: 'active',
        questionIds: ['gk-official-2026-fermentation'], currentIndex: 0, draftAnswers: {},
      }],
      answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
      flashcards: [], flashcardReviews: [],
    },
  });

  assert.match(app.root.innerHTML, /常识判断练习/);
  const exitButton = { dataset: { action: 'leave-general-knowledge-session' } };
  const target = { closest: (selector) => selector === '[data-action]' ? exitButton : null };
  await app.listeners.get('click')({ target, preventDefault() {} });
  assert.equal(app.location.hash, '#/aptitude/general-knowledge');
  await app.windowListeners.get('hashchange')();

  assert.doesNotMatch(app.root.innerHTML, /常识判断练习/);
  assert.match(app.root.innerHTML, /继续未完成训练/);
  assert.match(app.root.innerHTML, new RegExp(`href="#/aptitude/general-knowledge\\?session=${sessionId}"`));
});
test('aptitude module directories, lessons, and sessions link back to the aptitude overview', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const returnLink = /href="#\/aptitude"[^>]*>返回行测总览/;
  const directoryRoutes = [
    'aptitude/verbal', 'aptitude/verbal?knowledge=verbal:main-idea',
    'aptitude/science', 'aptitude/science?knowledge=physics:buoyancy',
    'aptitude/general-knowledge', 'aptitude/general-knowledge?knowledge=law:legal-concepts',
  ];

  for (const route of directoryRoutes) {
    const page = await renderStandaloneRoute(script, route);
    assert.match(page.root.innerHTML, returnLink, `${route} should provide a direct link to the aptitude overview`);
  }

  const sessionCases = [
    { route: 'aptitude/verbal', queryKey: 'aptitudeModuleStudies', storeKey: 'verbal', moduleId: 'verbal',
      questionId: getAptitudeQuestions('verbal')[0].id, sessionId: 'verbal-parent-link' },
    { route: 'aptitude/science', queryKey: 'scienceStudy', moduleId: 'science_reasoning',
      questionId: SCIENCE_QUESTION_BANK.find((item) => item.publishStatus === 'published').id, sessionId: 'science-parent-link' },
    { route: 'aptitude/general-knowledge', queryKey: 'generalKnowledgeStudy', moduleId: 'general_knowledge',
      questionId: GENERAL_KNOWLEDGE_QUESTION_BANK.find((item) => item.publishStatus === 'published').id, sessionId: 'knowledge-parent-link' },
  ];

  for (const item of sessionCases) {
    const study = {
      knowledgeProgress: {}, sessions: [{ id: item.sessionId, moduleId: item.moduleId, mode: 'practice', status: 'active',
        questionIds: [item.questionId], currentIndex: 0, draftAnswers: {} }],
      answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
    };
    const storedState = { onboarding: { hidden: true, completed: true } };
    if (item.storeKey) storedState[item.queryKey] = { [item.storeKey]: study };
    else storedState[item.queryKey] = study;
    const app = await renderStandaloneRoute(script, `${item.route}?session=${item.sessionId}`, storedState);
    assert.match(app.root.innerHTML, returnLink, `${item.sessionId} should provide a direct parent link`);
  }
});
test('temporarily exiting practice returns to each of the five general module pages and keeps a resume link', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const sessionId = `${moduleId}-exit-test`;
    const questionId = getAptitudeQuestions(moduleId)[0].id;
    const app = await renderStandaloneRoute(script, `aptitude/${moduleId}?session=${sessionId}`, {
      onboarding: { hidden: true, completed: true },
      aptitudeModuleStudies: {
        [moduleId]: {
          moduleId, knowledgeProgress: {},
          sessions: [{ id: sessionId, moduleId, mode: 'practice', status: 'active',
            questionIds: [questionId], currentIndex: 0, draftAnswers: {} }],
          answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
        },
      },
    });

    assert.match(app.root.innerHTML, /data-action="leave-aptitude-module-session"/, `${moduleId} should expose temporary exit`);
    const exitButton = { dataset: { action: 'leave-aptitude-module-session' } };
    const target = { closest: (selector) => selector === '[data-action]' ? exitButton : null };
    await app.listeners.get('click')({ target, preventDefault() {} });
    assert.equal(app.location.hash, `#/aptitude/${moduleId}`);
    assert.match(app.root.innerHTML, /知识目录与讲解/, `${moduleId} should leave the question page immediately after the exit click`);
    await app.windowListeners.get('hashchange')();

    assert.match(app.root.innerHTML, /知识目录与讲解/, `${moduleId} should return to its directory`);
    assert.match(app.root.innerHTML, /继续未完成训练/, `${moduleId} should preserve a resume action`);
    assert.match(app.root.innerHTML, new RegExp(`href="#/aptitude/${moduleId}\\?session=${sessionId}"`));
    assert.doesNotMatch(app.root.innerHTML, /<h1>专项练习<\/h1>/, `${moduleId} should leave the question page`);
  }
});
test('free practice launched from a module starts on a shuffled question, not the bank prefix', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const moduleId = 'verbal';
  const bank = getAptitudeQuestions(moduleId);
  const math = Object.create(Math);
  math.random = () => 0;
  const originalRandom = Math.random;
  Math.random = () => 0;
  let expected;
  try {
    expected = createAptitudeModuleSession(bank, normalizeAptitudeModuleStudies(), moduleId, {
      mode: 'practice', targetQuestionCount: 5,
    }, { id: 'expected-random-practice', now: '2026-10-09T00:00:00.000Z' });
  } finally { Math.random = originalRandom; }
  assert.notDeepEqual(expected.session.questionIds, bank.slice(0, 5).map((question) => question.id));

  const app = await renderStandaloneRoute(script, 'aptitude/verbal', { onboarding: { hidden: true, completed: true } }, { math });
  const launch = { dataset: { action: 'open-aptitude-module-practice', moduleId, mode: 'practice' } };
  const clickTarget = { closest: (selector) => selector === '[data-action]' ? launch : null };
  await app.listeners.get('click')({ target: clickTarget, preventDefault() {} });
  const form = new app.HTMLFormElement('aptitude-module-session-setup', { moduleId }, {
    mode: 'practice', targetQuestionCount: '5', subjectId: '', topicId: '', knowledgePointId: '',
    durationMinutes: '20', difficultyFilter: 'all', sourceFilter: 'all', onlyUnanswered: '',
  });
  await app.listeners.get('submit')({ target: form, preventDefault() {} });
  await app.windowListeners.get('hashchange')();

  const firstQuestion = bank.find((question) => question.id === expected.session.questionIds[0]);
  assert.ok(firstQuestion, 'the shuffled first question should belong to the module bank');
  assert.ok(app.root.innerHTML.includes(firstQuestion.stem.slice(0, 24)),
    `the first displayed question should match shuffled id ${firstQuestion.id}: ${firstQuestion.stem}; current route ${app.location.hash}; displayed excerpt ${app.root.innerHTML.match(/<h2>([^<]+)/)?.[1] || 'missing'}`);
});
test('completed module mock results open question review with answers, explanation, favorite, and return link', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const cases = [
    ...['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis'].map((moduleId) => ({
      route: `aptitude/${moduleId}`, moduleId, studyStore: 'aptitudeModuleStudies', favoriteAction: 'toggle-aptitude-module-favorite',
      question: getAptitudeQuestions(moduleId)[0],
    })),
    { route: 'aptitude/science', moduleId: 'science_reasoning', studyStore: 'scienceStudy', favoriteAction: 'toggle-science-favorite',
      question: SCIENCE_QUESTION_BANK.find((item) => item.publishStatus === 'published') },
    { route: 'aptitude/general-knowledge', moduleId: 'general_knowledge', studyStore: 'generalKnowledgeStudy', favoriteAction: 'toggle-general-knowledge-favorite',
      question: GENERAL_KNOWLEDGE_QUESTION_BANK.find((item) => item.publishStatus === 'published') },
  ];

  for (const item of cases) {
    const sessionId = `${item.moduleId}-review-test`;
    const selectedOptionId = item.question.options.find((option) => option.id !== item.question.correctAnswer)?.id;
    assert.ok(selectedOptionId, `${item.moduleId} test question should have a distinct incorrect option`);
    const study = {
      knowledgeProgress: {},
      sessions: [{ id: sessionId, moduleId: item.moduleId, mode: 'exam', status: 'completed', questionIds: [item.question.id], currentIndex: 0, draftAnswers: {} }],
      answers: [{ id: `${sessionId}-answer`, sessionId, moduleId: item.moduleId, questionId: item.question.id, selectedOptionId, isCorrect: false }],
      mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
    };
    const storedState = { onboarding: { hidden: true, completed: true } };
    if (item.studyStore === 'aptitudeModuleStudies') storedState.aptitudeModuleStudies = { [item.moduleId]: study };
    else storedState[item.studyStore] = study;
    const routePath = item.route;
    const resultPage = await renderStandaloneRoute(script, `${routePath}?session=${sessionId}`, storedState);
    const detailHref = `href="#/${routePath}?session=${sessionId}&review=${encodeURIComponent(item.question.id)}"`;
    assert.ok(resultPage.root.innerHTML.includes(detailHref), `${item.moduleId} result rows should open the question review`);

    const reviewPage = await renderStandaloneRoute(script, `${routePath}?session=${sessionId}&review=${encodeURIComponent(item.question.id)}`, storedState);
    assert.match(reviewPage.root.innerHTML, /题目复盘/, `${item.moduleId} should identify the read-only review page`);
    assert.ok(reviewPage.root.innerHTML.includes(item.question.stem.slice(0, 24)), `${item.moduleId} review should show the original question stem`);
    assert.match(reviewPage.root.innerHTML, /你的答案/);
    assert.match(reviewPage.root.innerHTML, /正确答案/);
    assert.ok(reviewPage.root.innerHTML.includes(item.question.explanation.slice(0, 18)), `${item.moduleId} review should show the explanation`);
    assert.match(reviewPage.root.innerHTML, new RegExp(`data-action="${item.favoriteAction}"`), `${item.moduleId} review should allow favoriting`);
    assert.ok(reviewPage.root.innerHTML.includes(`href="#/${routePath}?session=${sessionId}">返回答题情况`), `${item.moduleId} review should return to its result list`);
  }
});
