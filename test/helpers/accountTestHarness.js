import { webcrypto } from 'node:crypto';
import { createStoredAccount } from '../../src/data/encryptedStore.js';

export const TEST_ACCOUNT_PASSWORD = 'correct horse battery staple for app harness';

export function installAccountBrowserAPIs() {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true });
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
  globalThis.btoa = btoa;
  globalThis.atob = atob;
  globalThis.HTMLFormElement = class HTMLFormElement {
    constructor(id, dataset = {}, values = {}) {
      this.id = id;
      this.dataset = dataset;
      this.values = values;
    }
  };
  globalThis.FormData = class FormDataLike {
    constructor(form) { this.form = form; }
    entries() { return Object.entries(this.form.values); }
  };
}

export function memoryLocalStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

export async function seedUnlockedTestAccount(storage) {
  const created = await createStoredAccount({
    name: 'APP TEST PROFILE',
    password: TEST_ACCOUNT_PASSWORD,
    state: { onboarding: { step: 0, hidden: true, completed: true } },
    storage,
    cryptoApi: webcrypto,
  });
  return created.id;
}

export async function unlockTestAccount(listeners, accountId) {
  const form = new globalThis.HTMLFormElement('', { accountId }, { password: TEST_ACCOUNT_PASSWORD });
  await listeners.submit({ target: form, preventDefault() {} });
}
