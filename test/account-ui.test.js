import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createEncryptedAccount, createStoredAccount, openStoredAccount, saveStoredAccount } from '../src/data/encryptedStore.js';
import { createEncryptedUserBackup, createUserBackup, parseEncryptedUserBackup } from '../src/data/backup.js';
import { createUserDataBackup } from '../src/data/sync.js';
import { normalizeStudyState } from '../src/science/persistence.js';
import { SCIENCE_QUESTION_BANK } from '../src/science/questionBank.js';
import { answerScienceQuestion, continueScienceSession, createScienceSession } from '../src/science/sessions.js';
import { GENERAL_KNOWLEDGE_QUESTION_BANK } from '../src/general-knowledge/questionBank.js';
import { answerGeneralKnowledgeQuestion, continueGeneralKnowledgeSession, createGeneralKnowledgeSession } from '../src/general-knowledge/sessions.js';

const TEST_PASSWORD = 'correct horse battery staple for the test';
const LEGACY_KEY = 'changping-jingkao-dashboard:v1';

async function loadBuiltSite({ initialState = null, initialStatePassword = TEST_PASSWORD, legacyState = null, route = '', failEnvelopeReadback = false, fetchImpl = null, storageValues = null } = {}) {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const dataText = await readFile(new URL('../public/data.json', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const root = { innerHTML: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} } };
  const modal = { innerHTML: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelector: () => null };
  const toast = { innerHTML: '', textContent: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} } };
  const elements = new Map([['#root', root], ['#modal-root', modal], ['#toast', toast]]);
  const documentListeners = new Map();
  const windowListeners = new Map();
  const values = storageValues || new Map();
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const sessionValues = new Map();
  const sessionStorage = {
    getItem(key) { return sessionValues.has(key) ? sessionValues.get(key) : null; },
    setItem(key, value) { sessionValues.set(key, String(value)); },
    removeItem(key) { sessionValues.delete(key); },
  };
  let accountId = null;
  const location = { hash: route ? `#/${route}` : '' };
  if (initialState) {
    const created = await createStoredAccount({ name: 'PRIVATE ACCOUNT LABEL', password: initialStatePassword, state: initialState, storage: localStorage, cryptoApi: webcrypto });
    accountId = created.id;
  }
  if (legacyState) localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyState));
  if (failEnvelopeReadback) {
    const getItem = localStorage.getItem.bind(localStorage);
    let failNextEnvelopeRead = true;
    localStorage.getItem = (key) => {
      if (key.includes(':account:') && failNextEnvelopeRead) {
        failNextEnvelopeRead = false;
        return null;
      }
      return getItem(key);
    };
  }
  const createdLinks = [];
  const documentLike = {
    documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} } },
    querySelector: (selector) => elements.get(selector) || null,
    querySelectorAll: () => [],
    getElementById: (id) => elements.get(`#${id}`) || null,
    createElement(tagName) {
      const link = { tagName, click() { createdLinks.push(link); } };
      return link;
    },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    title: '',
  };
  const windowLike = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    matchMedia: () => ({ matches: false }), scrollTo() {}, innerHeight: 900, scrollY: 0,
  };
  const fetchCalls = [];
  const appFetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options });
    if (fetchImpl) return fetchImpl(String(url), options);
    return { ok: String(url).endsWith('public/data.json'), json: async () => JSON.parse(dataText) };
  };
  class HTMLFormElement {
    constructor(id, dataset = {}, valuesForForm = {}) {
      this.id = id;
      this.dataset = dataset;
      this.values = valuesForForm;
    }
  }
  class FormDataLike {
    constructor(form) { this.form = form; }
    entries() { return Object.entries(this.form.values); }
  }
  runInNewContext(script, {
    document: documentLike,
    location,
    localStorage,
    sessionStorage,
    window: windowLike,
    URL,
    Blob,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    HTMLFormElement,
    FormData: FormDataLike,
    fetch: appFetch,
    setTimeout: () => 1,
    clearTimeout() {},
  });
  await new Promise(setImmediate);
  return { root, modal, toast, elements, documentListeners, windowListeners, localStorage, values, location, documentLike, createdLinks, HTMLFormElement, accountId, fetchCalls };
}

