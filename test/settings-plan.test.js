import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createStoredAccount, openStoredAccount } from '../src/data/encryptedStore.js';

const TEST_PASSWORD = 'correct horse battery staple for settings tests';

async function loadStandaloneRoute(route, storedState = {}) {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const dataText = await readFile(new URL('../public/data.json', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'the built site should contain its application script');

  const makeElement = () => ({
    innerHTML: '', textContent: '', dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add() {}, remove() {}, toggle() {} },
  });
  const listeners = new Map();
  const windowListeners = new Map();
  const scrollCalls = [];
  const elements = new Map([
    ['#root', makeElement()],
    ['#modal-root', makeElement()],
    ['#toast', makeElement()],
  ]);
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const account = await createStoredAccount({ name: 'TEST PROFILE', password: TEST_PASSWORD, state: storedState, storage: localStorage, cryptoApi: webcrypto });
  const documentLike = {
    documentElement: makeElement(),
    querySelector: (selector) => elements.get(selector) || null,
    querySelectorAll: () => [],
    getElementById: (id) => elements.get(`#${id}`) || null,
    addEventListener(type, listener) { listeners.set(type, listener); },
    title: '',
  };
  class HTMLFormElement {
    constructor(id, dataset, valuesForForm) {
      this.id = id;
      this.dataset = dataset;
      this.values = valuesForForm;
    }
  }
  class FormDataLike {
    constructor(form) { this.form = form; }
    entries() { return Object.entries(this.form.values); }
  }

  const location = { hash: route ? `#/${route}` : '' };
  const windowLike = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    matchMedia: () => ({ matches: false }),
    scrollTo: (options) => scrollCalls.push(options),
    scrollY: 360,
    innerHeight: 900,
  };
  runInNewContext(script, {
    document: documentLike,
    location,
    localStorage,
    window: windowLike,
    URL,
    HTMLFormElement,
    FormData: FormDataLike,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    fetch: async (url) => ({ ok: url.endsWith('public/data.json'), json: async () => JSON.parse(dataText) }),
    setTimeout: () => 1,
    clearTimeout() {},
  });
  await new Promise(setImmediate);
  const unlockForm = new HTMLFormElement('', { accountId: account.id }, { password: TEST_PASSWORD });
  await listeners.get('submit')({ target: unlockForm, preventDefault() {} });

  return {
    document: documentLike,
    root: elements.get('#root'),
    modal: elements.get('#modal-root'),
    listeners,
    windowListeners,
    location,
    scrollCalls,
    localStorage,
    FormElement: HTMLFormElement,
    accountId: account.id,
  };
}

async function clickAction(site, action, data = {}) {
  const actionElement = { dataset: { action, ...data } };
  const target = {
    closest(selector) {
      return selector === '[data-action]' ? actionElement : null;
    },
  };
  await site.listeners.get('click')({ target, preventDefault() {} });
}

async function savedState(site) {
  return (await openStoredAccount({ id: site.accountId, password: TEST_PASSWORD, storage: site.localStorage, cryptoApi: webcrypto })).state;
}

test('settings apply and persist font size, motion intensity, and density', async () => {
  const site = await loadStandaloneRoute('settings', { onboarding: { hidden: true, completed: true } });

  assert.match(site.root.innerHTML, /设置/);
  assert.match(site.root.innerHTML, /role="group" aria-label="字号"/);
  assert.match(site.root.innerHTML, /role="group" aria-label="动效强度"/);
  assert.match(site.root.innerHTML, /遵循系统“减少动态效果”偏好/);
  assert.match(site.root.innerHTML, /沉浸[^<]*覆盖系统.*减少动态效果/);
  assert.match(site.root.innerHTML, /role="group" aria-label="页面密度"/);
  assert.match(site.root.innerHTML, /href="#\/settings"/);
  assert.equal(site.document.documentElement.dataset.fontSize, 'standard');
  assert.equal(site.document.documentElement.dataset.motion, 'enhanced');

  await clickAction(site, 'set-display-setting', { setting: 'fontSize', value: 'large' });
  await clickAction(site, 'set-display-setting', { setting: 'motion', value: 'immersive' });
  await clickAction(site, 'set-density', { density: 'compact' });

  assert.equal(site.document.documentElement.dataset.fontSize, 'large');
  assert.equal(site.document.documentElement.dataset.motion, 'immersive');
  assert.equal(site.document.documentElement.dataset.density, 'compact');
  assert.match(site.root.innerHTML, /data-value="large" aria-pressed="true"/);
  assert.match(site.root.innerHTML, /data-value="immersive" aria-pressed="true"/);
  assert.deepEqual((await savedState(site)).settings, {
    density: 'compact', fontSize: 'large', motion: 'immersive',
  });
});

