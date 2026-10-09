import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createStoredAccount } from '../src/data/encryptedStore.js';
import { createPlanTask } from '../src/science/planTasks.js';

const TEST_PASSWORD = 'correct horse battery staple for build tests';

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

async function renderStandaloneRoute(script, route, storedState = null) {
  const makeElement = () => ({
    innerHTML: '',
    textContent: '',
    dataset: {},
    querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {} },
  });
  const listeners = new Map();
  const elements = new Map([
    ['#root', makeElement()],
    ['#modal-root', makeElement()],
    ['#toast', makeElement()],
  ]);
  const documentLike = {
    documentElement: makeElement(),
    querySelector: (selector) => elements.get(selector) || null,
    querySelectorAll: () => [],
    getElementById: (id) => elements.get(`#${id}`) || null,
    addEventListener() {},
    title: '',
  };
  documentLike.addEventListener = (type, listener) => listeners.set(type, listener);
  let locationHash = route ? `#/${route}` : '';
  const location = {
    get hash() { return locationHash; },
    set hash(value) { locationHash = value.startsWith('#') ? value : `#${value}`; },
  };
  const windowListeners = new Map();
  const windowLike = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    matchMedia: () => ({ matches: false }),
    scrollTo() {},
    confirm: () => true,
  };
  const values = new Map();
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const account = await createStoredAccount({
    name: 'TEST ACCOUNT',
    password: TEST_PASSWORD,
    state: storedState || {},
    storage: localStorage,
    cryptoApi: webcrypto,
  });
  const dataText = await readFile(new URL('../public/data.json', import.meta.url), 'utf8');
  class HTMLFormElement {
    constructor(id, dataset, valuesForForm) { this.id = id; this.dataset = dataset; this.values = valuesForForm; }
  }
  class FormDataLike {
    constructor(form) { this.form = form; }
    entries() { return Object.entries(this.form.values); }
  }

  runInNewContext(script, {
    document: documentLike,
    location,
    localStorage,
    window: windowLike,
    URL,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    HTMLFormElement,
    FormData: FormDataLike,
    fetch: async (url) => ({ ok: url.endsWith('public/data.json'), json: async () => JSON.parse(dataText) }),
    setTimeout: () => 1,
    clearTimeout() {},
  });

  await new Promise(setImmediate);
  const unlockForm = new HTMLFormElement('', { accountId: account.id }, { password: TEST_PASSWORD });
  await listeners.get('submit')({ target: unlockForm, preventDefault() {} });

  return { document: documentLike, root: elements.get('#root'), modalRoot: elements.get('#modal-root'), elements, listeners, windowListeners, location, localStorage, accountId: account.id };
}

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

  const { root: homepage } = await renderStandaloneRoute(script, '');
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
    const rendered = await renderStandaloneRoute(script, route);
    assert.match(rendered.root.innerHTML, new RegExp(title), `the standalone ${route} route should render`);
    if (route === 'positions') {
      assert.match(rendered.root.innerHTML, /北京京考职位决策范围/);
      assert.match(rendered.root.innerHTML, /<h1>职位库<\/h1>/);
      assert.match(rendered.root.innerHTML, /东城区/);
      assert.match(rendered.root.innerHTML, /待补逐岗数据/);
      assert.doesNotMatch(rendered.root.innerHTML, /昌平职位库/);
    }
    if (route === 'matrix') {
      assert.match(rendered.root.innerHTML, /16 区 × 3 年/);
      assert.match(rendered.root.innerHTML, /东城区/);
      assert.match(rendered.root.innerHTML, /未收录/);
    }
    if (route === 'assistant') assert.match(rendered.root.innerHTML, /当前范围职位样例/);
    if (route === 'research') {
      assert.match(rendered.root.innerHTML, /2026 年昌平区来源清单列出 86 条岗位样例/);
      assert.match(rendered.root.innerHTML, /31 条部分样本/);
      assert.match(rendered.root.innerHTML, /data-action="filter-research-topic"/);
    }
  }
});

test('standalone aptitude routes preserve dedicated pages and show empty-provider states', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const storedState = { onboarding: { hidden: true, completed: true } };
  const modulePage = (await renderStandaloneRoute(script, 'aptitude/verbal', storedState)).root.innerHTML;
  const legacyModulePage = (await renderStandaloneRoute(script, 'aptitude/module/verbal', storedState)).root.innerHTML;
  const sciencePage = (await renderStandaloneRoute(script, 'aptitude/science', storedState)).root.innerHTML;
  const generalKnowledgePage = (await renderStandaloneRoute(script, 'aptitude/general-knowledge', storedState)).root.innerHTML;

  assert.match(modulePage, /<h1>言语<\/h1>/);
  assert.match(modulePage, /题库待接入/);
  assert.match(modulePage, /disabled aria-disabled="true" title="题库待接入">开始练习<\/button>/);
  assert.match(modulePage, /disabled aria-disabled="true" title="题库待接入">限时模拟<\/button>/);
  assert.match(modulePage, /错题与收藏/);
  assert.match(modulePage, /MANUAL PRACTICE LOG/);
  assert.match(modulePage, /安排学习任务/);
  assert.match(legacyModulePage, /<h1>言语<\/h1>/);
  assert.match(sciencePage, /<h1>科学推理<\/h1>/);
  assert.match(generalKnowledgePage, /<h1>常识判断<\/h1>/);
  assert.match(generalKnowledgePage, /常识判断知识点目录|法律/);
});

