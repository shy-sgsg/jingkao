import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createEncryptedAccount, createStoredAccount } from '../src/data/encryptedStore.js';
import { createEncryptedUserBackup, createUserBackup, parseEncryptedUserBackup } from '../src/data/backup.js';

const TEST_PASSWORD = 'correct horse battery staple for the test';
const LEGACY_KEY = 'changping-jingkao-dashboard:v1';

async function loadBuiltSite({ initialState = null, legacyState = null, route = '', failEnvelopeReadback = false } = {}) {
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
  const values = new Map();
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  let accountId = null;
  if (initialState) {
    const created = await createStoredAccount({ name: 'PRIVATE ACCOUNT LABEL', password: TEST_PASSWORD, state: initialState, storage: localStorage, cryptoApi: webcrypto });
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
    location: { hash: route ? `#/${route}` : '' },
    localStorage,
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
    fetch: async (url) => ({ ok: url.endsWith('public/data.json'), json: async () => JSON.parse(dataText) }),
    setTimeout: () => 1,
    clearTimeout() {},
  });
  await new Promise(setImmediate);
  return { root, modal, toast, elements, documentListeners, windowListeners, localStorage, values, documentLike, createdLinks, HTMLFormElement, accountId };
}

async function submit(site, id, values, dataset = {}) {
  const form = new site.HTMLFormElement(id, dataset, values);
  await site.documentListeners.get('submit')({ target: form, preventDefault() {} });
}

async function click(site, action) {
  const actionElement = { dataset: { action } };
  const target = { closest: (selector) => selector === '[data-action]' ? actionElement : null };
  await site.documentListeners.get('click')({ target, preventDefault() {} });
}

async function importFile(site, text) {
  const file = { text: async () => text };
  await site.documentListeners.get('change')({ target: { id: 'backup-import-file', files: [file], value: 'selected.json' } });
}

test('a new visitor sees account creation instead of an unlocked personal dashboard', async () => {
  const site = await loadBuiltSite();

  assert.match(site.root.innerHTML, /创建本地档案/);
  assert.match(site.root.innerHTML, /只保存在当前浏览器/);
  assert.match(site.root.innerHTML, /忘记密码后无法恢复/);
  assert.doesNotMatch(site.root.innerHTML, /LOCAL PROFILE|个人报考资料/);
});

test('existing accounts show anonymous slots and require the password before revealing personal state', async () => {
  const site = await loadBuiltSite({ initialState: { profile: { major: 'PRIVATE MAJOR FROM LOCKED PROFILE' } }, route: 'profile' });
  assert.match(site.root.innerHTML, /本地档案 1/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE ACCOUNT LABEL|PRIVATE MAJOR FROM LOCKED PROFILE/);

  await submit(site, '', { password: 'incorrect passphrase for test' }, { accountId: site.accountId });
  assert.match(site.root.innerHTML, /密码错误或数据已损坏/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE MAJOR FROM LOCKED PROFILE/);

  await submit(site, '', { password: TEST_PASSWORD }, { accountId: site.accountId });
  assert.match(site.root.innerHTML, /PRIVATE MAJOR FROM LOCKED PROFILE/);
  assert.match(site.root.innerHTML, /锁定 · PRIVATE ACCOUNT LABEL/);
  await click(site, 'account-lock');
  assert.match(site.root.innerHTML, /本地档案 1/);
  assert.doesNotMatch(site.root.innerHTML, /PRIVATE ACCOUNT LABEL|PRIVATE MAJOR FROM LOCKED PROFILE/);
});

test('first account creation writes only an anonymous index and encrypted account envelope', async () => {
  const site = await loadBuiltSite();
  await submit(site, 'account-create-form', {
    name: 'PRIVATE NEW ACCOUNT',
    password: TEST_PASSWORD,
    confirmPassword: TEST_PASSWORD,
  });

  assert.match(site.root.innerHTML, /锁定 · PRIVATE NEW ACCOUNT/);
  assert.equal(site.localStorage.getItem(LEGACY_KEY), null);
  for (const value of site.values.values()) {
    assert.doesNotMatch(value, /PRIVATE NEW ACCOUNT|公共管理|correct horse battery staple/);
  }
});

test('account page exports the active account as an encrypted backup', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await submit(site, 'account-create-form', { name: 'EXPORT PRIVATE PROFILE', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD });
  await click(site, 'backup-export');

  const download = site.createdLinks[0];
  assert.equal(download.download.startsWith('changping-jingkao-encrypted-backup-'), true);
  const response = await fetch(download.href);
  const serialized = await response.text();
  const parsed = parseEncryptedUserBackup(serialized);
  assert.equal(parsed.ok, true);
  assert.doesNotMatch(serialized, /EXPORT PRIVATE PROFILE|correct horse battery staple for the test|公共管理/);
});

test('legacy single-profile migration retains data only after encrypted readback and removes its plaintext key', async () => {
  const legacy = {
    profile: { major: 'MIGRATED PRIVATE MAJOR' },
    dayLogs: { 1: { reviewNote: 'MIGRATED PRIVATE NOTE' } },
    mocks: [], favorites: [], compared: [], onboarding: { step: 0, hidden: true, completed: true },
  };
  const site = await loadBuiltSite({ legacyState: legacy, route: 'profile' });
  assert.match(site.root.innerHTML, /为已有备考数据设置密码/);
  assert.match(site.root.innerHTML, /旧版明文格式/);

  await submit(site, 'account-migration-form', {
    name: 'MIGRATED ACCOUNT', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD,
  });

  assert.equal(site.localStorage.getItem(LEGACY_KEY), null);
  assert.match(site.root.innerHTML, /MIGRATED PRIVATE MAJOR/);
  for (const value of site.values.values()) {
    assert.doesNotMatch(value, /MIGRATED PRIVATE MAJOR|MIGRATED PRIVATE NOTE|MIGRATED ACCOUNT/);
  }
});

test('failed legacy migration keeps the only plaintext source untouched and stays locked', async () => {
  const legacy = { profile: { major: 'FAILURE PRESERVATION PRIVATE MAJOR' }, onboarding: { step: 0, hidden: true, completed: true } };
  const legacyText = JSON.stringify(legacy);
  const site = await loadBuiltSite({ legacyState: legacy, route: 'profile', failEnvelopeReadback: true });
  await submit(site, 'account-migration-form', {
    name: 'MIGRATION FAILURE PROFILE', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD,
  });

  assert.equal(site.localStorage.getItem(LEGACY_KEY), legacyText);
  assert.match(site.root.innerHTML, /本地加密保存校验失败/);
  assert.match(site.root.innerHTML, /为已有备考数据设置密码/);
  assert.doesNotMatch(site.root.innerHTML, /FAILURE PRESERVATION PRIVATE MAJOR|MIGRATION FAILURE PROFILE/);
});

test('encrypted backup import requires its password and explicit confirmation before replacing state', async () => {
  const site = await loadBuiltSite({ route: 'profile' });
  await submit(site, 'account-create-form', { name: 'ACTIVE PROFILE', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD });
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
  await submit(site, 'account-create-form', { name: 'ACTIVE PROFILE', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD });
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