test('profile work preferences expose a pending-confirmation choice and persist locally', async () => {
  const site = await loadStandaloneRoute('profile', {
    onboarding: { hidden: true, completed: true },
  });

  for (const [name, accepted, rejected] of [
    ['acceptAdministrativeEnforcement', '接受', '不接受'],
    ['acceptPhysicalTest', '接受', '不接受'],
    ['acceptNightShift', '接受', '不接受'],
    ['acceptTown', '接受', '不接受'],
    ['prioritizeStreet', '优先', '不优先'],
    ['prioritizeDistrict', '优先', '不优先'],
  ]) {
    const field = site.root.innerHTML.match(new RegExp(`<select name="${name}">([\\s\\S]*?)</select>`))?.[1];
    assert.ok(field, `${name} should be an editable preference`);
    assert.match(field, new RegExp(`value="${accepted}"`));
    assert.match(field, new RegExp(`value="${rejected}"`));
    assert.match(field, /value="待确认"/);
  }

  assert.match(site.root.innerHTML, /PREFERENCES · NOT ELIGIBILITY/);
  const preferences = {
    acceptAdministrativeEnforcement: '接受',
    acceptPhysicalTest: '待确认',
    acceptNightShift: '不接受',
    acceptTown: '接受',
    prioritizeStreet: '优先',
    prioritizeDistrict: '不优先',
  };
  const form = new site.FormElement('profile-form', {}, preferences);
  await site.listeners.get('submit')({ target: form, preventDefault() {} });

  const saved = await savedState(site);
  for (const [key, value] of Object.entries(preferences)) assert.equal(saved.profile[key], value);
});

test('the assistant shows work-preference conflicts separately from eligibility', async () => {
  const site = await loadStandaloneRoute('assistant', {
    profile: {
      major: '公共管理',
      degree: '硕士研究生',
      acceptAdministrativeEnforcement: '不接受',
      acceptPhysicalTest: '不接受',
      acceptNightShift: '不接受',
      acceptTown: '不接受',
      prioritizeStreet: '待确认',
      prioritizeDistrict: '待确认',
    },
    onboarding: { hidden: true, completed: true },
  });

  const townEnforcementCard = site.root.innerHTML.split('<article class="panel assistant-job')
    .find((markup) => markup.includes('data-code="241264202"'));
  assert.ok(townEnforcementCard, 'the sourced town enforcement position should be visible in the assistant');
  assert.match(townEnforcementCard, /<details class="assistant-preference-checks"><summary>/, 'per-position preference details should stay collapsed until requested');
  assert.match(townEnforcementCard, /个人工作偏好核对/);
  assert.match(townEnforcementCard, /偏好冲突 4 项/);
  assert.match(townEnforcementCard, /行政执法[\s\S]*?偏好冲突/);
  assert.match(townEnforcementCard, /体测[\s\S]*?偏好冲突/);
  assert.match(townEnforcementCard, /夜班[\s\S]*?偏好冲突/);
  assert.match(townEnforcementCard, /镇[\s\S]*?偏好冲突/);
  assert.match(townEnforcementCard, /偏好不会改变资格核验结论/);
});

test('display settings change typography tokens and animation intensity in CSS', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /html\[data-font-size="large"\]/);
  assert.match(styles, /html\[data-motion="immersive"\]/);
});

test('editing a daily schedule changes plan fields without overwriting actual progress', async () => {
  const site = await loadStandaloneRoute('plan', {
    dayLogs: { 1: { actualQuestions: 27, actualHours: 1.5, status: '进行中' } },
    onboarding: { hidden: true, completed: true },
  });

  assert.equal((site.root.innerHTML.match(/data-action="edit-plan-day" data-day="/g) || []).length, 50);
  assert.match(site.root.innerHTML, /data-action="edit-plan-day" data-day="1"/);
  assert.match(site.root.innerHTML, /data-action="edit-day"[^>]*data-day="1"/);
  await clickAction(site, 'edit-plan-day', { day: '1' });
  assert.match(site.modal.innerHTML, /id="plan-edit-form"/);
  assert.match(site.modal.innerHTML, /name="focus"/);
  assert.match(site.modal.innerHTML, /name="coreTask"/);
  assert.match(site.modal.innerHTML, /name="plannedQuestions"/);

  const form = new site.FormElement('plan-edit-form', { day: '1' }, {
    date: '2026-10-09',
    stage: '我的冲刺阶段',
    focus: '复盘错题与薄弱模块',
    coreTask: '完成资料分析错题整理',
    plannedQuestions: '45',
    plannedHours: '2.5',
  });
  await site.listeners.get('submit')({ target: form, preventDefault() {} });

  assert.match(site.root.innerHTML, /复盘错题与薄弱模块/);
  assert.match(site.root.innerHTML, /完成资料分析错题整理/);
  assert.match(site.root.innerHTML, /实际 27/);
  const saved = await savedState(site);
  assert.equal(saved.planOverrides['1'].plannedQuestions, 45);
  assert.equal(saved.planOverrides['1'].date, '2026-10-09');
  assert.equal(saved.dayLogs['1'].actualQuestions, 27);

  await clickAction(site, 'edit-day', { day: '1' });
  assert.match(site.modal.innerHTML, /name="actualQuestions"[^>]*value="27"/);
});

test('plan editor keeps restored numeric field values inside their input attributes', async () => {
  const site = await loadStandaloneRoute('plan', {
    planOverrides: { 1: { plannedQuestions: '" autofocus onfocus="alert(1)' } },
    onboarding: { hidden: true, completed: true },
  });
  await clickAction(site, 'edit-plan-day', { day: '1' });

  assert.doesNotMatch(site.modal.innerHTML, /onfocus="alert\(/);
  assert.match(site.modal.innerHTML, /value="&quot; autofocus onfocus=&quot;alert\(1\)"/);
});

test('route changes reset the viewport instantly so scroll motion does not compete with page entry', async () => {
  const site = await loadStandaloneRoute('plan', { onboarding: { hidden: true, completed: true } });

  site.location.hash = '#/settings';
  site.windowListeners.get('hashchange')();

  assert.equal(site.root.innerHTML.includes('设置与显示'), true);
  assert.equal(site.scrollCalls.at(-1).top, 0);
  assert.equal(site.scrollCalls.at(-1).behavior, 'instant');
});