test('all five reserved modules render their shared learning, records, and plan sections', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    const page = await renderStandaloneRoute(script, `aptitude/${moduleId}`);
    assert.match(page.root.innerHTML, /<h2>知识目录与讲解<\/h2>/, `${moduleId} should expose the knowledge provider section`);
    assert.match(page.root.innerHTML, /<h2>专项练习与限时模拟<\/h2>/, `${moduleId} should expose the practice provider section`);
    assert.match(page.root.innerHTML, /错题与收藏/);
    assert.match(page.root.innerHTML, /data-section="aptitude-module-statistics"/);
    assert.match(page.root.innerHTML, /data-section="aptitude-module-plan"/);
    assert.match(page.root.innerHTML, /MANUAL PRACTICE LOG/);
  }

  const missingPoint = await renderStandaloneRoute(script, 'aptitude/verbal?knowledge=not-in-provider');
  assert.match(missingPoint.root.innerHTML, /没有找到这个行测知识点/);
});

test('homepage keeps module launch controls but disables modules without published questions', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const app = await renderStandaloneRoute(script, 'aptitude', { onboarding: { hidden: true, completed: true } });

  for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
    assert.match(app.root.innerHTML, new RegExp(`data-module-id="${moduleId}" data-mode="practice"[^>]*disabled`));
    assert.match(app.root.innerHTML, new RegExp(`data-module-id="${moduleId}" data-mode="exam"[^>]*disabled`));
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
    aptitudeLogs: { 7: { attempted: 10, accuracy: 0.5 } },
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
  assert.match(markup, /class="quick-start-card" href="#\/profile"[\s\S]*?完善个人报考条件[\s\S]*?1 \/ 15 项有内容/);
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

test('first-use onboarding names all four jobs the workspace supports', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { elements } = await renderStandaloneRoute(script, 'overview', {
    onboarding: { step: 0, hidden: false, completed: false },
  });
  for (let attempt = 0; attempt < 5 && !elements.get('#modal-root').innerHTML; attempt += 1) await new Promise(setImmediate);
  const onboarding = elements.get('#modal-root').innerHTML;

  assert.match(onboarding, /第一次使用？3 分钟完成初始化/);
  assert.match(onboarding, /专业方向预填为公共管理，请先改成自己的真实专业/);
  assert.match(onboarding, /管理 50 天复习计划/);
  assert.match(onboarding, /记录并诊断模考成绩/);
  assert.match(onboarding, /查询北京京考历年职位/);
  assert.match(onboarding, /根据个人条件辅助选岗/);
  assert.match(onboarding, /data-action="onboarding-later"/);
});

test('sources route exposes direct official position-file links without calling candidate rows verified', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root } = await renderStandaloneRoute(script, 'sources', {
    onboarding: { hidden: true, completed: true },
  });

  assert.match(root.innerHTML, /P020251010615991972827\.xls/);
  assert.match(root.innerHTML, /P020241112454583305784\.xls/);
  assert.match(root.innerHTML, /P020251110416491745191\.xlsx/);
  assert.match(root.innerHTML, /尚未完成原表导入和逐代码核对/);
});

test('assistant renders evidence-gated difficulty and fit breakdowns for real position rows', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: assistant } = await renderStandaloneRoute(script, 'assistant');

  assert.match(assistant.innerHTML, /难度综合分/);
  assert.match(assistant.innerHTML, /适配综合分/);
  assert.match(assistant.innerHTML, /data-score-component="qualifiedCompetition"/);
  assert.match(assistant.innerHTML, /区级汇总不参与/);
  assert.match(assistant.innerHTML, /2 个岗位有多时点资格审查快照/);
  assert.match(assistant.innerHTML, /非最终报名或实考数据，未纳入岗位竞争比分项/);
  assert.match(assistant.innerHTML, /查看评分依据/);
});