async function submit(site, id, values, dataset = {}) {
  const form = new site.HTMLFormElement(id, dataset, values);
  await site.documentListeners.get('submit')({ target: form, preventDefault() {} });
}

async function click(site, action, dataset = {}) {
  const actionElement = { dataset: { action, ...dataset } };
  const target = { closest: (selector) => selector === '[data-action]' ? actionElement : null };
  await site.documentListeners.get('click')({ target, preventDefault() {} });
}

function githubResponse(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

function fakeGitHubApi(shared) {
  return async (url, options = {}) => {
    if (url.endsWith('public/data.json')) {
      return githubResponse(200, JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8')));
    }
    if (url.endsWith('/branches/sync-data')) {
      return shared.branchExists
        ? githubResponse(200, { commit: { sha: 'branch-commit-sha' } })
        : githubResponse(404, { message: 'Not Found' });
    }
    if (url.endsWith('/branches/main')) return githubResponse(200, { commit: { sha: 'main-commit-sha' } });
    if (url.endsWith('/git/refs') && options.method === 'POST') {
      shared.branchExists = true;
      shared.branchCreations += 1;
      return githubResponse(201, { ref: 'refs/heads/sync-data' });
    }
    if (url.includes('/contents/user-data/backup.json') && options.method === 'PUT') {
      const requestBody = JSON.parse(options.body);
      shared.backup = JSON.parse(Buffer.from(requestBody.content, 'base64').toString('utf8'));
      shared.fileSha = `file-sha-${++shared.writes}`;
      return githubResponse(201, { content: { sha: shared.fileSha }, commit: { sha: `write-commit-${shared.writes}` } });
    }
    if (url.includes('/contents/user-data/backup.json')) {
      if (!shared.backup) return githubResponse(404, { message: 'Not Found' });
      return githubResponse(200, { encoding: 'base64', content: Buffer.from(JSON.stringify(shared.backup)).toString('base64'), sha: shared.fileSha });
    }
    throw new Error(`unexpected request: ${url}`);
  };
}

function completedPractice(study, bank, createSession, answerQuestion, continueSession, count, id) {
  const started = createSession(bank, study, { mode: 'practice', targetQuestionCount: count }, { id });
  let completed = started.scienceStudy || started.generalKnowledgeStudy;
  for (const [index, questionId] of started.session.questionIds.entries()) {
    const question = bank.find((item) => item.id === questionId);
    const result = answerQuestion(bank, completed, started.session.id, question.correctAnswer);
    completed = result.scienceStudy || result.generalKnowledgeStudy || result;
    if (index + 1 < started.session.questionIds.length) {
      const continued = continueSession(bank, completed, started.session.id);
      completed = continued.scienceStudy || continued.generalKnowledgeStudy || continued;
    }
  }
  return completed;
}

async function importFile(site, text) {
  const file = { text: async () => text };
  await site.documentListeners.get('change')({ target: { id: 'backup-import-file', files: [file], value: 'selected.json' } });
}

async function enterSite(site, password = '1234567890123') {
  await submit(site, 'site-access-form', { password });
}

test('new visitor sees the fixed access gate and legacy browser data is ignored', async () => {
  const oldState = { profile: { major: 'OLD DATA THAT MUST NOT BE MIGRATED' }, onboarding: { step: 0, hidden: true, completed: true } };
  const site = await loadBuiltSite({ legacyState: oldState, route: 'profile' });

  assert.match(site.root.innerHTML, /请输入访问密码/);
  assert.doesNotMatch(site.root.innerHTML, /创建本地档案|设置密码|OLD DATA THAT MUST NOT BE MIGRATED/);
  assert.equal(site.localStorage.getItem(LEGACY_KEY), JSON.stringify(oldState));

  await submit(site, 'site-access-form', { password: '1234567890124' });
  assert.match(site.root.innerHTML, /密码不正确/);
  assert.doesNotMatch(site.root.innerHTML, /OLD DATA THAT MUST NOT BE MIGRATED/);

  await submit(site, 'site-access-form', { password: '1234567890123' });
  assert.match(site.root.innerHTML, /个人报考资料/);
  assert.doesNotMatch(site.root.innerHTML, /OLD DATA THAT MUST NOT BE MIGRATED/);
});

test('old encrypted profiles are ignored and the fixed gate only opens the new local profile', async () => {
  const site = await loadBuiltSite({ initialState: { profile: { major: 'PRIVATE MAJOR FROM LOCKED PROFILE' } }, route: 'profile' });
  assert.match(site.root.innerHTML, /请输入访问密码/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE MAJOR FROM LOCKED PROFILE/);

  await enterSite(site, '1234567890124');
  assert.match(site.root.innerHTML, /密码不正确/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE MAJOR FROM LOCKED PROFILE/);

  await enterSite(site);
  assert.match(site.root.innerHTML, /个人报考资料/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE MAJOR FROM LOCKED PROFILE/);
  await click(site, 'account-lock');
  assert.match(site.root.innerHTML, /请输入访问密码/);
});

test('fixed password creates a single encrypted local profile without a registration flow', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await enterSite(site);

  assert.match(site.root.innerHTML, /个人报考资料/);
  assert.doesNotMatch(site.root.innerHTML, /创建账号|设置密码|注册/);
  assert.equal(site.localStorage.getItem(LEGACY_KEY), null);
  const accountIndex = site.localStorage.getItem('changping-jingkao-dashboard:accounts:v1');
  assert.match(accountIndex, /京考个人学习记录/);
  for (const value of site.values.values()) {
    assert.doesNotMatch(value, /公共管理|1234567890123/);
  }
});

test('opening the sync panel makes no GitHub request; only starting sync reads the remote branch', async () => {
  const dataText = await readFile(new URL('../public/data.json', import.meta.url), 'utf8');
  const site = await loadBuiltSite({ fetchImpl: async (url) => {
    if (url.endsWith('public/data.json')) return { ok: true, json: async () => JSON.parse(dataText) };
    if (url.includes('/branches/sync-data')) return {
      ok: false, status: 404, headers: { get: () => null }, json: async () => ({ message: 'Not Found' }),
    };
    throw new Error(`unexpected request: ${url}`);
  } });
  await enterSite(site);
  assert.deepEqual(site.fetchCalls.map(({ url }) => url), ['./public/data.json']);

  await click(site, 'open-cloud-sync');
  assert.match(site.modal.innerHTML, /shy-sgsg\/jingkao/);
  assert.deepEqual(site.fetchCalls.map(({ url }) => url), ['./public/data.json']);
  await click(site, 'accept-cloud-public-warning');
  assert.deepEqual(site.fetchCalls.map(({ url }) => url), ['./public/data.json']);

  await click(site, 'start-cloud-sync');
  assert.equal(site.fetchCalls.some(({ url }) => url.includes('api.github.com/repos/shy-sgsg/jingkao/branches/sync-data')), true);
  assert.equal(site.fetchCalls.some(({ options }) => options?.method === 'PUT'), false);
  assert.match(site.modal.innerHTML, /同步预览/);
});

test('position filter preferences save locally and return after reloading the app', async () => {
  const site = await loadBuiltSite({ route: 'positions' });
  await enterSite(site);

  await site.documentListeners.get('change')({
    target: { id: 'job-district', value: 'changping', closest: () => null },
    preventDefault() {},
  });

  const profileId = site.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  const saved = await openStoredAccount({ id: profileId, password: '1234567890123', storage: site.localStorage, cryptoApi: webcrypto });
  assert.equal(saved.state.positionPreferences.filters.districtId, 'changping');

  const reloaded = await loadBuiltSite({ route: 'positions', storageValues: site.values });
  await enterSite(reloaded);
  assert.match(reloaded.root.innerHTML, /<option value="changping" selected>/);
});

test('practice answers and timed exam submissions save locally and survive app reloads', async () => {
  const site = await loadBuiltSite({ route: 'aptitude/science' });
  await enterSite(site);

  await click(site, 'open-science-practice');
  await submit(site, 'science-session-setup', {
    mode: 'practice', subjectId: '', topicId: '', knowledgePointId: '', targetQuestionCount: '1',
    durationMinutes: '20', difficultyFilter: 'all', sourceFilter: 'all', onlyUnanswered: 'false',
  });
  let profileId = site.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  let account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: site.localStorage, cryptoApi: webcrypto });
  const practiceSessionId = account.state.scienceStudy.sessions.at(-1).id;
  const practice = await loadBuiltSite({ route: `aptitude/science?session=${encodeURIComponent(practiceSessionId)}`, storageValues: site.values });
  await enterSite(practice);
  const practiceOption = practice.root.innerHTML.match(/data-action="answer-science-question" data-session-id="([^\"]+)" data-option-id="([^\"]+)"/);
  assert.ok(practiceOption, 'the practice session should render an answer option');
  await click(practice, 'answer-science-question', { sessionId: practiceSessionId, optionId: practiceOption[2] });

  profileId = practice.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: practice.localStorage, cryptoApi: webcrypto });
  assert.equal(account.state.scienceStudy.answers.length, 1, 'choosing an answer should save immediately');
  await click(practice, 'continue-science-session', { sessionId: practiceSessionId });
  account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: practice.localStorage, cryptoApi: webcrypto });
  assert.equal(account.state.scienceStudy.sessions.find((session) => session.id === practiceSessionId).status, 'completed');

  const afterPracticeReload = await loadBuiltSite({ route: `aptitude/science?session=${encodeURIComponent(practiceSessionId)}`, storageValues: practice.values });
  await enterSite(afterPracticeReload);
  assert.match(afterPracticeReload.root.innerHTML, /训练完成/);

  await click(afterPracticeReload, 'open-science-practice');
  await submit(afterPracticeReload, 'science-session-setup', {
    mode: 'exam', subjectId: '', topicId: '', knowledgePointId: '', targetQuestionCount: '1',
    durationMinutes: '20', difficultyFilter: 'all', sourceFilter: 'all', onlyUnanswered: 'false',
  });
  profileId = afterPracticeReload.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: afterPracticeReload.localStorage, cryptoApi: webcrypto });
  const examSessionId = account.state.scienceStudy.sessions.at(-1).id;
  const exam = await loadBuiltSite({ route: `aptitude/science?session=${encodeURIComponent(examSessionId)}`, storageValues: afterPracticeReload.values });
  await enterSite(exam);
  const examOption = exam.root.innerHTML.match(/data-action="select-exam-answer" data-session-id="([^\"]+)" data-option-id="([^\"]+)"/);
  assert.ok(examOption, 'the timed exam should render an answer option');
  await click(exam, 'select-exam-answer', { sessionId: examSessionId, optionId: examOption[2] });
  await click(exam, 'advance-exam-question', { sessionId: examSessionId });
  await click(exam, 'finish-science-exam', { sessionId: examSessionId });

  profileId = exam.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: exam.localStorage, cryptoApi: webcrypto });
  const finishedExam = account.state.scienceStudy.sessions.find((session) => session.id === examSessionId);
  assert.equal(finishedExam.status, 'completed');
  assert.equal(account.state.scienceStudy.answers.length, 2);

  const afterExamReload = await loadBuiltSite({ route: `aptitude/science?session=${encodeURIComponent(examSessionId)}`, storageValues: exam.values });
  await enterSite(afterExamReload);
  assert.match(afterExamReload.root.innerHTML, /模拟已交卷/);
  assert.deepEqual(afterExamReload.fetchCalls.map(({ url }) => url), ['./public/data.json']);
});

