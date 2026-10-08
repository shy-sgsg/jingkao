import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createStoredAccount } from '../src/data/encryptedStore.js';

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
    location: { hash: route ? `#/${route}` : '' },
    localStorage,
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }), scrollTo() {} },
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

  return { document: documentLike, root: elements.get('#root'), elements, listeners, localStorage, accountId: account.id };
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
  assert.match(markup, /2026 职位覆盖/);
  assert.match(markup, /86<small> \/ 88 个职位<\/small>/);
  assert.match(markup, /136 \/ 138 人已收录 · 第三方汇总对照/);

  const routes = [
    ['guide', '使用指南'], ['plan', '50 天复习计划'], ['aptitude', '行测能力'],
    ['essay', '申论训练'], ['mocks', '模考复盘'], ['positions', '昌平职位库'],
    ['compare', '岗位比较'], ['assistant', '选岗助手'], ['scenarios', '分数情景'],
    ['matrix', '昌平竞争矩阵'], ['profile', '个人报考资料'],
    ['research', '研究结论'], ['evidence', '数据覆盖与核验'], ['sources', '数据与来源'], ['settings', '设置与显示'],
  ];
  for (const [route, title] of routes) {
    const rendered = await renderStandaloneRoute(script, route);
    assert.match(rendered.root.innerHTML, new RegExp(title), `the standalone ${route} route should render`);
    if (route === 'research') {
      assert.match(rendered.root.innerHTML, /2026 年收录 86 条岗位样例/);
      assert.match(rendered.root.innerHTML, /31 条部分样本/);
      assert.match(rendered.root.innerHTML, /data-action="filter-research-topic"/);
    }
  }
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
  assert.match(markup, /class="quick-start-card" href="#\/positions"[\s\S]*?浏览昌平历史岗位/);
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
  assert.match(onboarding, /查询昌平历年真实职位/);
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

test('position comparison distinguishes process snapshots from final registration data', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: comparison } = await renderStandaloneRoute(script, 'compare', {
    compared: ['821261102', '821263001'],
    onboarding: { hidden: true, completed: true },
  });

  assert.match(comparison.innerHTML, /岗位级报名 \/ 资格审查记录/);
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
  for (const [segment, sampleCount] of [['全部昌平', 31], ['区直', 23], ['街道', 3], ['镇', 5], ['普通职位', 15], ['行政执法', 7], ['公共管理相关', 4]]) {
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