test('assistant and score scenarios honor Beijing district scope without borrowing other districts', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const haidianRows = dataset.positions.filter((position) => position.districtId === 'haidian');
  const haidian2024Rows = haidianRows.filter((position) => Number(position.year) === 2024);
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const assistant = await renderStandaloneRoute(script, 'assistant');

  await assistant.listeners.get('change')({ target: { id: 'decision-district', value: 'haidian' } });
  assert.match(assistant.root.innerHTML, new RegExp(`${haidianRows.length}<\/strong><span>当前范围职位样例`));
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, haidianRows.length);
  assert.match(assistant.root.innerHTML, /海淀区 · 2025/);

  await assistant.listeners.get('change')({ target: { id: 'decision-year', value: '2025' } });
  assert.match(assistant.root.innerHTML, /153<\/strong><span>当前范围职位样例/);
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, 153);

  await assistant.listeners.get('change')({ target: { id: 'decision-year', value: '2024' } });
  assert.match(assistant.root.innerHTML, new RegExp(`${haidian2024Rows.length}<\/strong><span>当前范围职位样例`));
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, haidian2024Rows.length);

  const scenarios = await renderStandaloneRoute(script, 'scenarios');
  await scenarios.listeners.get('change')({ target: { id: 'decision-district', value: 'haidian' } });
  assert.match(scenarios.root.innerHTML, /海淀区 · 全部单位类型/);
  assert.match(scenarios.root.innerHTML, /不会借用其他区县的分数/);
  assert.match(scenarios.root.innerHTML, /0 条 · 0 条代码已核对/);
});

test('position comparison distinguishes process snapshots from final registration data', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: comparison } = await renderStandaloneRoute(script, 'compare', {
    compared: ['821261102', '821263001'],
    onboarding: { hidden: true, completed: true },
  });

  assert.match(comparison.innerHTML, /岗位级报名 \/ 资格审查记录/);
  assert.match(comparison.innerHTML, /区县/);
  assert.match(comparison.innerHTML, /2025-11-19 18:00 · 424 人资格审查通过（过程快照，非最终报名或实考）/);
  assert.match(comparison.innerHTML, /2025-11-19 18:00 · 150 人资格审查通过（过程快照，非最终报名或实考）/);
  assert.match(comparison.innerHTML, /过程快照不作为最终报名或实考数据/);
});

test('score slider updates its visible track progress and score result together', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root, elements, listeners } = await renderStandaloneRoute(script, 'scenarios');
  assert.match(root.innerHTML, /id="scenario-slider"[^>]*style="--score-progress:60%"/);

  for (const selector of ['.scenario-score-display', '.scenario-result-number', '.scenario-result strong', '#scenario-coverage', '.score-marker']) {
    elements.set(selector, {
      innerHTML: '', textContent: '', style: {},
      classList: { add() {}, remove() {}, toggle() {} },
    });
  }
  const properties = {};
  const slider = {
    id: 'scenario-slider', value: '144', min: '120', max: '150',
    style: { setProperty(name, value) { properties[name] = value; } },
  };
  listeners.get('input')({ target: slider });

  assert.equal(properties['--score-progress'], '80%');
  assert.equal(elements.get('.scenario-result-number').textContent, '144');
});

test('score scenario exposes every requested segment and labels the narrower matched-code samples', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root, listeners } = await renderStandaloneRoute(script, 'scenarios');

  assert.match(root.innerHTML, /<select id="scenario-scope"/);
  for (const [segment, sampleCount] of [['全部区县', 31], ['区直', 23], ['街道', 3], ['镇', 5], ['普通职位', 15], ['行政执法', 7], ['公共管理相关', 4]]) {
    assert.ok(root.innerHTML.includes(`${segment} · n=${sampleCount}`), `score scope selector should show ${segment}'s ${sampleCount} source-backed rows`);
  }
  assert.match(root.innerHTML, /岗位类别仅纳入代码、单位与岗位名均唯一匹配的分数记录/);

  await listeners.get('change')({ target: { id: 'scenario-scope', value: 'enforcement' } });
  assert.match(root.innerHTML, /行政执法 · n=7/);
  assert.match(root.innerHTML, /7 条 · 7 条代码已核对/);
  assert.match(root.innerHTML, /行政执法岗2/);
  assert.match(root.innerHTML, /综合行政执法岗/);
  assert.doesNotMatch(root.innerHTML, /综合统计岗/);
});

test('Pages release artifact excludes the workbook, local backups, and credential files', async () => {
  await import('../scripts/build.mjs');
  const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
  const files = await listFiles(distPath);
  const normalized = files.map((file) => file.replaceAll('\\', '/'));
  const builtText = (await Promise.all(files.map((file) => readFile(join(distPath, file), 'utf8').catch(() => '')))).join('\n');

  assert.ok(normalized.includes('index.html'));
  assert.ok(normalized.includes('public/data.json'));
  assert.ok(normalized.every((file) => !/(?:^|\/)(?:raw|backups?)(?:\/|$)|\.(?:xlsx?|env|pem|key)$/iu.test(file)));
  assert.doesNotMatch(builtText, /PRIVATE NEW ACCOUNT|MIGRATED PRIVATE NOTE|correct horse battery staple for the test/);

  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const ignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test -- --test-concurrency=1/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4[\s\S]*?path: dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(ignore, /^\/dist\/$/m);
  assert.match(ignore, /^\/data\/raw\/study_plan\.xlsx$/m);
  assert.match(ignore, /^\.env\*$/m);
});