test('cloud writes wait for explicit confirmation and token never enters localStorage', async () => {
  let branchExists = false;
  let remoteFile = null;
  const calls = [];
  const site = await loadBuiltSite({ fetchImpl: async (url, options = {}) => {
    if (url.endsWith('public/data.json')) return githubResponse(200, JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8')));
    calls.push({ url, options });
    if (url.endsWith('/branches/sync-data')) {
      return branchExists
        ? githubResponse(200, { commit: { sha: 'branch-commit-sha' } })
        : githubResponse(404, { message: 'Not Found' });
    }
    if (url.endsWith('/branches/main')) return githubResponse(200, { commit: { sha: 'main-commit-sha' } });
    if (url.endsWith('/git/refs') && options.method === 'POST') {
      branchExists = true;
      return githubResponse(201, { ref: 'refs/heads/sync-data' });
    }
    if (url.includes('/contents/user-data/backup.json') && options.method === 'PUT') {
      const requestBody = JSON.parse(options.body);
      remoteFile = JSON.parse(Buffer.from(requestBody.content, 'base64').toString('utf8'));
      return githubResponse(201, { content: { sha: 'file-sha-1' }, commit: { sha: 'write-commit-sha' } });
    }
    if (url.includes('/contents/user-data/backup.json')) {
      if (!remoteFile) return githubResponse(404, { message: 'Not Found' });
      return githubResponse(200, { encoding: 'base64', content: Buffer.from(JSON.stringify(remoteFile)).toString('base64'), sha: 'file-sha-1' });
    }
    throw new Error(`unexpected request: ${url}`);
  } });

  await enterSite(site);
  await click(site, 'open-cloud-sync');
  await click(site, 'accept-cloud-public-warning');
  await click(site, 'start-cloud-sync');
  assert.match(site.modal.innerHTML, /同步预览/);
  assert.equal(calls.some(({ options }) => options.method === 'PUT' || options.method === 'POST'), false);

  await click(site, 'confirm-cloud-sync');
  assert.match(site.modal.innerHTML, /GitHub Token/);
  assert.equal(calls.some(({ options }) => options.method === 'PUT' || options.method === 'POST'), false);
  await submit(site, 'github-token-form', { token: 'ghp-test-token-never-store-plaintext' });
  assert.match(site.modal.innerHTML, /同步预览/);
  assert.match(site.modal.innerHTML, /仅本次页面/);
  assert.equal([...site.values.values()].some((value) => value.includes('ghp-test-token-never-store-plaintext')), false);
  assert.equal(calls.some(({ options }) => options.method === 'PUT' || options.method === 'POST'), false);

  await click(site, 'confirm-cloud-sync');
  assert.match(site.modal.innerHTML, /同步完成/);
  assert.equal(calls.some(({ options }) => options.method === 'POST'), true);
  assert.equal(calls.some(({ options }) => options.method === 'PUT'), true);
  assert.ok(remoteFile);

  const profileId = site.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  const opened = await openStoredAccount({ id: profileId, password: '1234567890123', storage: site.localStorage, cryptoApi: webcrypto });
  assert.ok(opened.state.cloudSync.baseline);
  assert.ok(opened.state.cloudSync.lastSyncedAt);
});

test('canceling a sync preview leaves local data untouched and sends no write', async () => {
  const dataText = await readFile(new URL('../public/data.json', import.meta.url), 'utf8');
  const site = await loadBuiltSite({ fetchImpl: async (url) => {
    if (url.endsWith('public/data.json')) return githubResponse(200, JSON.parse(dataText));
    if (url.includes('/branches/sync-data')) return githubResponse(404, { message: 'Not Found' });
    throw new Error(`unexpected request: ${url}`);
  } });
  await enterSite(site);
  await click(site, 'open-cloud-sync');
  await click(site, 'accept-cloud-public-warning');
  await click(site, 'start-cloud-sync');
  assert.match(site.modal.innerHTML, /同步预览/);
  await click(site, 'cancel-cloud-preview');
  assert.equal(site.modal.innerHTML, '');
  const profileId = site.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  const opened = await openStoredAccount({ id: profileId, password: '1234567890123', storage: site.localStorage, cryptoApi: webcrypto });
  assert.equal(opened.state.cloudSync.baseline, null);
  assert.equal(opened.state.cloudSync.lastSyncedAt, null);
  assert.equal(site.fetchCalls.some(({ options }) => options?.method === 'PUT' || options?.method === 'POST'), false);
});

test('two independent devices exchange local records through explicit manual syncs', async () => {
  const shared = { branchExists: false, branchCreations: 0, writes: 0, backup: null, fileSha: null };
  const api = fakeGitHubApi(shared);
  const initialState = normalizeStudyState();
  initialState.scienceStudy = completedPractice(
    initialState.scienceStudy, SCIENCE_QUESTION_BANK, createScienceSession, answerScienceQuestion,
    continueScienceSession, 10, 'device-a-science-practice',
  );
  initialState.dayLogs = { 1: { actualQuestions: 12, actualHours: 1, status: 'done', reviewNote: 'device A' } };
  initialState.onboarding = { step: 0, hidden: true, completed: true };
  const deviceA = await loadBuiltSite({
    initialStatePassword: '1234567890123',
    initialState,
    fetchImpl: api,
  });
  deviceA.localStorage.setItem('changping-jingkao-dashboard:fixed-profile-id:v1', deviceA.accountId);
  await enterSite(deviceA);
  assert.doesNotMatch(deviceA.root.innerHTML, /请输入访问密码/);
  await click(deviceA, 'open-cloud-sync');
  await click(deviceA, 'accept-cloud-public-warning');
  await click(deviceA, 'start-cloud-sync');
  assert.match(deviceA.modal.innerHTML, /同步预览/);
  await click(deviceA, 'confirm-cloud-sync');
  assert.match(deviceA.modal.innerHTML, /GitHub Token/);
  await submit(deviceA, 'github-token-form', { token: 'ghp-device-a-token' });
  assert.match(deviceA.modal.innerHTML, /同步预览/);
  await click(deviceA, 'confirm-cloud-sync');
  assert.match(deviceA.modal.innerHTML, /同步完成/);
  assert.equal(shared.branchCreations, 1);
  assert.equal(shared.writes, 1);

  const deviceB = await loadBuiltSite({
    initialStatePassword: '1234567890123',
    initialState: { onboarding: { step: 0, hidden: true, completed: true } },
    fetchImpl: api,
  });
  deviceB.localStorage.setItem('changping-jingkao-dashboard:fixed-profile-id:v1', deviceB.accountId);
  await enterSite(deviceB);
  await click(deviceB, 'open-cloud-sync');
  await click(deviceB, 'accept-cloud-public-warning');
  await click(deviceB, 'start-cloud-sync');
  assert.match(deviceB.modal.innerHTML, /云端新增/);
  await click(deviceB, 'confirm-cloud-sync');
  assert.match(deviceB.modal.innerHTML, /同步完成/);
  let deviceBId = deviceB.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  let deviceBAccount = await openStoredAccount({ id: deviceBId, password: '1234567890123', storage: deviceB.localStorage, cryptoApi: webcrypto });
  assert.equal(deviceBAccount.state.dayLogs[1].reviewNote, 'device A');
  assert.equal(deviceBAccount.state.scienceStudy.answers.length, 10);
  assert.equal(deviceBAccount.state.scienceStudy.sessions.length, 1);

  deviceBAccount.state.generalKnowledgeStudy = completedPractice(
    deviceBAccount.state.generalKnowledgeStudy,
    GENERAL_KNOWLEDGE_QUESTION_BANK,
    createGeneralKnowledgeSession,
    answerGeneralKnowledgeQuestion,
    continueGeneralKnowledgeSession,
    5,
    'device-b-general-knowledge-practice',
  );
  await saveStoredAccount({ session: deviceBAccount.session, state: deviceBAccount.state, storage: deviceB.localStorage, cryptoApi: webcrypto });
  const reloadedDeviceB = await loadBuiltSite({ fetchImpl: api, route: 'aptitude/general-knowledge', storageValues: deviceB.values });
  await enterSite(reloadedDeviceB);
  deviceBId = reloadedDeviceB.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  deviceBAccount = await openStoredAccount({ id: deviceBId, password: '1234567890123', storage: reloadedDeviceB.localStorage, cryptoApi: webcrypto });
  assert.equal(deviceBAccount.state.generalKnowledgeStudy.answers.length, 5);
  assert.equal(deviceBAccount.state.cloudSync.baseline.data.generalKnowledgeStudy.answers.length, 0);

  await click(reloadedDeviceB, 'open-cloud-sync');
  await click(reloadedDeviceB, 'start-cloud-sync');
  await click(reloadedDeviceB, 'confirm-cloud-sync');
  assert.match(reloadedDeviceB.modal.innerHTML, /GitHub Token/);
  await submit(reloadedDeviceB, 'github-token-form', { token: 'ghp-device-b-token' });
  await click(reloadedDeviceB, 'confirm-cloud-sync');
  assert.equal(shared.writes, 2);
  assert.equal(shared.backup.data.scienceStudy.answers.length, 10);
  assert.equal(shared.backup.data.generalKnowledgeStudy.answers.length, 5);

  await click(deviceA, 'close-cloud-sync');
  await click(deviceA, 'open-cloud-sync');
  await click(deviceA, 'start-cloud-sync');
  await click(deviceA, 'confirm-cloud-sync');
  assert.match(deviceA.modal.innerHTML, /同步完成/);
  assert.equal(shared.writes, 2);
  const deviceAId = deviceA.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  const deviceAAccount = await openStoredAccount({ id: deviceAId, password: '1234567890123', storage: deviceA.localStorage, cryptoApi: webcrypto });
  deviceBId = deviceB.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  deviceBAccount = await openStoredAccount({ id: deviceBId, password: '1234567890123', storage: deviceB.localStorage, cryptoApi: webcrypto });
  assert.equal(deviceAAccount.state.dayLogs[1].reviewNote, 'device A');
  assert.equal(deviceBAccount.state.dayLogs[1].reviewNote, 'device A');
  assert.equal(deviceAAccount.state.scienceStudy.answers.length, 10);
  assert.equal(deviceAAccount.state.generalKnowledgeStudy.answers.length, 5);
  assert.equal(deviceBAccount.state.scienceStudy.answers.length, 10);
  assert.equal(deviceBAccount.state.generalKnowledgeStudy.answers.length, 5);
  assert.equal(new Set(deviceAAccount.state.scienceStudy.answers.map((answer) => answer.id)).size, 10);
  assert.equal(new Set(deviceAAccount.state.generalKnowledgeStudy.answers.map((answer) => answer.id)).size, 5);
});

test('sync preview blocks unresolved conflicts and applies the selected cloud value', async () => {
  const baseState = {
    ...normalizeStudyState(),
    profile: { major: '公共管理', degree: '基线' },
    dayLogs: {}, planOverrides: {}, aptitudeLogs: {}, essayLogs: {}, mocks: [], favorites: [], compared: [],
    settings: { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' },
    onboarding: { step: 0, hidden: true, completed: true },
  };
  const baseline = createUserDataBackup(baseState);
  const remoteBackup = createUserDataBackup({
    ...baseState,
    profile: { ...baseState.profile, degree: '云端版本' },
  }, { backupId: 'remote-conflict-backup', updatedAt: '2026-10-09T00:00:00.000Z' });
  const shared = { branchExists: true, branchCreations: 0, writes: 0, backup: remoteBackup, fileSha: 'file-sha-1' };
  const site = await loadBuiltSite({
    initialStatePassword: '1234567890123',
    initialState: {
      ...baseState,
      profile: { ...baseState.profile, degree: '本机版本' },
      cloudSync: { baseline, lastSyncedAt: baseline.updatedAt, publicNoticeAccepted: true },
    },
    fetchImpl: fakeGitHubApi(shared),
  });
  site.localStorage.setItem('changping-jingkao-dashboard:fixed-profile-id:v1', site.accountId);
  await enterSite(site);
  assert.doesNotMatch(site.root.innerHTML, /请输入访问密码/);
  await click(site, 'open-cloud-sync');
  await click(site, 'start-cloud-sync');
  assert.match(site.modal.innerHTML, /本机版本/);
  assert.match(site.modal.innerHTML, /云端版本/);
  await click(site, 'confirm-cloud-sync');
  assert.match(site.modal.innerHTML, /请先处理冲突/);
  assert.equal(shared.writes, 0);
  await click(site, 'choose-sync-conflict', { path: 'profile/degree', side: 'remote' });
  await click(site, 'confirm-cloud-sync');
  assert.match(site.modal.innerHTML, /同步完成/);
  assert.equal(shared.writes, 0);
  const profileId = site.localStorage.getItem('changping-jingkao-dashboard:fixed-profile-id:v1');
  const account = await openStoredAccount({ id: profileId, password: '1234567890123', storage: site.localStorage, cryptoApi: webcrypto });
  assert.equal(account.state.profile.degree, '云端版本');
  assert.equal(account.state.cloudSync.baseline.backupId, 'remote-conflict-backup');
});

test('account page exports the active account as an encrypted backup', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await enterSite(site);
  await click(site, 'backup-export');

  const download = site.createdLinks[0];
  assert.equal(download.download.startsWith('changping-jingkao-encrypted-backup-'), true);
  const response = await fetch(download.href);
  const serialized = await response.text();
  const parsed = parseEncryptedUserBackup(serialized);
  assert.equal(parsed.ok, true);
  assert.doesNotMatch(serialized, /EXPORT PRIVATE PROFILE|correct horse battery staple for the test|公共管理/);
});

test('encrypted backup import requires its password and explicit confirmation before replacing state', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await enterSite(site);
  const backupState = {
    profile: { major: 'IMPORTED PRIVATE PROFILE' }, dayLogs: {}, planOverrides: {}, aptitudeLogs: {}, essayLogs: {},
    mocks: [], favorites: [], compared: [], settings: { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' },
    onboarding: { step: 0, hidden: true, completed: true },
  };
  const backupAccount = await createEncryptedAccount({ name: 'BACKUP PROFILE', password: 'backup archive passphrase 2026', state: backupState, cryptoApi: webcrypto });
  const backup = createEncryptedUserBackup({ id: backupAccount.id, envelope: backupAccount.envelope });
  await importFile(site, JSON.stringify(backup));
  assert.match(site.modal.innerHTML, /输入备份档案密码/);

  await submit(site, 'backup-unlock-form', { password: 'wrong backup archive password' });
  assert.match(site.modal.innerHTML, /密码错误或数据已损坏/);
  assert.doesNotMatch(site.modal.innerHTML, /IMPORTED PRIVATE PROFILE/);

  await submit(site, 'backup-unlock-form', { password: 'backup archive passphrase 2026' });
  assert.match(site.modal.innerHTML, /备份档案：BACKUP PROFILE/);
  assert.match(site.modal.innerHTML, /确认加密替换/);
  assert.doesNotMatch(site.root.innerHTML, /IMPORTED PRIVATE PROFILE/);
  await click(site, 'backup-restore');
  assert.match(site.root.innerHTML, /IMPORTED PRIVATE PROFILE/);
  for (const value of site.values.values()) assert.doesNotMatch(value, /IMPORTED PRIVATE PROFILE|BACKUP PROFILE/);
});

test('legacy JSON backup preview discloses plaintext before confirmation and restore re-encrypts it', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await enterSite(site);
  const legacyState = {
    profile: { major: 'OLD BACKUP PRIVATE MAJOR' }, dayLogs: {}, planOverrides: {}, aptitudeLogs: {}, essayLogs: {},
    mocks: [], favorites: [], compared: [], onboarding: { step: 0, hidden: true, completed: true },
  };
  await importFile(site, JSON.stringify(createUserBackup(legacyState)));
  assert.match(site.modal.innerHTML, /未加密的旧版 JSON 备份/);
  assert.match(site.modal.innerHTML, /文件内容曾以明文保存在文件本身/);
  assert.doesNotMatch(site.root.innerHTML, /OLD BACKUP PRIVATE MAJOR/);
  await click(site, 'backup-restore');

  assert.match(site.root.innerHTML, /OLD BACKUP PRIVATE MAJOR/);
  assert.equal(site.localStorage.getItem(LEGACY_KEY), null);
  for (const value of site.values.values()) assert.doesNotMatch(value, /OLD BACKUP PRIVATE MAJOR/);
});
