import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { Script } from 'node:vm';
import { createStoredAccount } from '../../src/data/encryptedStore.js';

const TEST_PASSWORD = '1234567890123';
// Route rendering does not need to repeat the production 600K-iteration KDF
// for every fixture. encrypted-store.test.js covers the real KDF separately.
const screenTestKey = webcrypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
);
const screenTestCrypto = {
  getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  subtle: {
    importKey: (...args) => webcrypto.subtle.importKey(...args),
    deriveKey: async () => screenTestKey,
    encrypt: (...args) => webcrypto.subtle.encrypt(...args),
    decrypt: (...args) => webcrypto.subtle.decrypt(...args),
  },
};
let siteDataPromise;
const standaloneScripts = new Map();

function runStandaloneScript(source, context) {
  let compiled = standaloneScripts.get(source);
  if (!compiled) {
    compiled = new Script(source);
    standaloneScripts.set(source, compiled);
  }
  return compiled.runInNewContext(context);
}

function readSiteData() {
  siteDataPromise ||= readFile(new URL('../../public/data.json', import.meta.url), 'utf8').then(JSON.parse);
  return siteDataPromise;
}

export async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

export async function renderStandaloneRoute(script, route, storedState = null, { math } = {}) {
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
    cryptoApi: screenTestCrypto,
  });
  localStorage.setItem('changping-jingkao-dashboard:fixed-profile-id:v1', account.id);
  const siteData = await readSiteData();
  class HTMLFormElement {
    constructor(id, dataset, valuesForForm) { this.id = id; this.dataset = dataset; this.values = valuesForForm; }
  }
  class FormDataLike {
    constructor(form) { this.form = form; }
    entries() { return Object.entries(this.form.values); }
  }

  runStandaloneScript(script, {
    document: documentLike,
    location,
    localStorage,
    window: windowLike,
    URL,
    crypto: screenTestCrypto,
    TextEncoder,
    TextDecoder,
    ...(math ? { Math: math } : {}),
    btoa,
    atob,
    HTMLFormElement,
    FormData: FormDataLike,
    fetch: async (url) => ({ ok: url.endsWith('public/data.json'), json: async () => siteData }),
    setTimeout: () => 1,
    clearTimeout() {},
  });

  await new Promise(setImmediate);
  const unlockForm = new HTMLFormElement('site-access-form', {}, { password: TEST_PASSWORD });
  await listeners.get('submit')({ target: unlockForm, preventDefault() {} });

  return { document: documentLike, root: elements.get('#root'), modalRoot: elements.get('#modal-root'), elements, listeners, windowListeners, location, localStorage, accountId: account.id, HTMLFormElement };
}
