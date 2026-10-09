import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createEncryptedAccount,
  createStoredAccount,
  encryptAccountState,
  listEncryptedAccounts,
  migrateLegacyAccount,
  openStoredAccount,
  saveStoredAccount,
  unlockEncryptedAccount,
} from '../src/data/encryptedStore.js';

const LEGACY_STORAGE_KEY = 'changping-jingkao-dashboard:v1';

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const state = {
  profile: { name: 'PRIVATE PROFILE', major: 'PUBLIC MANAGEMENT' },
  dayLogs: { 1: { actualQuestions: 42, reviewNote: 'PRIVATE PLAN NOTE' } },
  planOverrides: { 1: { focus: 'PRIVATE PLAN TEXT' } },
  aptitudeLogs: {}, essayLogs: {},
  mocks: [{ aptitude: 73, essay: 67, total: 140 }],
  favorites: ['231260001'], compared: [],
  settings: { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' },
  onboarding: { step: 0, hidden: true, completed: true },
};

async function makeAccount(overrides = {}) {
  return createEncryptedAccount({
    name: 'PROFILE ALPHA',
    password: 'correct horse battery staple 2026',
    state,
    cryptoApi: webcrypto,
    ...overrides,
  });
}

test('encrypted accounts round-trip while the serialized envelope hides the name and personal state', async () => {
  const { id, envelope, session } = await makeAccount();
  const serialized = JSON.stringify(envelope);
  const opened = await unlockEncryptedAccount({ id, envelope, password: 'correct horse battery staple 2026', cryptoApi: webcrypto });

  assert.deepEqual(opened.state, state);
  assert.equal(opened.name, 'PROFILE ALPHA');
  assert.equal(session.key.extractable, false);
  assert.equal(envelope.version, 1);
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.equal(envelope.iterations, 600000);
  assert.equal(envelope.cipher, 'AES-GCM-256');
  assert.equal(Buffer.from(envelope.salt, 'base64').length, 16);
  assert.equal(Buffer.from(envelope.iv, 'base64').length, 12);
  for (const privateValue of ['correct horse battery staple 2026', 'PROFILE ALPHA', 'PUBLIC MANAGEMENT', 'PRIVATE PLAN NOTE', 'PRIVATE PLAN TEXT']) {
    assert.equal(serialized.includes(privateValue), false, `envelope leaked ${privateValue}`);
  }
  assert.equal(serialized.includes('"total":140'), false, 'envelope leaked the private mock total');
});

test('separate accounts receive different identifiers and password-derivation salts', async () => {
  const first = await makeAccount({ name: 'PROFILE ALPHA', password: 'first secure passphrase' });
  const second = await makeAccount({ name: 'PROFILE BETA', password: 'second secure passphrase' });

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.envelope.salt, second.envelope.salt);
});

test('updating an account encrypts new state with a fresh AES-GCM IV', async () => {
  const { id, envelope, session } = await makeAccount();
  const changedState = { ...state, profile: { ...state.profile, major: 'UPDATED PRIVATE MAJOR' } };
  const updatedEnvelope = await encryptAccountState({ state: changedState, session, cryptoApi: webcrypto });
  const opened = await unlockEncryptedAccount({ id, envelope: updatedEnvelope, password: 'correct horse battery staple 2026', cryptoApi: webcrypto });

  assert.notEqual(updatedEnvelope.iv, envelope.iv);
  assert.equal(updatedEnvelope.salt, envelope.salt);
  assert.deepEqual(opened.state, changedState);
  assert.equal(opened.name, 'PROFILE ALPHA');
});

test('wrong password fails without returning decrypted account state', async () => {
  const { id, envelope } = await makeAccount();

  await assert.rejects(
    unlockEncryptedAccount({ id, envelope, password: 'wrong password', cryptoApi: webcrypto }),
  );
});

test('modified ciphertext fails AES-GCM authentication', async () => {
  const { id, envelope } = await makeAccount();
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  bytes[bytes.length - 1] ^= 1;
  const modified = { ...envelope, ciphertext: bytes.toString('base64') };

  await assert.rejects(
    unlockEncryptedAccount({ id, envelope: modified, password: 'correct horse battery staple 2026', cryptoApi: webcrypto }),
  );
});

test('unknown envelope versions fail closed', async () => {
  const { id, envelope } = await makeAccount();

  await assert.rejects(
    unlockEncryptedAccount({ id, envelope: { ...envelope, version: 99 }, password: 'correct horse battery staple 2026', cryptoApi: webcrypto }),
  );
});

test('account creation fails when Web Crypto is unavailable', async () => {
  await assert.rejects(makeAccount({ cryptoApi: null }));
});

test('stored accounts keep display names in the local index and isolate independent profiles', async () => {
  const storage = makeStorage();
  const firstState = { ...state, profile: { major: 'FIRST PRIVATE MAJOR' } };
  const secondState = { ...state, profile: { major: 'SECOND PRIVATE MAJOR' } };
  const first = await createStoredAccount({ name: 'PROFILE ALPHA', password: 'first passphrase', state: firstState, storage, cryptoApi: webcrypto });
  const second = await createStoredAccount({ name: 'PROFILE BETA', password: 'second passphrase', state: secondState, storage, cryptoApi: webcrypto });

  const accounts = listEncryptedAccounts(storage);
  assert.deepEqual(accounts.map(({ slot }) => slot), [1, 2]);
  assert.deepEqual(accounts.map(({ name }) => name), ['PROFILE ALPHA', 'PROFILE BETA']);
  const indexText = storage.getItem('changping-jingkao-dashboard:accounts:v1');
  assert.match(indexText, /PROFILE ALPHA|PROFILE BETA/);
  assert.doesNotMatch(indexText, /FIRST PRIVATE MAJOR|SECOND PRIVATE MAJOR/);
  assert.deepEqual((await openStoredAccount({ id: first.id, password: 'first passphrase', storage, cryptoApi: webcrypto })).state, firstState);
  await assert.rejects(openStoredAccount({ id: first.id, password: 'second passphrase', storage, cryptoApi: webcrypto }));
  assert.deepEqual((await openStoredAccount({ id: second.id, password: 'second passphrase', storage, cryptoApi: webcrypto })).state, secondState);
  assert.deepEqual(listEncryptedAccounts(storage), accounts);
});

test('an old anonymous local account index learns its name after a successful unlock', async () => {
  const storage = makeStorage();
  const account = await createStoredAccount({ name: 'RECOVERED LOCAL NAME', password: 'profile passphrase', state, storage, cryptoApi: webcrypto });
  const indexKey = 'changping-jingkao-dashboard:accounts:v1';
  const oldIndex = JSON.parse(storage.getItem(indexKey));
  oldIndex.accounts = oldIndex.accounts.map(({ id, slot }) => ({ id, slot }));
  storage.setItem(indexKey, JSON.stringify(oldIndex));

  assert.equal(listEncryptedAccounts(storage)[0].name, undefined);
  assert.equal((await openStoredAccount({ id: account.id, password: 'profile passphrase', storage, cryptoApi: webcrypto })).name, 'RECOVERED LOCAL NAME');
  assert.equal(listEncryptedAccounts(storage)[0].name, 'RECOVERED LOCAL NAME');
});

test('rapid stored-account saves snapshot input and preserve invocation order', async () => {
  const storage = makeStorage();
  let encryptCalls = 0;
  const delayedCrypto = {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    subtle: {
      importKey: (...args) => webcrypto.subtle.importKey(...args),
      deriveKey: (...args) => webcrypto.subtle.deriveKey(...args),
      decrypt: (...args) => webcrypto.subtle.decrypt(...args),
      encrypt: async (...args) => {
        encryptCalls += 1;
        if (encryptCalls === 2) await new Promise((resolve) => setTimeout(resolve, 25));
        return webcrypto.subtle.encrypt(...args);
      },
    },
  };
  const created = await createStoredAccount({ name: 'PROFILE ALPHA', password: 'first passphrase', state, storage, cryptoApi: delayedCrypto });
  const initialIv = created.session.envelope.iv;
  const firstState = { ...state, profile: { major: 'EARLIER SNAPSHOT' } };
  const secondState = { ...state, profile: { major: 'LATEST SNAPSHOT' } };
  const firstSave = saveStoredAccount({ session: created.session, state: firstState, storage, cryptoApi: delayedCrypto });
  const secondSave = saveStoredAccount({ session: created.session, state: secondState, storage, cryptoApi: delayedCrypto });
  firstState.profile.major = 'MUTATED AFTER SAVE CALL';
  await Promise.all([firstSave, secondSave]);

  const opened = await openStoredAccount({ id: created.id, password: 'first passphrase', storage, cryptoApi: delayedCrypto });
  assert.equal(opened.state.profile.major, 'LATEST SNAPSHOT');
  assert.notEqual(initialIv, opened.session.envelope.iv);
});

test('legacy migration encrypts and verifies the state before removing the plaintext key', async () => {
  const legacyState = { ...state, profile: { major: 'MIGRATED PRIVATE MAJOR' } };
  const storage = makeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacyState) });
  const migrated = await migrateLegacyAccount({ name: 'MY PROFILE', password: 'migration passphrase', storage, cryptoApi: webcrypto });

  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), null);
  assert.deepEqual((await openStoredAccount({ id: migrated.id, password: 'migration passphrase', storage, cryptoApi: webcrypto })).state, legacyState);
  assert.deepEqual(listEncryptedAccounts(storage).map(({ id }) => id), [migrated.id]);
});

test('legacy migration leaves plaintext untouched when encrypted readback fails', async () => {
  const legacyState = { ...state, profile: { major: 'PRESERVED PRIVATE MAJOR' } };
  const storage = makeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacyState) });
  const getItem = storage.getItem.bind(storage);
  let failEnvelopeReadback = true;
  storage.getItem = (key) => {
    if (key.includes(':account:') && failEnvelopeReadback) {
      failEnvelopeReadback = false;
      return null;
    }
    return getItem(key);
  };

  await assert.rejects(migrateLegacyAccount({ name: 'MY PROFILE', password: 'migration passphrase', storage, cryptoApi: webcrypto }));
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), JSON.stringify(legacyState));
});
